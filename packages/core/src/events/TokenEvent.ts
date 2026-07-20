import { BaseEvent } from "./Event";

export interface TokenEvent extends BaseEvent {
  type: "token";

  token: string;

  index: number;

  isFinal?: boolean;
}
