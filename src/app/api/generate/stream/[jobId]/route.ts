import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  // 1. Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { jobId } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  try {
    // 2. Fetch the dynamic stream from the VPS backend
    const response = await fetch(`${backendUrl}/api/generate/stream/${jobId}`, {
      headers: {
        "Authorization": `Bearer ${process.env.INTERNAL_API_KEY || "test-key"}`,
      },
    });

    if (!response.ok) {
      return new Response("Failed to fetch stream", { status: response.status });
    }

    // 3. Pipe the body stream directly back to the client
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(error.message || "Internal server error", { status: 500 });
  }
}
