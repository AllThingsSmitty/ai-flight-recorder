import { GoogleGenerativeAI } from "@google/generative-ai";
import { FlightRecorder, wrapGeminiModel } from "@ai-flight-recorder/sdk";
import type { GeminiModelLike } from "@ai-flight-recorder/sdk";
import { FileTransport } from "@ai-flight-recorder/sdk/node";

const transport = new FileTransport("./recordings");
const fr = new FlightRecorder({ transport });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
// Cast required: GenerativeModel uses overloads not structurally assignable
// to GeminiModelLike, but compatible at runtime.
const model = wrapGeminiModel(
  genAI.getGenerativeModel({ model: "gemini-1.5-pro" }) as unknown as GeminiModelLike,
  fr.recorder,
);

fr.startSession({ label: "gemini-demo" });

const result = await model.generateContent("What is the capital of France?");
console.log("Response:", result.response.text());

const session = fr.endSession();
console.log(`\nSession saved: ${session.id}`);
console.log(`Events recorded: ${session.events.length}`);
console.log(`Open recordings/${session.id}.flight in VS Code to inspect the session.`);
