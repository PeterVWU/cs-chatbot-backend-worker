// src/modules/intent/intent.module.ts
import { IntentModule } from "./intent.interface"
import { Conversation, Intent } from "../../types";

export class CSIntentModule implements IntentModule {
    constructor(private ai: Ai) { }
    async detectIntent(message: string, conversation: Conversation): Promise<Intent> {
        try {
            // Optionally, if the message contains an order number we can directly assume it is order related.
            let isOrderRelated = false;
            if (this.containsOrderNumber(message)) {
                isOrderRelated = true;
                console.log("Order number detected – treating message as order related.");
                return "status"
            } else {
                // Step 1: Use LLM to determine if the inquiry is order related.
                const orderRelatedPrompt = `Based on the conversation history and the user message below, determine if the inquiry is order related.

Conversation history:
${conversation.messages.map(m => m.structuredContent).join('\n')}

User message: "${message}"

Answer only with "yes" or "no".`;

                const orderRelatedResponse: any = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a customer service assistant. Answer only with "yes" or "no".'
                        },
                        {
                            role: 'user',
                            content: orderRelatedPrompt
                        }
                    ]
                });

                const answer = orderRelatedResponse.response.trim().toLowerCase();
                console.log("LLM order-related check answer:", answer);
                isOrderRelated = answer === 'yes';
            }

            // If the message is not order related, simply return "other" or "ticketing".
            if (!isOrderRelated) {
                return this.containsEmail(message) ? 'ticketing' : 'other'
            }

            // Step 2: If order related, use LLM to identify the specific type of order request.
            const orderTypePrompt = `Analyze the following customer service message and determine the specific type of order request.
Possible types include: status, tracking, cancel, refund, return.
If the request does not clearly match one of these, answer with "other".

Conversation history:
${conversation.messages.map(m => m.structuredContent).join('\n')}

User message: "${message}"`;

            const orderTypeResponse: any = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
                messages: [
                    {
                        role: 'system',
                        content: 'You are a customer service order classification assistant. Respond only with one of these exact words: status, tracking, cancel, refund, return, other.'
                    },
                    {
                        role: 'user',
                        content: orderTypePrompt
                    }
                ]
            });

            const detailedIntent = orderTypeResponse.response.trim().toLowerCase();
            console.log("LLM order type classification:", detailedIntent);
            const validOrderTypes = ['status', 'tracking', 'cancel', 'refund', 'return'];
            if (validOrderTypes.includes(detailedIntent)) {
                return detailedIntent as Intent;
            } else {
                console.warn(`LLM returned an unrecognized order type: ${detailedIntent}. Defaulting to "other".`);
                return 'other';
            }
        } catch (error) {
            console.error('Error detecting intent:', error);
            return 'other';
        }
    }

    private containsOrderNumber(text: string): boolean {
        // This regex should match your order number format
        const orderRegex = /#?(\d{6,})/;
        return orderRegex.test(text);
    }

    private containsEmail(text: string): boolean {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        return emailRegex.test(text);
    }

}