import Anthropic from "@anthropic-ai/sdk";
import { FlightRecorder, wrapAnthropic } from "@ai-flight-recorder/sdk";
import type { AnthropicClientLike, AnthropicMessageResponse } from "@ai-flight-recorder/sdk";
import { FileTransport } from "@ai-flight-recorder/sdk/node";

const transport = new FileTransport("./recordings");
const fr = new FlightRecorder({ transport });
// Cast required: the actual Anthropic SDK uses strict overloads that aren't
// structurally assignable to AnthropicClientLike, but are compatible at runtime.
const client = wrapAnthropic(new Anthropic() as unknown as AnthropicClientLike, fr.recorder);

fr.startSession({ label: "anthropic-demo" });

const response = await client.messages.create({
  model: "claude-opus-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "What is the capital of France?" }],
});

// Non-streaming call — narrow to the message response type.
const message = response as AnthropicMessageResponse;
const text = message.content.find((b) => b.type === "text");
console.log("Response:", text?.text);

const session = fr.endSession();
console.log(`\nSession saved: ${session.id}`);
console.log(`Events recorded: ${session.events.length}`);
console.log(`Open recordings/${session.id}.flight in VS Code to inspect the session.`);
