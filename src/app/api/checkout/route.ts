import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { polar } from "@/lib/polar";
import { POLAR_PRODUCTS } from "@/lib/plans";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const plan = searchParams.get("plan") as
    | "pro_monthly"
    | "pro_yearly"
    | null;

  if (!plan || !POLAR_PRODUCTS[plan]) {
    return NextResponse.json(
      { error: "Invalid plan. Use ?plan=pro_monthly or ?plan=pro_yearly" },
      { status: 400 }
    );
  }

  // Authenticate the user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login with checkout redirect
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", "checkout");
    loginUrl.searchParams.set("plan", plan);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const productId = POLAR_PRODUCTS[plan];

    const result = await polar.checkouts.create({
      products: [productId],
      externalCustomerId: user.id,
      customerEmail: user.email,
      successUrl: `${request.nextUrl.origin}/focus?payment=success&checkout_id={CHECKOUT_ID}`,
      metadata: {
        user_id: user.id,
        plan,
      },
    });

    // Append dark theme to checkout URL
    const checkoutUrl = new URL(result.url);
    checkoutUrl.searchParams.set("theme", "dark");

    return NextResponse.redirect(checkoutUrl.toString());
  } catch (error: unknown) {
    console.error("Checkout creation failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
