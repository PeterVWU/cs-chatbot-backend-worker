// src/types/conversation.ts
export interface ConversationMetadata {
    email?: string;
    orderNumber?: string;
}

export interface Message {
    text: string;
    sender: 'user' | 'bot';
    timestamp: number;
}

export interface Conversation {
    id: string;
    messages: Message[];
    status: 'open' | 'closed' | 'ticket';
    metadata: ConversationMetadata;
}