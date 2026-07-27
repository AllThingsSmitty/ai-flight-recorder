import OpenAI from "openai";
import { FlightRecorder, wrapOpenAI } from "@ai-flight-recorder/sdk";
import type { OAIChatCompletionChunk, OpenAIClientLike } from "@ai-flight-recorder/sdk";
import { sessionStore } from "@/lib/session-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response("Missing OPENAI_API_KEY — copy .env.example to .env.local", {
      status: 500,
    });
  }

  const { messages } = (await request.json()) as {
    messages: Array<{ role: string; content: string }>;
  };

  const fr = new FlightRecorder();
  // Swap wrapOpenAI for wrapAnthropic or wrapGeminiModel to use a different provider
  const openai = wrapOpenAI(new OpenAI() as unknown as OpenAIClientLike, fr.recorder);

  fr.startSession({ label: "nextjs-chat" });

  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    stream: true,
  });

  const chunks = result as AsyncIterable<OAIChatCompletionChunk>;

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of chunks) {
          const content = chunk.choices[0]?.delta?.content ?? "";
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
      } finally {
        sessionStore.latest = fr.endSession();
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
