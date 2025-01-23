// src/modules/ticket.interface.ts
import { Conversation } from "../../types";
export interface TicketModule {
    needsEmail(conversation: Conversation): boolean;
    createTicket(email: string, conversation: Conversation): Promise<void>;
}

export interface TicketMetadata {
    ticketId: string;
    status: string;
    createdTime: string;
}

export interface ZohoTicketPayload {
    subject: string;
    departmentId: string;
    contactId: string;
    email: string;
    description: string;
    priority: 'High' | 'Medium' | 'Low';
    status: string;
    channel: string;
}