// src/index.ts
/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { WorkerEntrypoint } from "cloudflare:workers";
import { OrchestrationModule } from './modules/orchestration';
import { D1ChatHistoryModule } from './modules/chat-history';
import { CSFaqModule } from "./modules/faq";
import { CSIntentModule } from "./modules/intent";
import { CSMagentoModule } from "./modules/magento";
import { CSMessageGeneratorModule } from "./modules/message-generator";
import { CSMessageValidatorModule } from "./modules/message-validator";
import { CSTicketModule } from "./modules/ticket";
import { CSFAQEmbedderModule, FAQ } from "./modules/faq-embedder";

export interface Env {
	DB: D1Database;
	AI: Ai;
	MAGENTO_API_URL: string;
	MAGENTO_API_TOKEN: string;
	VECTORIZE: Vectorize;

	ZOHO_DESK_URL: string;
	ZOHO_ORG_ID: string;
	ZOHO_DEPARTMENT_ID: string;
	ZOHO_OAUTH_WORKER: any;
}

export default class CSBackendWorker extends WorkerEntrypoint {
	async fetch(request: Request): Promise<Response> {
		const env = this.env as Env;
		const chatHistory = new D1ChatHistoryModule(env.DB);
		const faq = new CSFaqModule(env.AI, env.VECTORIZE);
		const intent = new CSIntentModule(env.AI);
		const magento = new CSMagentoModule(env);
		const messageGenerator = new CSMessageGeneratorModule();
		const messageValidator = new CSMessageValidatorModule(env.AI);
		const ticket = new CSTicketModule(env);
		const faqEmbedder = new CSFAQEmbedderModule(env.AI, env.VECTORIZE);

		const orchestrator = new OrchestrationModule(
			chatHistory,
			faq,
			intent,
			magento,
			messageGenerator,
			messageValidator,
			ticket
		);
		// Handle request
		try {

			const url = new URL(request.url);
			const path = url.pathname;
			if (path === '/faqembedding' && request.method === 'POST') {

				const { faqs }: any = await request.json()
				await faqEmbedder.embedFAQs(faqs)
				return new Response(JSON.stringify({ message: 'FAQs embedded successfully' }), {
					headers: { 'Content-Type': 'application/json' },
				})
			} else {
				const { message, conversationId }: any = await request.json();
				console.log('message', message);
				const result = await orchestrator.processMessage(message, conversationId);

				return new Response(JSON.stringify(result), {
					headers: { 'Content-Type': 'application/json' },
				});
			}
		} catch (error) {
			return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	}
	async processMessage(message: string, conversationId: string): Promise<any> {
		const env = this.env as Env
		const chatHistory = new D1ChatHistoryModule(env.DB);
		const faq = new CSFaqModule(env.AI, env.VECTORIZE);
		const intent = new CSIntentModule(env.AI);
		const magento = new CSMagentoModule(env);
		const messageGenerator = new CSMessageGeneratorModule();
		const messageValidator = new CSMessageValidatorModule(env.AI);
		const ticket = new CSTicketModule(env);
		const faqEmbedder = new CSFAQEmbedderModule(env.AI, env.VECTORIZE);

		const orchestrator = new OrchestrationModule(
			chatHistory,
			faq,
			intent,
			magento,
			messageGenerator,
			messageValidator,
			ticket
		);
		return await orchestrator.processMessage(message, conversationId);
	}
};
