import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { cacheHelpers, CACHE_TTL } from "@/lib/redis";

// GET - Fetch all subscriptions with caching
export async function GET() {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try cache first
    const cacheKey = "subscriptions:all";
    const cachedSubscriptions = await cacheHelpers.get(cacheKey);
    
    if (cachedSubscriptions) {
      return NextResponse.json({ subscriptions: cachedSubscriptions, cached: true });
    }

    const { data: subscriptions, error } = await supabaseAdmin
      .from("subscriptions")
      .select(`
        *,
        users!inner(email, first_name, last_name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Transform the data
    const transformedSubscriptions = subscriptions?.map((sub: any) => ({
      id: sub.id,
      user_id: sub.user_id,
      plan_type: sub.plan_type,
      status: sub.status,
      start_date: sub.start_date,
      end_date: sub.end_date,
      created_at: sub.created_at,
      user_email: sub.users?.email || "Unknown",
      user_name: sub.users?.first_name && sub.users?.last_name 
        ? `${sub.users.first_name} ${sub.users.last_name}`
        : sub.users?.email || "Unknown",
    }));

    // Cache the results
    await cacheHelpers.set(cacheKey, transformedSubscriptions, CACHE_TTL.MEDIUM);

    return NextResponse.json({ subscriptions: transformedSubscriptions || [], cached: false });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

// POST - Create new subscription
export async function POST(request: NextRequest) {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { user_id, plan_type, status, start_date, end_date } = body;

    if (!user_id || !plan_type) {
      return NextResponse.json(
        { error: "User ID and plan type are required" },
        { status: 400 }
      );
    }

    const { data: subscription, error } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id,
        plan_type,
        status: status || "active",
        start_date: start_date || new Date().toISOString(),
        end_date,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Invalidate cache
    await cacheHelpers.del("subscriptions:all");

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}

// PUT - Update subscription
export async function PUT(request: NextRequest) {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, plan_type, status, end_date } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (plan_type) updateData.plan_type = plan_type;
    if (status) updateData.status = status;
    if (end_date !== undefined) updateData.end_date = end_date;

    const { data: subscription, error } = await supabaseAdmin
      .from("subscriptions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Invalidate cache
    await cacheHelpers.del("subscriptions:all");

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update subscription" },
      { status: 500 }
    );
  }
}

// DELETE - Delete subscription
export async function DELETE(request: NextRequest) {
  try {
    const { isValid } = await verifyAdminSession();
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    // Invalidate cache
    await cacheHelpers.del("subscriptions:all");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete subscription" },
      { status: 500 }
    );
  }
}
