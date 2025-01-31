// src/modules/intent/intent.module.ts
import { IntentModule } from "./intent.interface"
import { Conversation, Intent } from "../../types";

export class CSIntentModule implements IntentModule {
    constructor(private ai: Ai) { }
    async detectIntent(message: string, conversation: Conversation): Promise<Intent> {
        try {

            // First check for order number in the message
            const hasOrderNumber = this.containsOrderNumber(message);

            // If we already have an order number or one was just provided
            if (!conversation.metadata.orderNumber && hasOrderNumber) {
                return 'order';
            }

            // Check if message is asking about an order
            // if (!conversation.metadata.orderNumber && this.isOrderRelatedQuery(message)) {
            //     return 'need_order_number';
            // }

            // conversation status is alreadyin ticket
            if (conversation.status === 'ticket') {
                return 'ticketing';
            }

            // route to ticketing when conversation is geting too long.
            if (conversation.messages.length > 10) {
                return 'ticketing';
            }


            const prompt = `Analyze the following customer service message and classify it into one of these categories:
- order: Inquiries about the current status of an order, delivery tracking
- other: all other inquiries

conversation history: ${conversation.messages.map(message => message.structuredContent).join('\n')}
User message: "${message}"`;


            const response: any = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
                messages: [
                    {
                        role: 'system',
                        content: 'You are a customer service intent classifier. Respond only with one of these exact words: order, other.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
            console.log(response);
            const predictedIntent = response.response.trim().toLowerCase() as Intent;
            const validIntents: Intent[] = ['order', 'other'];
            if (!validIntents.includes(predictedIntent)) {
                console.warn(`Invalid intent detected: ${predictedIntent}, falling back to other`);
                return 'other'
            }
            return predictedIntent
        } catch (error) {
            console.error('Error detecting intent:', error);
            return 'other'
        }
    }

    private containsOrderNumber(text: string): boolean {
        // This regex should match your order number format
        const orderRegex = /#?(\d{6,})/;
        return orderRegex.test(text);
    }

}