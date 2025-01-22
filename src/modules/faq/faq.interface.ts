// src/modules/faq.interface.ts
import { FAQResult } from "../message-generator/message-generator.interface";

export interface FaqModule {
    searchFAQ(query: string): Promise<FAQResult | null>;
}