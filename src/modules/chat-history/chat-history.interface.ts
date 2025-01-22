// src/modules/chat-history/chat-history.interface.ts
import { Conversation } from '../../types';

export interface ChatHistoryModule {
    getHistory(conversationId: string): Promise<Conversation | null>;
    createConversation(): Promise<Conversation>;
    saveConversation(conversation: Conversation): Promise<void>;
}