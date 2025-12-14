import { Events } from "@/types/pub-sub";
import createPubSub from "hd-pub-sub";

export const pubSub = createPubSub<Events>();

export class RequestTimeoutError extends Error {
  constructor() {
    super("request timeout");
    this.name = "RequestTimeoutError";
  }
}

export class RequestAbortedError extends Error {
  constructor(signal: string | symbol | number) {
    super(`request is aborted: ${signal.toString()}`);
    this.name = "RequestAbortedError";
  }
}
