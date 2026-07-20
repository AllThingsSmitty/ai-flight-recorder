import { BaseEvent } from "./Event";

export interface ErrorEvent extends BaseEvent {
  type: "error";
  message: string;
  code?: string;
  stack?: string;
}
