import createPubSub from "hd-pub-sub";
import type { PubSub } from "../../../pub-sub/dist/types/types";
// import type { BasePubSub } from "../../../pub-sub";

export const pubSub: PubSub<> = createPubSub();
