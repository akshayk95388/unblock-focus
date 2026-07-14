import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // 1. Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Atomically deduct 1 credit (only if credits > 0)
  const { data: deductResult, error: deductError } = await supabase
    .rpc("deduct_credit", { user_uuid: user.id });

  // If RPC doesn't exist yet (migration not applied), fall through gracefully
  if (deductError && deductError.code !== "42883") {
    // 42883 = function does not exist
    console.error("Credit deduction error:", deductError);
  }

  // If RPC exists and returned false, user has no credits
  if (deductResult === false) {
    return NextResponse.json(
      { error: "OUT_OF_CREDITS", message: "You have no credits remaining. Upgrade to Pro for unlimited sessions." },
      { status: 403 }
    );
  }

  // 3. Fetch the VPS backend with authorization
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const body = await request.json();

  try {
    const response = await fetch(`${backendUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.INTERNAL_API_KEY || "test-key"}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // 4a. Refund credit on backend failure
      try { await supabase.rpc("refund_credit", { user_uuid: user.id }); } catch { /* ignore */ }

      return NextResponse.json(
        { error: errorText || "Failed to generate meditation" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    // 4b. Refund credit on network/exception failure
    try { await supabase.rpc("refund_credit", { user_uuid: user.id }); } catch { /* ignore */ }

    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

