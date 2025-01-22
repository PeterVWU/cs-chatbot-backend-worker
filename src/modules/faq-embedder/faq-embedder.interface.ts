// src/modules/faq-embedder/faq-embedder.interface.ts
export interface FAQ {
    id: string;
    question: string;
    answer: string;
    shortAnswer?: string;
    linkUrl?: string;
}

export interface FAQEmbedderModule {
    embedFAQs(faqs: FAQ[]): Promise<void>;
}