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
                return 'get_order_data';
            }

            // Check if message is asking about an order
            if (!conversation.metadata.orderNumber && this.isOrderRelatedQuery(message)) {
                return 'need_order_number';
            }

            // route to ticketing when conversation is geting too long.
            if (conversation.messages.length > 8) {
                return 'ticketing';
            }


            const prompt = `Analyze the following customer service message and classify it into one of these categories:
- close: if user wants to end the conversation
- ticketing: if user wants to create a support ticket or escalate
- general_inquiry: for general questions or default case

Current conversation status: ${conversation.status}
User has provided email: ${Boolean(conversation.metadata.email)}
User has provided order number: ${Boolean(conversation.metadata.orderNumber)}

User message: "${message}"

Classify as:`;

            const response: any = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
                messages: [
                    {
                        role: 'system',
                        content: 'You are a customer service intent classifier. Respond only with one of these exact words: close, ticketing, or general_inquiry.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
            console.log(response);
            const predictedIntent = response.response.trim().toLowerCase() as Intent;
            const validIntents: Intent[] = ['close', 'need_order_number', 'ticketing', 'general_inquiry'];
            if (!validIntents.includes(predictedIntent)) {
                console.warn(`Invalid intent detected: ${predictedIntent}, falling back to general_inquiry`);
                return 'general_inquiry'
            }
            return predictedIntent
        } catch (error) {
            console.error('Error detecting intent:', error);
            return 'general_inquiry'
        }
    }

    private containsOrderNumber(text: string): boolean {
        // This regex should match your order number format
        const orderRegex = /#?(\d{6,})/;
        return orderRegex.test(text);
    }

    private isOrderRelatedQuery(text: string): boolean {
        const orderKeywords = [
            'order',
            'purchase',
            'bought',
            'delivery',
            'shipping',
            'track',
            'package',
            'shipment',
            'ordered',
            'delivered',
            'arriving',
            'purchase',
            'buying',
            'item',
            'product'
        ];

        const questionKeywords = [
            'where',
            'when',
            'what',
            'how',
            'status',
            'update',
            'tracking',
            'received',
            'arrive',
            'coming',
            'get',
            'got',
            'deliver'
        ];

        const lowercaseText = text.toLowerCase();

        // Check if the message contains both an order-related word and a question word
        const hasOrderWord = orderKeywords.some(word => lowercaseText.includes(word));
        const hasQuestionWord = questionKeywords.some(word => lowercaseText.includes(word));

        return hasOrderWord && hasQuestionWord;
    }
}