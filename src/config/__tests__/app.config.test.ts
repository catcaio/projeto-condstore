import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('app.config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('throws error when runtimeMode is not SUPERVISED_ONLY', async () => {
        process.env.ORIGIN_CEP = '01001000';
        process.env.MELHORENVIO_TOKEN = 'token';
        process.env.TABELA_CSV_URL = 'url';
        process.env.TWILIO_ACCOUNT_SID = 'sid';
        process.env.TWILIO_AUTH_TOKEN = 'token';
        process.env.FRANK_RUNTIME_ENABLED = 'true';
        // Mock to make app.config load with a different runtime mode temporarily (though it's hardcoded to SUPERVISED_ONLY, we just test the throw)
        
        const configModule = await import('../app.config');
        
        // Temporarily modify the hardcoded mode just to test the guardrail logic
        (configModule.appConfig.frank as any).runtimeMode = 'AUTONOMOUS';

        expect(() => configModule.validateConfig()).toThrow(
            /MVP Freeze Violation: Frank autonomous mode is strictly forbidden/
        );
    });

    it('passes validation when runtimeMode is SUPERVISED_ONLY', async () => {
        process.env.ORIGIN_CEP = '01001000';
        process.env.MELHORENVIO_TOKEN = 'token';
        process.env.TABELA_CSV_URL = 'url';
        process.env.TWILIO_ACCOUNT_SID = 'sid';
        process.env.TWILIO_AUTH_TOKEN = 'token';
        
        const configModule = await import('../app.config');
        
        expect(() => configModule.validateConfig()).not.toThrow();
    });
});
