// src/modules/faq-embedder/faq-embedder.module.ts
import { FAQ, FAQEmbedderModule } from './faq-embedder.interface';

export class CSFAQEmbedderModule implements FAQEmbedderModule {
    constructor(
        private ai: Ai,
        private vectorize: Vectorize
    ) { }

    async embedFAQs(faqs: FAQ[]): Promise<void> {
        try {
            // Process FAQs in batches to avoid rate limits
            const batchSize = 20;
            for (let i = 0; i < faqs.length; i += batchSize) {
                const batch = faqs.slice(i, i + batchSize);
                await this.processFAQBatch(batch);
            }
            console.log(`Successfully embedded ${faqs.length} FAQs`);
        } catch (error) {
            console.error('Error embedding FAQs:', error);
            throw new Error('Failed to embed FAQs');
        }
    }

    private async processFAQBatch(faqs: FAQ[]): Promise<void> {
        const embeddings = await Promise.all(
            faqs.map(faq => this.generateEmbedding(faq))
        );

        // Prepare vectors for insertion
        const vectors: VectorizeVector[] = faqs.map((faq, index) => ({
            id: faq.id,
            values: embeddings[index],
            metadata: {
                question: faq.question,
                answer: faq.answer
            }
        }));

        // Insert vectors into Vectorize
        await this.vectorize.upsert(vectors);
    }

    private async generateEmbedding(faq: FAQ): Promise<number[]> {
        // Combine question and answer for embedding
        const text = `Question: ${faq.question}\nAnswer: ${faq.answer}`;

        try {
            const response = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
                text: text
            });

            return response.data[0];
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw new Error('Failed to generate embedding');
        }
    }
}