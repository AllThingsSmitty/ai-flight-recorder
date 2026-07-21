import { BaseEvent } from "./Event";

export interface RetrievalQueryEvent extends BaseEvent {
  type: "retrieval-query";
  query: string;
  store?: string;
  topK?: number;
  filters?: Record<string, unknown>;
}
