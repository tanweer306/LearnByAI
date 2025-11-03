import OpenAI from "openai";
import { Buffer } from "buffer";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Export OpenAI client for direct use
export { openai };

/**
 * Generate embeddings for text using OpenAI
 * Default model: text-embedding-3-large (3072 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-large";
    const response = await openai.embeddings.create({
      model,
      input: text.substring(0, 8000), // Limit to 8000 chars to avoid token limits
    });

    return response.data[0].embedding;
  } catch (error: any) {
    console.error("❌ Error generating embedding:");
    console.error("   Model:", process.env.OPENAI_EMBEDDING_MODEL);
    console.error("   Error:", error.message || error);
    if (error.response) {
      console.error("   Response:", error.response.data);
    }
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * Default model: text-embedding-3-large (3072 dimensions)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-large",
      input: texts,
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    console.error("Error generating embeddings batch:", error);
    throw error;
  }
}

/**
 * Generate AI explanation for selected text
 */
export async function generateExplanation(
  selectedText: string,
  userQuestion: string,
  context?: string
): Promise<string> {
  try {
    const systemPrompt = `You are an educational AI assistant. Your role is to help students understand their study materials by providing clear, accurate explanations.

Guidelines:
- Explain concepts clearly and concisely
- Preserve mathematical formulas and notation
- Use examples when helpful
- Break down complex topics into simpler parts
- Be encouraging and supportive`;

    const userPrompt = context
      ? `The student is reading the following text from their book:

<Selected Text>
${selectedText}
</Selected Text>

Additional Context:
${context}

Student's Question: ${userQuestion}

Please provide a clear and helpful explanation.`
      : `The student selected the following text from their book:

<Selected Text>
${selectedText}
</Selected Text>

Student's Question: ${userQuestion}

Please provide a clear and helpful explanation.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "I apologize, but I couldn't generate an explanation.";
  } catch (error) {
    console.error("Error generating explanation:", error);
    throw error;
  }
}

/**
 * Answer a question based on retrieved context
 */
export async function answerQuestion(
  question: string,
  contexts: Array<{ page_number: number; content: string }>,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  preferredLanguage: string = "en"
): Promise<{
  originalAnswer: string;
  translatedAnswer: string;
  tokensUsed: number;
  youtubeSearchTerm?: string;
  imageSearchTerm?: string;
}> {
  try {
    const { getLanguageName } = require('./languages');
    const targetLanguage = getLanguageName(preferredLanguage);

    const languageInstruction = preferredLanguage !== 'en'
      ? `\n\nIMPORTANT: Provide your explanation in English. Also include concise YouTube and image search terms in English.`
      : '';

    const systemPrompt = `You are an AI tutor helping students learn from their textbooks. You have access to relevant pages from the book.

Guidelines:
- Answer questions accurately based on the provided context
- If the answer isn't in the context, say so politely
- Reference specific page numbers when citing information
- Be clear, concise, and educational
- Encourage further learning
- Provide additional helpful resources via search suggestions${languageInstruction}`;

    const contextText = contexts
      .map((ctx) => `[Page ${ctx.page_number}]\n${ctx.content}`)
      .join("\n\n---\n\n");

    const userPrompt = `Based on the following excerpts from the book:

${contextText}

Student's Question: ${question}

Please return a JSON object with three fields:
- explanation: A helpful explanation (in English) that references page numbers where appropriate.
- youtubeSearchTerm: A concise (max 6 words) search phrase a student could use on YouTube to find relevant tutorial videos about the topic.
- imageSearchTerm: A concise (max 6 words) search phrase a student could use on Google Images to find relevant diagrams or illustrations about the topic.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory.slice(-6));
    }

    messages.push({ role: "user", content: userPrompt });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature: 0.5,
      max_tokens: 1200,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "AiTutorStructuredResponse",
          schema: {
            type: "object",
            required: ["explanation", "youtubeSearchTerm", "imageSearchTerm"],
            properties: {
              explanation: {
                type: "string",
                description: "Clear explanation referencing page numbers when possible (English).",
              },
              youtubeSearchTerm: {
                type: "string",
                description: "Concise search phrase for YouTube tutorials (max 6 words).",
              },
              imageSearchTerm: {
                type: "string",
                description: "Concise search phrase for relevant diagrams/images (max 6 words).",
              },
            },
          },
        },
      },
    });

    const content = response.choices[0].message.content;

    if (!content) {
      return {
        originalAnswer: "I couldn't generate an answer.",
        translatedAnswer: "I couldn't generate an answer.",
        tokensUsed: response.usage?.total_tokens || 0,
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
      console.log("🤖 AI Response Parsed:", {
        explanation: parsed.explanation?.substring(0, 100) + "...",
        youtubeSearchTerm: parsed.youtubeSearchTerm,
        imageSearchTerm: parsed.imageSearchTerm,
      });
    } catch (parseError) {
      console.error("❌ Failed to parse structured AI response:", parseError);
      console.log("📄 Raw content:", content);
      return {
        originalAnswer: content,
        translatedAnswer: content,
        tokensUsed: response.usage?.total_tokens || 0,
      };
    }

    const originalAnswer = parsed.explanation || content;

    let translatedAnswer = originalAnswer;
    if (preferredLanguage !== 'en') {
      try {
        translatedAnswer = await translateText(originalAnswer, targetLanguage, 'English');
      } catch (translationError) {
        console.error('Translation failed, falling back to original text:', translationError);
        translatedAnswer = originalAnswer;
      }
    }

    return {
      originalAnswer,
      translatedAnswer,
      youtubeSearchTerm: parsed.youtubeSearchTerm,
      imageSearchTerm: parsed.imageSearchTerm,
      tokensUsed: response.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error("Error answering question:", error);
    throw error;
  }
}

/**
 * Generate a summary of a page or section
 */
export async function generateSummary(text: string, maxLength: number = 200): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates concise summaries of educational content.",
        },
        {
          role: "user",
          content: `Please provide a concise summary (max ${maxLength} words) of the following text:\n\n${text}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error generating summary:", error);
    throw error;
  }
}

/**
 * Translate text to target language using OpenAI
 * Uses gpt-4o-mini for cost-effective translation
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = "English"
): Promise<string> {
  try {
    const systemPrompt = `You are a professional translator for educational content. 
Preserve technical terms, formulas, mathematical notation, and formatting exactly. 
Translate naturally while maintaining academic accuracy.`;

    const userPrompt = `Translate from ${sourceLanguage} to ${targetLanguage}:

${text}

Provide ONLY the translation, no explanations or additional text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Low temperature for consistent translations
      max_tokens: Math.ceil(text.length * 2), // Estimate max tokens needed
    });

    return response.choices[0].message.content?.trim() || text;
  } catch (error) {
    console.error("Error translating text:", error);
    throw error;
  }
}

/**
 * Convert text to speech using OpenAI's TTS models
 */
export async function synthesizeSpeech(
  text: string,
  {
    voice = process.env.OPENAI_TTS_VOICE || "alloy",
    format = "mp3",
    model = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
  }: {
    voice?: string;
    format?: "mp3" | "wav" | "ogg";
    model?: string;
  } = {}
): Promise<Buffer> {
  const fallbackModels: string[] = [];
  const envFallback = process.env.OPENAI_TTS_FALLBACK_MODEL;
  if (envFallback) fallbackModels.push(envFallback);

  const defaults = ["gpt-4o-mini-tts", "gpt-4o-audio-preview"];
  for (const candidate of defaults) {
    if (candidate && candidate !== model && !fallbackModels.includes(candidate)) {
      fallbackModels.push(candidate);
    }
  }

  const attemptedModels: string[] = [];

  const tryModel = async (candidateModel: string): Promise<Buffer> => {
    attemptedModels.push(candidateModel);
    try {
      const speech = await openai.audio.speech.create({
        model: candidateModel,
        voice,
        input: text,
      });

      const arrayBuffer = await speech.arrayBuffer();
      const audio = Buffer.from(arrayBuffer);

      if (format !== 'mp3') {
        console.warn(`Requested format "${format}" is not directly supported; returning original encoding.`);
      }

      return audio;
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      const code = error?.code ?? error?.error?.code;

      if (status === 403 || status === 404 || code === 'model_not_found') {
        console.warn(`TTS model "${candidateModel}" unavailable (status ${status ?? 'unknown'}). Trying fallback...`);
        throw new Error('TTS_MODEL_UNAVAILABLE');
      }

      console.error("Error synthesizing speech:", error);
      throw error;
    }
  };

  const modelsToTry = [model, ...fallbackModels.filter((m) => m && m !== model)];

  let lastUnavailableError: Error | null = null;

  for (const candidate of modelsToTry) {
    try {
      return await tryModel(candidate);
    } catch (error: any) {
      if (error?.message === 'TTS_MODEL_UNAVAILABLE') {
        lastUnavailableError = error;
        continue;
      }
      throw error;
    }
  }

  const accessError = new Error('TTS_MODEL_UNAVAILABLE');
  (accessError as any).status = 403;
  (accessError as any).attemptedModels = modelsToTry;
  (accessError as any).cause = lastUnavailableError;
  throw accessError;
}
