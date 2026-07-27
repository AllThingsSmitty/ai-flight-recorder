import Anthropic from "@anthropic-ai/sdk";
import { FlightRecorder, wrapAnthropic } from "@ai-flight-recorder/sdk";
import { FileTransport } from "@ai-flight-recorder/sdk/node";

const transport = new FileTransport("./recordings");
const fr = new FlightRecorder({ transport });
const client = wrapAnthropic(new Anthropic(), fr.recorder);

fr.startSession({ label: "anthropic-demo" });

const message = await client.messages.create({
  model: "claude-opus-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "What is the capital of France?" }],
});

const text = message.content.find((b) => b.type === "text");
console.log("Response:", text?.text);

const session = fr.endSession();
console.log(`\nSession saved: ${session.id}`);
console.log(`Events recorded: ${session.events.length}`);
console.log(`Open recordings/${session.id}.flight in VS Code to inspect the session.`);
