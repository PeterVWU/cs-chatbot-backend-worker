// src/modules/message-generator/message-generator.module.ts
import { OrderDetails } from "../magento/magento.interface";
import { MessageGeneratorModule, GenerateMessageInput, FAQResult } from "./message-generator.interface";
import { StructuredResponse, Link } from "../../types/conversation";

export class CSMessageGeneratorModule implements MessageGeneratorModule {
    async generateResponse(input: GenerateMessageInput): Promise<StructuredResponse> {
        const { intent, additionalData, conversation } = input;

        switch (intent) {
            case 'get_order_data':
                return this.generateOrderResponse(additionalData as OrderDetails);

            case 'general_inquiry':
                return this.generateFAQResponse(additionalData as FAQResult);

            case 'need_order_number':
                return { text: "To assist you better, could you please provide your order number?" };

            case 'ticketing':
                return this.generateTicketResponse(conversation.metadata.email);

            case 'close':
                return { text: "Thank you for contacting us. Is there anything else you need help with?" };

            default:
                return { text: "I apologize, but I'm having trouble understanding. Could you please rephrase your question?" };
        }
    }

    private generateOrderResponse(orderDetails: OrderDetails | null): StructuredResponse {
        if (!orderDetails) {
            return { text: "I couldn't find that order. Please verify your order number and try again." };
        }

        const { status, orderNumber, shipping } = orderDetails;

        const statusMessage = this.getStatusMessage(status);
        const baseText = `I found your order #${orderNumber}. ${statusMessage}`;


        if (!shipping.tracking || shipping.tracking.length === 0) {
            return {
                text: `${baseText}\n\nTracking information will be available once your order ships.`
            };
        }

        // Create tracking links
        const links: Link[] = shipping.tracking.map(t => {
            const carrierInfo = this.getCarrierTrackingLink(t.carrier, t.number);
            return {
                label: `Track with ${carrierInfo.name}`,
                url: carrierInfo.url,
                type: 'tracking'
            };
        });

        return {
            text: baseText,
            links
        };
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
        if (!faqResult) {
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