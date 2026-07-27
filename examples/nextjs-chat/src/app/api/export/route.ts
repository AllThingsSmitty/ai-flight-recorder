import { serializeSession } from "@ai-flight-recorder/sdk";
import { sessionStore } from "@/lib/session-store";

export const runtime = "nodejs";

export async function GET() {
  const session = sessionStore.latest;

  if (!session) {
    return new Response("No session recorded yet — send a message first", { status: 404 });
  }

  const filename = `session-${session.id.slice(0, 8)}.flight`;

  return new Response(serializeSession(session), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
