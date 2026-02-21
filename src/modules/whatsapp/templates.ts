/**
 * WhatsApp Template Registry
 *
 * Maps logical template names to Twilio Content SIDs from environment variables.
 * All values are Twilio Content SIDs (HX...) or approved WhatsApp template names.
 *
 * Configure in Vercel Env > Production:
 *   WHATSAPP_TEMPLATE_REENGAGE_FRETE  = HXabc123...
 *   WHATSAPP_TEMPLATE_PEDIR_DADOS     = HXdef456...
 *   WHATSAPP_TEMPLATE_STATUS_PEDIDO   = HXghi789...
 */

export type TemplateName = 'REENGAGE_FRETE' | 'PEDIR_DADOS' | 'STATUS_PEDIDO';

const ENV_MAP: Record<TemplateName, string> = {
    REENGAGE_FRETE: 'WHATSAPP_TEMPLATE_REENGAGE_FRETE',
    PEDIR_DADOS: 'WHATSAPP_TEMPLATE_PEDIR_DADOS',
    STATUS_PEDIDO: 'WHATSAPP_TEMPLATE_STATUS_PEDIDO',
};

/**
 * Resolve a logical template name to the Twilio Content SID.
 * Throws if the env var is not configured.
 */
export function resolveTemplateId(name: TemplateName): string {
    const envKey = ENV_MAP[name];
    const value = process.env[envKey];

    if (!value) {
        throw new Error(`Template not configured: ${name} (env key: ${envKey})`);
    }

    return value;
}

/**
 * Returns true if the given template is configured.
 */
export function isTemplateConfigured(name: TemplateName): boolean {
    const envKey = ENV_MAP[name];
    return Boolean(process.env[envKey]);
}
