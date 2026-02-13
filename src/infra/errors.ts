/**
 * Structured error handling system.
 * All custom errors extend BaseError for consistent handling.
 */

export enum ErrorCode {
  // Infrastructure errors
  REDIS_CONNECTION_ERROR = 'REDIS_CONNECTION_ERROR',
  REDIS_OPERATION_ERROR = 'REDIS_OPERATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // Provider errors
  TWILIO_API_ERROR = 'TWILIO_API_ERROR',
  MELHORENVIO_API_ERROR = 'MELHORENVIO_API_ERROR',
  MELHORENVIO_TIMEOUT = 'MELHORENVIO_TIMEOUT',
  TABELA_CSV_ERROR = 'TABELA_CSV_ERROR',

  // Business logic errors
  INVALID_CEP = 'INVALID_CEP',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  INVALID_PHONE_NUMBER = 'INVALID_PHONE_NUMBER',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',

  // Freight errors
  NO_FREIGHT_OPTIONS = 'NO_FREIGHT_OPTIONS',
  FREIGHT_CALCULATION_ERROR = 'FREIGHT_CALCULATION_ERROR',

  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export interface ErrorContext {
  [key: string]: unknown;
}

/**
 * Base error class for all custom errors.
 */
export class BaseError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly context?: ErrorContext,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      isRetryable: this.isRetryable,
    };
  }
}

/**
 * Infrastructure-related errors (Redis, external services).
 */
export class InfrastructureError extends BaseError {
  constructor(code: ErrorCode, message: string, context?: ErrorContext) {
    super(code, message, context, true); // Infrastructure errors are retryable
  }
}

/**
 * Provider-related errors (Twilio, Melhor Envio).
 */
export class ProviderError extends BaseError {
  constructor(code: ErrorCode, message: string, context?: ErrorContext, isRetryable: boolean = true) {
    super(code, message, context, isRetryable);
  }
}

/**
 * Business logic errors (validation, state transitions).
 */
export class BusinessError extends BaseError {
  constructor(code: ErrorCode, message: string, context?: ErrorContext) {
    super(code, message, context, false); // Business errors are not retryable
  }
}

/**
 * User-facing error messages.
 * Maps error codes to friendly messages for end users.
 */
export const userFacingMessages: Record<ErrorCode, string> = {
  [ErrorCode.REDIS_CONNECTION_ERROR]: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.',
  [ErrorCode.REDIS_OPERATION_ERROR]: 'Erro ao processar sua solicitação. Tente novamente.',
  [ErrorCode.TWILIO_API_ERROR]: 'Erro ao enviar mensagem. Tente novamente.',
  [ErrorCode.MELHORENVIO_API_ERROR]: 'Erro ao calcular frete. Tente novamente em alguns instantes.',
  [ErrorCode.MELHORENVIO_TIMEOUT]: 'O cálculo de frete está demorando mais que o esperado. Tente novamente.',
  [ErrorCode.TABELA_CSV_ERROR]: 'Erro ao consultar tabela de frete. Tente novamente.',
  [ErrorCode.INVALID_CEP]: 'CEP inválido. Por favor, digite um CEP válido (ex: 01001-000).',
  [ErrorCode.INVALID_QUANTITY]: 'Quantidade inválida. Por favor, digite um número maior que zero.',
  [ErrorCode.INVALID_PHONE_NUMBER]: 'Número de telefone inválido.',
  [ErrorCode.SESSION_NOT_FOUND]: 'Sessão não encontrada. Digite "frete" para começar.',
  [ErrorCode.SESSION_EXPIRED]: 'Sua sessão expirou. Digite "frete" para começar novamente.',
  [ErrorCode.INVALID_STATE_TRANSITION]: 'Comando inválido. Digite "frete" para começar.',
  [ErrorCode.NO_FREIGHT_OPTIONS]: 'Não conseguimos calcular o frete para esse CEP. Tente outro CEP.',
  [ErrorCode.FREIGHT_CALCULATION_ERROR]: 'Erro ao calcular frete. Tente novamente.',
  [ErrorCode.UNKNOWN_ERROR]: 'Ocorreu um erro inesperado. Tente novamente mais tarde.',
  [ErrorCode.VALIDATION_ERROR]: 'Dados inválidos. Verifique e tente novamente.',
  [ErrorCode.INTERNAL_ERROR]: 'Erro interno do sistema. Tente novamente.',
};

/**
 * Get user-facing message for an error.
 */
export function getUserMessage(error: BaseError | Error): string {
  if (error instanceof BaseError) {
    return userFacingMessages[error.code] || userFacingMessages[ErrorCode.UNKNOWN_ERROR];
  }
  return userFacingMessages[ErrorCode.UNKNOWN_ERROR];
}

/**
 * Check if an error is retryable.
 */
export function isRetryable(error: BaseError | Error): boolean {
  return error instanceof BaseError && error.isRetryable;
}
