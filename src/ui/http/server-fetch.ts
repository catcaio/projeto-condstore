export async function serverFetchJson<T>(url: string, init?: RequestInit): Promise<{
    ok: boolean;
    status: number;
    data?: T;
    error?: { message: string; code?: string; requestId?: string };
    requestId?: string;
}> {
    try {
        const res = await fetch(url, init);

        const requestId = res.headers.get('x-request-id') || undefined;
        let body: any;

        try {
            const raw = await res.text();
            body = raw ? JSON.parse(raw) : null;
        } catch {
            return {
                ok: false,
                status: res.status,
                requestId,
                error: { message: 'Failed to parse JSON response', requestId }
            };
        }

        if (!res.ok) {
            return {
                ok: false,
                status: res.status,
                requestId,
                error: {
                    message: typeof body?.error === 'string' ? body.error : (body?.error?.message || body?.message || `HTTP ${res.status}`),
                    code: body?.code || body?.error?.code,
                    requestId
                }
            };
        }

        return {
            ok: true,
            status: res.status,
            data: body as T,
            requestId
        };

    } catch (err: any) {
        return {
            ok: false,
            status: 500,
            error: { message: err.message || 'Internal Fetch Error' }
        };
    }
}
