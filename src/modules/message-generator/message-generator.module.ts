// src/modules/message-generator/message-generator.module.ts
import { OrderDetails } from "../magento/magento.interface";
import { MessageGeneratorModule, GenerateMessageInput, FAQResult } from "./message-generator.interface";

export class CSMessageGeneratorModule implements MessageGeneratorModule {
    async generateResponse(input: GenerateMessageInput): Promise<string> {
        const { intent, additionalData, conversation } = input;

        switch (intent) {
            case 'get_order_data':
                return this.generateOrderResponse(additionalData as OrderDetails);

            case 'general_inquiry':
                return this.generateFAQResponse(additionalData as FAQResult);

            case 'need_order_number':
                return "To assist you better, could you please provide your order number?";

            case 'ticketing':
                return this.generateTicketResponse(conversation.metadata.email);

            case 'close':
                return "Thank you for contacting us. Is there anything else you need help with?";

            default:
                return "I apologize, but I'm having trouble understanding. Could you please rephrase your question?";
        }
    }

    private generateOrderResponse(orderDetails: OrderDetails | null): string {
        if (!orderDetails) {
            return "I couldn't find that order. Please verify your order number and try again.";
        }

        const tracking = orderDetails.shipping.tracking?.length
            ? `\nTracking: ${orderDetails.shipping.tracking.map(t =>
                `${t.carrier}: ${t.number}`).join(', ')}`
            : '';

        return `Order #${orderDetails.orderNumber}\n
Status: ${orderDetails.status}\n
${tracking}
Total: $${orderDetails.totals.total}`;
    }

    private generateFAQResponse(faqResult: FAQResult | null): string {
        if (!faqResult) {
            return "I apologize, but I couldn't find a specific answer to your question. Would you like me to create a support ticket for further assistance?";
        }

        return `${faqResult.shortAnswer}\n\nFor more detailed information, please <a href="${faqResult.linkUrl}" target="_blank">click here</a>`;
    }

    private generateTicketResponse(email: string | undefined): string {
        if (!email) {
            return "To create a support ticket, I'll need your email address. Could you please provide it?";
        }

        return "I've created a support ticket for you. Our team will contact you at the provided email address shortly.";
    }
}