// src/modules/ticket/ticket.module.ts
import { Conversation } from "../../types"
import { TicketModule, ZohoTicketPayload } from "./ticket.interface"

export class CSTicketModule implements TicketModule {
    private baseUrl: string;
    private orgId: string;
    private departmentId: string;
    private contactId: string;
    private zohoOauthWorker: any;

    constructor(env: {
        ZOHO_DESK_URL: string;
        ZOHO_ORG_ID: string;
        ZOHO_DEPARTMENT_ID: string;
        ZOHO_CONTACT_ID: string;
        ZOHO_OAUTH_WORKER: any;
    }) {
        this.baseUrl = env.ZOHO_DESK_URL;
        this.orgId = env.ZOHO_ORG_ID;
        this.departmentId = env.ZOHO_DEPARTMENT_ID;
        this.contactId = env.ZOHO_CONTACT_ID;
        this.zohoOauthWorker = env.ZOHO_OAUTH_WORKER;
    }
    public async createTicket(email: string, conversation: Conversation): Promise<any> {
        try {
            const payload = this.prepareTicketPayload(email, conversation);

            // Get valid access token
            const accessToken = await this.zohoOauthWorker.getAccessToken();
            const response = await fetch(`${this.baseUrl}/api/v1/tickets`, {
                method: 'POST',
                headers: {
                    'orgId': this.orgId,
                    'Authorization': `Zoho-oauthtoken ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Zoho API error: ${JSON.stringify(errorData)}`);
            }

            const ticketData = await response.json();
            console.log('Ticket created successfully:', ticketData);
        } catch (error) {
            console.error('Error creating ticket:', error);
            throw new Error('Failed to create support ticket');
        }
    }
    public needsEmail(conversation: Conversation): boolean {
        return !conversation.metadata.email;
    }

    private prepareTicketPayload(email: string, conversation: Conversation): ZohoTicketPayload {
        // Get all messages from the conversation for context
        const recentMessages = conversation.messages
            .map(msg => `${msg.sender}: ${msg.structuredContent.text}`)
            .join('\n');

        // Create subject from the first user message or a default
        const firstUserMessage = conversation.messages.find(msg => msg.sender === 'user')?.structuredContent.text;
        const subject = firstUserMessage ?
            `${firstUserMessage.slice(0, 50)}${firstUserMessage.length > 50 ? '...' : ''}` :
            'Customer Support Request';

        const orderContext = conversation.metadata.orderNumber ?
            `\nOrder Number: ${conversation.metadata.orderNumber}` : '';

        return {
            subject,
            email,
            departmentId: this.departmentId,
            contactId: this.contactId,
            description: `Chat Conversation History:\n${recentMessages}${orderContext}`,
            priority: 'Medium',
            status: 'Open',
            channel: 'Chat',
        };
    }
}