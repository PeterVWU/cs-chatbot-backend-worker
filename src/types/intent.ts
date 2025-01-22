// src/types/intent.ts
export type Intent =
    | 'close'             // End conversation
    | 'need_order_number'  // Need order number
    | 'get_order_data'    // Contains/refers to order details
    | 'ticketing'         // Create support ticket/escalate
    | 'general_inquiry';  // Default/general questions
