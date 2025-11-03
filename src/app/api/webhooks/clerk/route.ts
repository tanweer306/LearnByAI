import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * Clerk Webhook Handler
 * Keeps Supabase users table synchronized with Clerk user data
 * Handles: user.created, user.updated, user.deleted events
 */
export async function POST(req: Request) {
  const startTime = Date.now();
  
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // Validate required headers
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("[Clerk Webhook] Missing svix headers", {
      has_id: !!svix_id,
      has_timestamp: !!svix_timestamp,
      has_signature: !!svix_signature,
    });
    return new NextResponse("Missing svix headers", { status: 400 });
  }

  // Validate webhook secret is configured
  if (!process.env.CLERK_WEBHOOK_SECRET) {
    console.error("[Clerk Webhook] CLERK_WEBHOOK_SECRET not configured");
    return new NextResponse("Webhook not configured", { status: 500 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create Svix instance for signature verification
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify webhook signature
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("[Clerk Webhook] Signature verification failed", {
      error: err instanceof Error ? err.message : String(err),
      svix_id,
    });
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // Handle the webhook event
  const eventType = evt.type;
  console.log(`[Clerk Webhook] Processing ${eventType} event`, { svix_id });

  // USER CREATED EVENT
  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url, phone_numbers, created_at } = evt.data;

    try {
      const primaryEmail = email_addresses?.find((e) => e.id === evt.data.primary_email_address_id)?.email_address ||
                          email_addresses?.[0]?.email_address;
      
      const primaryPhone = phone_numbers?.find((p) => p.id === evt.data.primary_phone_number_id)?.phone_number ||
                          phone_numbers?.[0]?.phone_number;

      if (!primaryEmail) {
        console.error("[Clerk Webhook] user.created - No email found", { clerk_user_id: id });
        // Return 200 to Clerk but log the issue
        return new NextResponse(JSON.stringify({ received: true, processed: false, reason: "no_email" }), { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Check if user already exists (shouldn't happen, but handle it)
      const { data: existingUser } = await supabaseAdmin
        .from("users")
        .select("id, clerk_user_id")
        .eq("clerk_user_id", id)
        .single();

      if (existingUser) {
        console.warn("[Clerk Webhook] user.created - User already exists", { 
          clerk_user_id: id,
          supabase_id: existingUser.id 
        });
        return new NextResponse(JSON.stringify({ received: true, processed: false, reason: "already_exists" }), { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Determine default role (first user becomes admin)
      const { count } = await supabaseAdmin
        .from("users")
        .select("*", { count: "exact", head: true });
      
      const defaultRole = count === 0 ? "admin" : "student";

      // Create user in Supabase
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from("users")
        .insert({
          clerk_user_id: id,
          email: primaryEmail,
          first_name: first_name || null,
          last_name: last_name || null,
          profile_image_url: image_url || null,
          phone_number: primaryPhone || null,
          role: defaultRole,
          onboarding_completed: false,
          books_upload_limit: defaultRole === "admin" ? 10 : 3,
          created_at: created_at ? new Date(created_at).toISOString() : undefined,
        })
        .select("id, email, role")
        .single();

      if (insertError) {
        // Check if it's a duplicate key error
        if (insertError.code === "23505") {
          console.warn("[Clerk Webhook] user.created - Duplicate user", { 
            clerk_user_id: id,
            error: insertError.message 
          });
        } else {
          console.error("[Clerk Webhook] user.created - Database error", {
            clerk_user_id: id,
            error: insertError,
          });
        }
        // Always return 200 to Clerk
        return new NextResponse(JSON.stringify({ received: true, processed: false, error: insertError.message }), { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      console.log("[Clerk Webhook] user.created - Success", {
        clerk_user_id: id,
        supabase_id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        duration_ms: Date.now() - startTime,
      });
    } catch (error) {
      console.error("[Clerk Webhook] user.created - Unexpected error", {
        clerk_user_id: id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Always return 200 to Clerk
      return new NextResponse(JSON.stringify({ received: true, processed: false, error: "internal_error" }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // USER UPDATED EVENT
  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = evt.data;

    try {
      const primaryEmail = email_addresses?.find((e) => e.id === evt.data.primary_email_address_id)?.email_address ||
                          email_addresses?.[0]?.email_address;
      
      const primaryPhone = phone_numbers?.find((p) => p.id === evt.data.primary_phone_number_id)?.phone_number ||
                          phone_numbers?.[0]?.phone_number;

      // Check if user exists
      const { data: existingUser } = await supabaseAdmin
        .from("users")
        .select("id, email, role")
        .eq("clerk_user_id", id)
        .single();

      if (!existingUser) {
        console.warn("[Clerk Webhook] user.updated - User not found, creating", { clerk_user_id: id });
        
        // User doesn't exist, create them (shouldn't happen but handle gracefully)
        if (primaryEmail) {
          const { error: insertError } = await supabaseAdmin
            .from("users")
            .insert({
              clerk_user_id: id,
              email: primaryEmail,
              first_name: first_name || null,
              last_name: last_name || null,
              profile_image_url: image_url || null,
              phone_number: primaryPhone || null,
              role: "student",
              onboarding_completed: false,
            });

          if (insertError) {
            console.error("[Clerk Webhook] user.updated - Failed to create missing user", {
              clerk_user_id: id,
              error: insertError,
            });
          }
        }
        
        return new NextResponse(JSON.stringify({ received: true, processed: true, created: true }), { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Update only Clerk-managed fields
      const updateData: any = {
        first_name: first_name || null,
        last_name: last_name || null,
        profile_image_url: image_url || null,
        phone_number: primaryPhone || null,
      };

      // Only update email if it changed and doesn't conflict
      if (primaryEmail && primaryEmail !== existingUser.email) {
        // Check for email conflicts
        const { data: emailConflict } = await supabaseAdmin
          .from("users")
          .select("id, clerk_user_id")
          .eq("email", primaryEmail)
          .neq("clerk_user_id", id)
          .single();

        if (emailConflict) {
          console.error("[Clerk Webhook] user.updated - Email conflict", {
            clerk_user_id: id,
            new_email: primaryEmail,
            conflict_with: emailConflict.clerk_user_id,
          });
          // Skip email update but continue with other fields
        } else {
          updateData.email = primaryEmail;
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update(updateData)
        .eq("clerk_user_id", id);

      if (updateError) {
        console.error("[Clerk Webhook] user.updated - Database error", {
          clerk_user_id: id,
          error: updateError,
        });
        return new NextResponse(JSON.stringify({ received: true, processed: false, error: updateError.message }), { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      console.log("[Clerk Webhook] user.updated - Success", {
        clerk_user_id: id,
        supabase_id: existingUser.id,
        updated_fields: Object.keys(updateData),
        duration_ms: Date.now() - startTime,
      });
    } catch (error) {
      console.error("[Clerk Webhook] user.updated - Unexpected error", {
        clerk_user_id: id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return new NextResponse(JSON.stringify({ received: true, processed: false, error: "internal_error" }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // USER DELETED EVENT
  if (eventType === "user.deleted") {
    const { id } = evt.data;

    try {
      // Soft delete: mark user as inactive instead of hard delete
      const { data: deletedUser, error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq("clerk_user_id", id)
        .select("id, email")
        .single();

      if (updateError) {
        // If columns don't exist, fall back to hard delete
        if (updateError.code === "42703") {
          console.warn("[Clerk Webhook] user.deleted - Soft delete columns missing, using hard delete", {
            clerk_user_id: id,
          });
          
          const { error: deleteError } = await supabaseAdmin
            .from("users")
            .delete()
            .eq("clerk_user_id", id);

          if (deleteError) {
            console.error("[Clerk Webhook] user.deleted - Hard delete failed", {
              clerk_user_id: id,
              error: deleteError,
            });
            return new NextResponse(JSON.stringify({ received: true, processed: false, error: deleteError.message }), { 
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          }

          console.log("[Clerk Webhook] user.deleted - Hard delete success", {
            clerk_user_id: id,
            duration_ms: Date.now() - startTime,
          });
        } else {
          console.error("[Clerk Webhook] user.deleted - Database error", {
            clerk_user_id: id,
            error: updateError,
          });
          return new NextResponse(JSON.stringify({ received: true, processed: false, error: updateError.message }), { 
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
      } else {
        console.log("[Clerk Webhook] user.deleted - Soft delete success", {
          clerk_user_id: id,
          supabase_id: deletedUser?.id,
          email: deletedUser?.email,
          duration_ms: Date.now() - startTime,
        });
      }
    } catch (error) {
      console.error("[Clerk Webhook] user.deleted - Unexpected error", {
        clerk_user_id: id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return new NextResponse(JSON.stringify({ received: true, processed: false, error: "internal_error" }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // Return 200 for all events (even unhandled ones)
  return new NextResponse(JSON.stringify({ received: true, processed: true }), { 
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
