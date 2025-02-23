// src/modules/message-generator.interface.ts
import { Conversation, Intent, StructuredResponse } from "../../types";
import { OrderDetails } from "../magento/magento.interface";


export interface GenerateMessageInput {
    userMessage: string;
    conversation: Conversation;
    intent: Intent;
    additionalData?: OrderDetails | FAQResult | null;
}

export interface FAQResult {
    question: string;
    answer: string;
    shortAnswer?: string;
    linkUrl?: string;
    confidence: number;
}

export interface MessageGeneratorModule {
    generateResponse(input: GenerateMessageInput): Promise<StructuredResponse>;
}