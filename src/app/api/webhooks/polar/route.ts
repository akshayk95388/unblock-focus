import { NextRequest, NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { PRO_CREDITS } from "@/lib/plans";

// Use service-role-like access via the server Supabase client
// For webhook handlers, we need direct DB access without user auth context
function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("POLAR_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Verify the webhook signature
  let event;
  try {
    event = validateEvent(body, headers, webhookSecret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.error("Webhook verification failed:", error.message);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 403 }
      );
    }
    console.error("Webhook validateEvent error:", error);
    throw error;
  }

  const supabase = getSupabaseAdmin();
  const eventType = event.type;

  console.log(`[Polar Webhook] Received event: ${eventType}`);

  try {
    switch (eventType) {
      // ===== Subscription Created =====
      case "subscription.created": {
        const subscription = event.data;
        const externalUserId = subscription.customer?.externalId;
        const polarCustomerId = subscription.customerId;

        if (!externalUserId) {
          console.warn("[Polar Webhook] subscription.created: No externalId on customer — cannot link to Supabase user");
          break;
        }

        console.log(`[Polar Webhook] Linking subscription ${subscription.id} to user ${externalUserId}`);

        const isProStatus = subscription.status === "active" || subscription.status === "trialing";

        const { error } = await supabase
          .from("profiles")
          .update({
            polar_customer_id: polarCustomerId,
            subscription_id: subscription.id,
            subscription_status: subscription.status,
            plan_type: isProStatus ? "pro" : "free",
            credits: isProStatus ? PRO_CREDITS : undefined,
            credits_reset_at: isProStatus ? new Date().toISOString() : undefined,
          })
          .eq("id", externalUserId);

        if (error) {
          console.error("[Polar Webhook] Failed to update profile:", error.message);
        }
        break;
      }

      // ===== Subscription Active (first payment confirmed) =====
      case "subscription.active": {
        const subscription = event.data;
        const externalUserId = subscription.customer?.externalId;

        if (!externalUserId) {
          console.warn("[Polar Webhook] subscription.active: No externalId");
          break;
        }

        console.log(`[Polar Webhook] Activating subscription for user ${externalUserId}`);

        const isProStatus = subscription.status === "active" || subscription.status === "trialing";

        const { error } = await supabase
          .from("profiles")
          .update({
            plan_type: isProStatus ? "pro" : "free",
            subscription_status: subscription.status,
            subscription_id: subscription.id,
            polar_customer_id: subscription.customerId,
            credits: isProStatus ? PRO_CREDITS : undefined,
            credits_reset_at: isProStatus ? new Date().toISOString() : undefined,
          })
          .eq("id", externalUserId);

        if (error) {
          console.error("[Polar Webhook] Failed to activate:", error.message);
        }
        break;
      }

      // ===== Subscription Updated (renewal / plan change) =====
      case "subscription.updated": {
        const subscription = event.data;
        const externalUserId = subscription.customer?.externalId;

        if (!externalUserId) {
          console.warn("[Polar Webhook] subscription.updated: No externalId");
          break;
        }

        // Check if this is a renewal (billing period advanced)
        const { data: profile } = await supabase
          .from("profiles")
          .select("credits_reset_at")
          .eq("id", externalUserId)
          .single();

        const isRenewal =
          profile?.credits_reset_at &&
          subscription.currentPeriodStart &&
          new Date(subscription.currentPeriodStart) > new Date(profile.credits_reset_at);

        const isProStatus = subscription.status === "active" || subscription.status === "trialing";

        const updateData: Record<string, unknown> = {
          subscription_status: subscription.status,
          plan_type: isProStatus ? "pro" : "free",
        };

        if (isRenewal && isProStatus) {
          console.log(`[Polar Webhook] Renewing credits for user ${externalUserId}`);
          updateData.credits = PRO_CREDITS;
          updateData.credits_reset_at = new Date().toISOString();
        }

        const { error } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", externalUserId);

        if (error) {
          console.error("[Polar Webhook] Failed to update subscription:", error.message);
        }
        break;
      }

      // ===== Subscription Canceled =====
      case "subscription.canceled": {
        const subscription = event.data;
        const externalUserId = subscription.customer?.externalId;

        if (!externalUserId) break;

        console.log(`[Polar Webhook] Subscription canceled for user ${externalUserId}`);

        // Note: Polar sends "canceled" when the user cancels, but the subscription
        // remains active until the end of the billing period. The "revoked" event
        // fires when access should actually be removed.
        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: "canceled",
            // Keep plan_type as 'pro' until the period ends (revoked event)
          })
          .eq("id", externalUserId);

        if (error) {
          console.error("[Polar Webhook] Failed to update cancellation:", error.message);
        }
        break;
      }

      // ===== Subscription Revoked (access removed) =====
      case "subscription.revoked": {
        const subscription = event.data;
        const externalUserId = subscription.customer?.externalId;

        if (!externalUserId) break;

        console.log(`[Polar Webhook] Subscription revoked for user ${externalUserId}`);

        const { error } = await supabase
          .from("profiles")
          .update({
            plan_type: "free",
            subscription_status: "revoked",
            subscription_id: null,
          })
          .eq("id", externalUserId);

        if (error) {
          console.error("[Polar Webhook] Failed to revoke:", error.message);
        }
        break;
      }

      default:
        console.log(`[Polar Webhook] Unhandled event type: ${eventType}`);
    }
  } catch (error) {
    console.error("[Polar Webhook] Processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
