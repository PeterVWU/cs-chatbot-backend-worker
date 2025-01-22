// src/modules/message-validator.interface.ts

export interface ValidationResult {
    isValid: boolean;
    reason?: string;
}

export interface MessageValidatorModule {
    validateResponse(message: string): Promise<ValidationResult>
}