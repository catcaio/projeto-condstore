import { NextResponse } from 'next/server';
import { structuredLogger } from '@/infra/log/logger';

export function withGlobalErrorInterceptor(handler: any) {
    return async (...args: any[]) => {
        try {
            return await handler(...args);
        } catch (error: any) {
            structuredLogger.error("unhandled_api_error_intercepted", { error: error.message || error });
            return NextResponse.json({ error: 'internal_error' }, { status: 500 });
        }
    };
}
