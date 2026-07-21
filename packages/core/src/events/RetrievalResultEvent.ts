import { BaseEvent } from "./Event";

export interface RetrievedChunk {
  documentId: string;
  score: number;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievalResultEvent extends BaseEvent {
  type: "retrieval-result";
  chunks: RetrievedChunk[];
  store?: string;
  durationMs?: number;
}
