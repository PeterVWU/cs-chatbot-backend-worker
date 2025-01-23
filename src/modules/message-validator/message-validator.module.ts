// src/modules/message-validator/message-validator.module.ts
import { MessageValidatorModule, ValidationResult } from "./message-validator.interface"

export class CSMessageValidatorModule implements MessageValidatorModule {
    constructor(private ai: Ai) { }
    public async validateResponse(message: string): Promise<ValidationResult> {
        try {
            const response: any = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
                messages: [
                    {
                        role: 'system',
                        content: `You are a message validator for customer service responses. 
                        Evaluate the response based on these criteria:
                        1. Professional and polite tone
                        2. Clear and concise communication
                        4. Grammatically correct
                        
                        Respond with only "VALID" or "INVALID: [reason]"`
                    },
                    {
                        role: 'user',
                        content: `Validate this customer service response:\n"${message}"`
                    }
                ],
                max_tokens: 50
            })

            const validationResponse = response.response.trim();

            if (validationResponse === 'VALID') {
                return { isValid: true };
            }

            const reason = validationResponse.startsWith('INVALID') ? validationResponse.substring(8).trim() : 'Response does not meet validation criteria';

            return {
                isValid: false,
                reason
            }
        } catch (error) {
            console.error('Error validating response:', error);
            return {
                isValid: false,
                reason: 'An error occurred while validating response'
            }
        }
    }

    private validateBasicRules(message: string): ValidationResult {
        // Check for basic rules like length, presence of certain keywords, etc.
        if (message.length < 10) {
            return {
                isValid: false,
                reason: 'Response is too short'
            }
        }
        if (message.length > 1000) {
            return {
                isValid: false,
                reason: 'Response is too long'
            }
        }
        if (!message.trim()) {
            return {
                isValid: false,
                reason: 'Response is empty'
            }
        }
        return {
            isValid: true
        }
    }
}