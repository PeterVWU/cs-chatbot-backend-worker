// src/modules/intent.interface.ts
import { Conversation, Intent } from "../../types";

export interface IntentModule {
    detectIntent: (text: string, conversation: Conversation) => Promise<Intent>;
}