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
      let conversation = await this.getOrCreateConversation(conversationId);

      // 2. Add the user message to the conversation
      this.recordUserMessage(conversation, userMessage);

      // test order number 000141624
      // 3. Detect intent (base on conversation & user message)
      let detectedIntent: Intent = await this.intent.detectIntent(userMessage, conversation);
      console.log('userMessage', userMessage)

      // 4. Check and early-return if message is a standard feedback type
      const feedbackResult = await this.handleFeedback(userMessage, conversation, detectedIntent);
      let response: StructuredResponse
      if (feedbackResult) {
        response = feedbackResult.response;
        detectedIntent = feedbackResult.intent;
      } else {
        // 5. Process message based on intent (data enrichment, ticketing, etc)
        const additionalData = await this.processIntent(userMessage, conversation, detectedIntent);
        // 6. Generate response
        response = await this.messageGenerator.generateResponse({
          userMessage,
          conversation,
          intent: detectedIntent,
          additionalData,
        });

      }
      console.log('Generated response:', response);

      // 7. Validate the generated response and fallback if needed
      const { response: validatedResponse, intent: finalIntent } = await this.validateAndFallback(response, detectedIntent);
      // 8. Add bot response
      this.sendBotMessage(conversation, validatedResponse);

      // 9. Save conversation
      await this.chatHistory.saveConversation(conversation);

      return {
        response: validatedResponse,
        conversationId: conversation.id,
        intent: finalIntent,
      };
    } catch (error) {
      console.error('Error in orchestration:', error);
      throw new Error('Failed to process message');
    }
  }

  private async getOrCreateConversation(conversationId?: string) {
    let conversation = conversationId
      ? await this.chatHistory.getHistory(conversationId)
      : null;

    if (!conversation) {
      conversation = await this.chatHistory.createConversation();
    }
    return conversation
  }

  private recordUserMessage(conversation: any, userMessage: string): void {
    conversation.messages.push({
      structuredContent: { text: userMessage },
      sender: "user",
      timestamp: Date.now(),
    });
  }

  /**
 * Checks if the user message is a feedback response or a trigger for ticket creation.
 * Returns the corresponding response and intent if applicable; otherwise null.
 */
  private async handleFeedback(
    userMessage: string,
    conversation: any,
    currentIntent: Intent
  ): Promise<{ response: StructuredResponse; intent: Intent } | null> {
    if (userMessage === "FEEDBACK_HELPFUL") {
      conversation.status = "helpful";
      return {
        response: {
          text: "I'm glad I could help! Is there anything else you need assistance with?",
        },
        intent: currentIntent,
      };
    } else if (userMessage === "FEEDBACK_UNHELPFUL") {
      conversation.status = "ticket";
      return {
        response: {
          text: "I'm sorry the answer wasn't helpful. Could you please provide your email address so I can create a support ticket for you?",
        },
        intent: "ticketing",
      };
    } else if (userMessage === "TICKET_CREATE") {
      conversation.status = "ticket";
      return {
        response: {
          text: "Could you please provide your email address so I can create a support ticket for you?",
        },
        intent: "ticketing",
      };
    }
    return null;
  }

  /**
   * Processes the intent-specific logic.
   * - For 'order' intent, resolves the order number and enriches with order details.
   * - For 'other' intent, uses FAQ search.
   * - For 'ticketing', ensures an email exists and creates ticket if possible.
   */
  private async processIntent(
    userMessage: string,
    conversation: any,
    intent: Intent
  ): Promise<any> {
    let additionalData: any = null;
    switch (intent) {
      case "status":
      case "tracking":
      case "return":
      case "cancel":
      case "refund": {
        // order related intent
        const orderNumber = this.extractOrderNumber(userMessage) || conversation.metadata.orderNumber;
        if (orderNumber) {
          additionalData = await this.magento.getOrderDetails(orderNumber);
          conversation.metadata.orderNumber = orderNumber;
        }
        break;
      }
      case "other": {
        additionalData = await this.faq.searchFAQ(userMessage);
        break;
      }
      case "ticketing": {
        if (this.ticket.needsEmail(conversation)) {
          const email = this.extractEmail(userMessage);
          if (email) {
            conversation.metadata.email = email;
            await this.ticket.createTicket(email, conversation);
            conversation.status = "ticket";
          }
        } else if (conversation.metadata.email) {
          await this.ticket.createTicket(conversation.metadata.email, conversation);
          conversation.status = "ticket";
        }
        break;
      }
    }
    return additionalData;
  }
  /**
   * Validates the generated response. If validation fails, returns a fallback response.
   */
  private async validateAndFallback(
    response: StructuredResponse,
    intent: Intent
  ): Promise<{ response: StructuredResponse; intent: Intent }> {
    const validation = await this.messageValidator.validateResponse(response.text);
    if (!validation.isValid) {
      console.log("Validation failed:", validation.reason);
      return {
        response: {
          text: "I apologize, but I'm having trouble understanding your request. Could you please rephrase your question?",
        },
        intent: "other",
      };
    }
    return { response, intent };
  }

  private sendBotMessage(conversation: any, response: StructuredResponse): void {
    console.log('sendBotMessage', response)
    conversation.messages.push({
      structuredContent: response,
      sender: "bot",
      timestamp: Date.now(),
    });
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