import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

type QuickAction = {
  label: string;
  action: string;
};

async function saveContactRequest(contact: {
  name: string;
  email: string;
  phone: string;
  message: string;
  sessionId?: string;
}) {
  try {
    const { error } = await supabaseAdmin.from("chatbot_contact_requests").insert({
      name: contact.name.trim(),
      email: contact.email.trim(),
      phone: contact.phone.trim(),
      message: contact.message.trim(),
      session_id: contact.sessionId || null,
    });

    if (error) {
      console.error("Unable to save contact request:", error);
      return { success: false, error: "Failed to save contact request" };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error saving contact request:", error);
    return { success: false, error: "Unexpected error saving contact request" };
  }
}

const SYSTEM_PROMPT = `You are EduBot, a helpful AI assistant for LearnByAI.app - an AI-powered education platform.

Your role:
- Answer questions about platform features, pricing, and usage
- Be friendly, professional, and encouraging
- Guide users toward signing up for free trial
- Provide accurate information about plans and capabilities
- Use emojis appropriately (but not excessively)
- Keep responses concise (2-4 sentences ideal)

Platform Details:
- AI Q&A from uploaded textbooks with page references
- Quiz generation with auto-grading
- Personalized study plans
- 50+ language translation
- Video learning integration
- Live video teaching for teachers

Pricing:
- Students: $5/month (10 books, unlimited questions, 5 quizzes/month)
- Teachers: $15/month (50 books, unlimited classes, 100 students/class)
- Schools: $100+/month (8 classes, 200 students, 5 teachers)
- 14-day free trial (no credit card required)

Supported Formats: PDF (text-based), DOCX, DOC, TXT (Max 50MB)

Always be helpful and guide users toward trying the platform!`;

function getQuickActions(userMessage: string, botResponse: string): QuickAction[] {
  const message = userMessage.toLowerCase();
  const actions: QuickAction[] = [];

  if (message.includes("price") || message.includes("cost") || message.includes("plan")) {
    actions.push({ label: "💰 View Pricing", action: "pricing_details" });
    actions.push({ label: "🚀 Start Free Trial", action: "trial" });
  }

  if (message.includes("feature") || message.includes("what") || message.includes("how")) {
    actions.push({ label: "📹 Watch Demo", action: "demo" });
  }

  if (message.includes("school") || message.includes("institution")) {
    actions.push({ label: "📅 Schedule Demo", action: "schedule_demo" });
  }

  if (actions.length === 0) {
    actions.push({ label: "💰 Pricing", action: "pricing" });
    actions.push({ label: "🎓 Features", action: "features" });
  }

  return actions.slice(0, 3);
}

export async function POST(request: NextRequest) {
  let payload: { message?: string; conversationId?: string; sessionId?: string; contact?: any };

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const { message, conversationId, sessionId } = payload;

  if (payload && "contact" in payload && payload.contact) {
    const { name, email, phone, message: contactMessage } = payload.contact;

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !contactMessage?.trim()) {
      return NextResponse.json({ error: "All contact fields are required." }, { status: 400 });
    }

    const result = await saveContactRequest({
      name,
      email,
      phone,
      message: contactMessage,
      sessionId: payload.sessionId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (!message || !sessionId) {
    return NextResponse.json(
      { error: "Missing message or sessionId" },
      { status: 400 }
    );
  }

  const convId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  const sendFallback = (text: string) =>
    NextResponse.json(
      {
        response: text,
        quickActions: getQuickActions(message, text),
        conversationId: convId,
      },
      { status: 200 }
    );

  if (!process.env.OPENAI_API_KEY) {
    return sendFallback(
      "I'm getting set up right now, but you can explore LearnByAI's pricing or start a free trial anytime!"
    );
  }

  // Get conversation history when available
  type StoredMessage = { role: "system" | "user" | "assistant"; content: string };
  let conversationHistory: StoredMessage[] = [];
  if (conversationId) {
    try {
      const { data: history, error } = await supabaseAdmin
        .from("chatbot_conversations")
        .select("messages")
        .eq("conversation_id", conversationId)
        .single();

      if (!error && history?.messages) {
        const parsed = Array.isArray(history.messages)
          ? history.messages.filter(
              (item: any): item is StoredMessage =>
                item && typeof item.content === "string" && ["system", "user", "assistant"].includes(item.role)
            )
          : [];
        conversationHistory = parsed;
      }
    } catch (dbError) {
      console.warn("Unable to load chatbot history", dbError);
    }
  }

  const messages: StoredMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: "user", content: message },
  ];

  let botResponse = "";
  let quickActions: QuickAction[] = [];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages as unknown as { role: string; content: string }[],
      temperature: 0.7,
      max_tokens: 500,
    });

    botResponse =
      completion.choices[0]?.message?.content?.trim() ||
      "I'm sorry, I couldn't generate a response.";
    quickActions = getQuickActions(message, botResponse);
  } catch (apiError) {
    console.error("OpenAI chatbot error:", apiError);
    return sendFallback(
      "I'm having a little trouble responding right now, but you can still view pricing, explore features, or start a free trial."
    );
  }

  const updatedHistory = [
    ...conversationHistory,
    { role: "user", content: message },
    { role: "assistant", content: botResponse },
  ];

  try {
    await supabaseAdmin
      .from("chatbot_conversations")
      .upsert({
        conversation_id: convId,
        session_id: sessionId,
        messages: updatedHistory,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
  } catch (dbError) {
    console.warn("Unable to upsert chatbot conversation", dbError);
  }

  try {
    await supabaseAdmin.from("chatbot_messages").insert({
      conversation_id: convId,
      session_id: sessionId,
      user_message: message,
      bot_response: botResponse,
      created_at: new Date().toISOString(),
    });
  } catch (dbError) {
    console.warn("Unable to log chatbot message", dbError);
  }

  return NextResponse.json({
    response: botResponse,
    quickActions,
    conversationId: convId,
  });
}