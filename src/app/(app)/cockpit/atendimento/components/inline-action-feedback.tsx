import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export type ActionFeedbackTone = 'success' | 'danger' | 'info';

export interface ActionFeedbackState {
    tone: ActionFeedbackTone;
    title: string;
    description?: string;
    requestId?: string;
}

type ApiErrorPayload = {
    message?: string;
    error?: {
        message?: string;
        requestId?: string;
    };
};

const toneClasses: Record<ActionFeedbackTone, string> = {
    success: 'border-[hsl(var(--ui-success)/0.2)] bg-[hsl(var(--ui-success)/0.08)] text-[hsl(var(--ui-success-ink))]',
    danger: 'border-[hsl(var(--ui-danger)/0.2)] bg-[hsl(var(--ui-danger)/0.08)] text-[hsl(var(--ui-danger-ink))]',
    info: 'border-[hsl(var(--ui-accent-blue)/0.18)] bg-[hsl(var(--ui-accent-blue)/0.08)] text-[hsl(var(--ui-accent-blue-ink))]',
};

const toneIcon = {
    success: CheckCircle2,
    danger: AlertCircle,
    info: Info,
} satisfies Record<ActionFeedbackTone, typeof AlertCircle>;

export function buildActionSuccess(title: string, description?: string): ActionFeedbackState {
    return {
        tone: 'success',
        title,
        description,
    };
}

export function buildActionError(title: string, description: string, requestId?: string): ActionFeedbackState {
    return {
        tone: 'danger',
        title,
        description,
        requestId,
    };
}

export function buildUnexpectedActionError(title: string, description: string): ActionFeedbackState {
    return buildActionError(title, description);
}

export async function buildActionErrorFromResponse(
    response: Response,
    title: string,
    fallbackDescription: string,
): Promise<ActionFeedbackState> {
    let description = fallbackDescription;
    let requestId = response.headers.get('x-request-id') ?? undefined;

    try {
        const payload = await response.json() as ApiErrorPayload;
        description = payload.error?.message ?? payload.message ?? fallbackDescription;
        requestId = requestId ?? payload.error?.requestId;
    } catch {
        // Ignore malformed or empty bodies and fall back to the HTTP metadata.
    }

    return buildActionError(title, description, requestId);
}

export function InlineActionFeedback({
    feedback,
    className = '',
}: {
    feedback: ActionFeedbackState | null;
    className?: string;
}) {
    if (!feedback) return null;

    const Icon = toneIcon[feedback.tone];

    return (
        <div className={`rounded-xl border px-3 py-3 ${toneClasses[feedback.tone]} ${className}`.trim()}>
            <div className="flex items-start gap-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em]">{feedback.title}</p>
                    {feedback.description ? (
                        <p className="mt-1 text-sm leading-5 opacity-90">{feedback.description}</p>
                    ) : null}
                    {feedback.requestId ? (
                        <p className="mt-2 rounded-md bg-black/5 px-2 py-1 font-mono text-[11px] text-current/80">
                            Request ID: {feedback.requestId}
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
