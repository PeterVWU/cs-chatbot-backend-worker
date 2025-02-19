// src/modules/message-generator/message-generator.module.ts
import { OrderDetails } from "../magento/magento.interface";
import { MessageGeneratorModule, GenerateMessageInput, FAQResult } from "./message-generator.interface";
import { StructuredResponse, Link, Conversation, OrderIntent, Action, Intent } from "../../types";

export class CSMessageGeneratorModule implements MessageGeneratorModule {
    constructor(private ai: Ai) { }
    async generateResponse(input: GenerateMessageInput): Promise<StructuredResponse> {
        const { userMessage, intent, additionalData, conversation } = input;

        switch (intent) {
            case "status":
            case "tracking":
            case "return":
            case "cancel":
            case "refund":
                return await this.handleOrderIntent(userMessage, conversation, additionalData as OrderDetails, intent);

            case 'other':
                return this.generateFAQResponse(additionalData as FAQResult);

            case 'ticketing':
                return this.generateTicketResponse(conversation.metadata.email);

            // case 'close':
            //     return { text: "Thank you for contacting us. Is there anything else you need help with?" };

            default:
                return { text: "I apologize, but I'm having trouble understanding. Could you please rephrase your question?" };
        }
    }

    private async handleOrderIntent(userMessage: string, conversation: Conversation, additionalData: OrderDetails, intent: Intent): Promise<StructuredResponse> {
        try {
            if (!additionalData && !conversation.metadata.orderNumber) {
                return { text: "To assist you better, could you please provide your order number?" }
            } else {
                return this.generateOrderResponse(userMessage, conversation, additionalData, intent);
            }
        } catch (error) {
            console.error(error);
            return { text: "I apologize, but I'm having trouble understanding. Could you please rephrase your question?" };
        }
    }

    private async generateOrderResponse(userMessage: string, conversation: Conversation, orderDetails: OrderDetails, intent: Intent): Promise<StructuredResponse> {
        if (!orderDetails) {
            return { text: "Our system is not showing your order." };
        }

        const { status, orderNumber, shipping } = orderDetails;

        let baseText: string = '';
        let links: Link[] = [];
        let action: Action | null = null;
        switch (intent) {
            case 'status':
            case 'tracking':
                const statusMessage = this.getStatusMessage(status);
                baseText = `I found your order #${orderNumber}. ${statusMessage}`;
                if (!shipping.tracking || shipping.tracking.length === 0) {
                    baseText = `${baseText}\n\nOur system is not showing tracking information for your order. It typically takes up to 48 hours from the time you initially place your order for tracking information to appear.`
                } else {
                    links = this.createTrackingLinks(orderDetails)
                    action = { type: 'feedback' }
                }
                break;
            case 'cancel':
            case 'refund':
            case 'return':
                baseText = `Sorry I can't ${intent} order, 
                            but I can create a support ticket for you, 
                            and one of our customer service agant will help you ${intent} the order.
                            \n\n Would you like to create a ticket`
                action = { type: 'ticket' }
                break;
            case 'other':
                baseText = "I apologize, but I'm having trouble understanding. Could you please rephrase your question?"
        }

        return {
            text: baseText,
            links,
            action,
        };
    }

    private createTrackingLinks(orderDetails: OrderDetails): Link[] {
        return orderDetails?.shipping?.tracking?.map(t => {
            const carrierInfo = this.getCarrierTrackingLink(t.carrier, t.number);
            return {
                label: `Track with ${carrierInfo.name}`,
                url: carrierInfo.url,
                type: 'tracking'
            };
        }) || [];
    }

    private async orderIntent(userMessage: string, conversation: Conversation): Promise<OrderIntent> {
        const prompt = `Analyze the following customer service message and classify it into one of these order related categories:
- status: Inquiries about order status
- return: Inquiries about order return
- cancel: Inquiries about order cancellation
- tracking: Inquiries about order tracking

conversation history: ${conversation.messages.map(message => message.structuredContent).join('\n')}
User message: "${userMessage}"`;
        const response: any = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
            messages: [
                {
                    role: 'system',
                    content: 'You are a order inquery classifier. Respond only with one of these exact words: status, return, cancel, tracking.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
        console.log(response);
        const predictedIntent = response.response.trim().toLowerCase();
        const validIntents: OrderIntent[] = ['status', 'return', 'cancel', 'tracking'];
        if (!validIntents.includes(predictedIntent)) {
            console.warn(`Invalid order intent: ${predictedIntent}, falling back to status`);
            return 'status'
        }
        return predictedIntent
    }

    private getStatusMessage(status: string): string {
        const statusMessages: Record<string, string> = {
            'pending': 'Your order has been received and is being processed.',
            'processing': 'Your order is currently being processed.',
            'shipped': 'Great news! Your order has been shipped.',
            'delivered': 'Your order has been delivered.',
            'cancelled': 'This order has been cancelled.',
            'complete': 'This order has been completed and delivered.'
        };

        return statusMessages[status.toLowerCase()] || `The order status is: ${status}`;
    }

    private getCarrierTrackingLink(carrierCode: string, trackingNumber: string): { name: string, url: string } {
        const carriers: Record<string, { name: string, url: string }> = {
            'usps': {
                name: 'USPS',
                url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`
            },
            'fedex': {
                name: 'FedEx',
                url: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`
            },
            'ups': {
                name: 'UPS',
                url: `https://www.ups.com/track?tracknum=${trackingNumber}`
            },
            'dhl': {
                name: 'DHL',
                url: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`
            }
        };

        const defaultCarrier = {
            name: carrierCode.toUpperCase(),
            url: '#'
        };

        return carriers[carrierCode.toLowerCase()] || defaultCarrier;
    }

    private generateFAQResponse(faqResult: FAQResult | null): StructuredResponse {
        if (!faqResult || faqResult.confidence < 0.6) {
            return {
                text: "I apologize, but I couldn't find a specific answer to your question. Would you like me to create a support ticket for further assistance?"
            };
        }


        return {
            text: faqResult.shortAnswer || "",
            links: [{
                label: "View full answer",
                url: faqResult.linkUrl || "",
                type: 'faq'
            }]
        };
    }

    private generateTicketResponse(email: string | undefined): StructuredResponse {
        if (!email) {
            return {
                text: "To create a support ticket, I'll need your email address. Could you please provide it?"
            };
        }

        return {
            text: "I've created a support ticket for you. Our team will contact you at the provided email address shortly."
        };
    }
}