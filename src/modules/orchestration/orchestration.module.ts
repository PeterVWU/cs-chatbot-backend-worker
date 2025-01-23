import type { ChatHistoryModule } from "../chat-history";
import type { FaqModule } from "../faq";
import type { IntentModule } from "../intent";
import type { MagentoModule } from "../magento";
import type { MessageGeneratorModule } from "../message-generator";
import type { MessageValidatorModule } from "../message-validator";
import type { TicketModule } from "../ticket";
import type { Intent, StructuredResponse } from "../../types";

export class OrchestrationModule {
  constructor(
    private chatHistory: ChatHistoryModule,
    private faq: FaqModule,
    private intent: IntentModule,
    private magento: MagentoModule,
    private messageGenerator: MessageGeneratorModule,
    private messageValidator: MessageValidatorModule,
    private ticket: TicketModule,
  ) { }

  async processMessage(userMessage: string, conversationId?: string): Promise<{
    response: StructuredResponse;
    conversationId: string;
    intent: Intent;
  }> {
    try {
      // 1. Get or create conversation history
      let conversation = conversationId
        ? await this.chatHistory.getHistory(conversationId)
        : null;

      if (!conversation) {
        conversation = await this.chatHistory.createConversation();
      }

      // Add user message to conversation
      conversation.messages.push({
        structuredContent: { text: userMessage },
        sender: 'user',
        timestamp: Date.now(),
      });

      // 2. Detect intent
      let intent: Intent = await this.intent.detectIntent(userMessage, conversation);
      let response: StructuredResponse

      if (userMessage.toLowerCase().includes('yes, the answer was helpful')) {
        response = {
          text: "I'm glad I could help! Is there anything else you need assistance with?"
        };
        intent = 'close';
        conversation.status = 'helpful';
      } else if (userMessage.toLowerCase().includes('no, i need more help')) {
        response = {
          text: "I'm sorry the answer wasn't helpful. Could you please provide your email address so I can create a support ticket for you?"
        };
        intent = 'ticketing';
      } else {
        // 3. Process based on intent and enrich with data
        let additionalData: any = null;

        switch (intent) {
          case 'get_order_data':
            const orderNumber = this.extractOrderNumber(userMessage) || conversation.metadata.orderNumber;
            if (orderNumber) {
              additionalData = await this.magento.getOrderDetails(orderNumber);
              conversation.metadata.orderNumber = orderNumber;
            }
            break;

          case 'general_inquiry':
            additionalData = await this.faq.searchFAQ(userMessage);
            break;

          case 'ticketing':
            if (this.ticket.needsEmail(conversation)) {
              const email = this.extractEmail(userMessage);
              if (email) {
                conversation.metadata.email = email;
                await this.ticket.createTicket(email, conversation);
                conversation.status = 'ticket';
              }
            } else if (conversation.metadata.email) {
              await this.ticket.createTicket(conversation.metadata.email, conversation);
              conversation.status = 'ticket';
            }
            break;

          case 'close':
            conversation.status = 'closed';
            break;
        }

        // 4. Generate response
        response = await this.messageGenerator.generateResponse({
          conversation,
          intent,
          additionalData,
        });

      }


      console.log('Generated response:', response);
      // 5. Validate response
      const validation = await this.messageValidator.validateResponse(response.text);
      if (!validation.isValid) {
        console.log('reason', validation.reason)
        // Fallback response if validation fails
        response.text = "I apologize, but I'm having trouble understanding your request. Could you please rephrase your question?";

        intent = 'general_inquiry';
      }

      // 6. Add bot response to conversation
      conversation.messages.push({
        structuredContent: response,
        sender: 'bot',
        timestamp: Date.now(),
      });

      // 7. Save updated conversation
      await this.chatHistory.saveConversation(conversation);

      return {
        response,
        conversationId: conversation.id,
        intent
      };
    } catch (error) {
      console.error('Error in orchestration:', error);
      throw new Error('Failed to process message');
    }
  }

  private extractEmail(text: string): string | null {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
  }

  private extractOrderNumber(text: string): string | null {
    // This regex should be adjusted based on your order number format
    const orderRegex = /#?(\d{9,})/;
    const match = text.match(orderRegex);
    return match ? match[1] : null;
  }
}