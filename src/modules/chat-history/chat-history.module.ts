// src/modules/chat-history/chat-history.module.ts
import { ChatHistoryModule } from "./chat-history.interface"
import { Conversation, Message } from '../../types';

export class D1ChatHistoryModule implements ChatHistoryModule {
    constructor(private db: D1Database) { }

    async getHistory(conversationId: string): Promise<Conversation | null> {
        try {
            const conversation = await this.db.prepare(
                `SELECT id, status, metadata
                FROM conversations
                WHERE id = ?`
            )
                .bind(conversationId)
                .first<{ id: string, status: 'open' | 'closed' | 'ticket', metadata: string }>();

            if (!conversation) {
                return null;
            }

            // Get messages for the conversation
            const messages = await this.db.prepare(
                `SELECT text, sender, timestamp
                    FROM messages
                    WHERE conversation_id = ?
                    ORDER BY timestamp ASC`
            )
                .bind(conversationId)
                .all<Message>();

            return {
                id: conversation.id,
                status: conversation.status,
                metadata: JSON.parse(conversation.metadata),
                messages: messages.results
            }
        } catch (error) {
            console.error('Error retrieving conversation history:', error);
            throw new Error('Failed to retrieve conversation history');
        }
    }

    async createConversation(): Promise<Conversation> {
        const newConversation: Conversation = {
            id: crypto.randomUUID(),
            status: 'open',
            metadata: {},
            messages: []
        }

        try {
            await this.db.prepare(
                `INSERT INTO conversations (id, status, metadata, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)`
            )
                .bind(
                    newConversation.id,
                    newConversation.status,
                    JSON.stringify(newConversation.metadata),
                    Date.now(),
                    Date.now()
                )
                .run();

            return newConversation;
        } catch (error) {
            console.error('Error creating conversation:', error);
            throw new Error('Failed to create conversation');
        }
    }

    async saveConversation(conversation: Conversation): Promise<void> {

        try {
            const existingCount = await this.db.prepare(`SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?`)
                .bind(conversation.id)
                .first<{ count: number }>();

            // Insert new messages
            const newMessages = conversation.messages.slice(existingCount?.count || 0);

            await this.db.batch([
                // update conversation
                this.db.prepare(
                    `UPDATE conversations
                        SET status = ?, metadata = ?, updated_at = ?
                        WHERE id = ?`
                )
                    .bind(
                        conversation.status,
                        JSON.stringify(conversation.metadata),
                        Date.now(),
                        conversation.id
                    ),

                ...newMessages.map(message =>
                    this.db.prepare(
                        `INSERT INTO messages (conversation_id, text, sender, timestamp)
                        VALUES (?, ?, ?, ?)`
                    )
                        .bind(
                            conversation.id,
                            message.text,
                            message.sender,
                            message.timestamp
                        )
                )
            ]);
        } catch (error) {
            console.error('Error saving conversation:', error);
            throw new Error('Failed to save conversation');
        }
    }
}