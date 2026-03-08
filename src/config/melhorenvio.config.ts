/**
 * Melhor Envio API configuration.
 * Centralizes all Melhor Envio-related settings and credentials.
 */

interface MelhorEnvioConfig {
  apiUrl: string;
  token: string;
  timeout: number; // ms
  maxRetries: number;
  retryDelay: number; // ms
}

export const melhorEnvioConfig: MelhorEnvioConfig = {
  apiUrl: process.env.MELHOR_ENVIO_API_URL || 'https://www.melhorenvio.com.br/api/v2',
  token: process.env.MELHOR_ENVIO_TOKEN || '',
  timeout: parseInt(process.env.MELHOR_ENVIO_TIMEOUT_MS || '15000', 10),
  maxRetries: parseInt(process.env.MELHOR_ENVIO_MAX_RETRIES || '2', 10),
  retryDelay: parseInt(process.env.MELHOR_ENVIO_RETRY_DELAY_MS || '1000', 10),
};

/**
 * Melhor Envio API endpoints.
 */
export const melhorEnvioEndpoints = {
  calculateShipping: '/me/shipment/calculate',
  trackShipment: '/me/shipment/tracking',
  generateLabel: '/me/shipment/generate',
} as const;
