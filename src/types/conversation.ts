// src/types/conversation.ts
import { Intent } from "./intent";
export interface ConversationMetadata {
    email?: string;
    orderNumber?: string;
}

export interface Message {
    structuredContent: StructuredResponse;
    sender: 'user' | 'bot';
    timestamp: number;
    intent?: Intent;
}

export interface Conversation {
    id: string;
    messages: Message[];
    status: 'open' | 'closed' | 'ticket' | 'helpful';
    metadata: ConversationMetadata;
}

export interface Link {
    label: string;
    url: string;
    type: 'tracking' | 'faq' | 'other';
}

export interface StructuredResponse {
    text: string;
    links?: Link[];
    action?: Action | null;
}

export interface Action {
    type: 'feedback' | 'ticket' | 'other';
}