'use client';

import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

export type OperationFeedbackTone = 'success' | 'error' | 'warning';

export interface OperationFeedbackState {
  tone: OperationFeedbackTone;
  title: string;
  description?: string;
}

const toneStyles: Record<OperationFeedbackTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
};

const toneIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
};

export function OperationFeedback({ feedback }: { feedback: OperationFeedbackState | null }) {
  if (!feedback) return null;

  const Icon = toneIcons[feedback.tone];

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneStyles[feedback.tone]}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{feedback.title}</p>
          {feedback.description ? <p className="text-xs opacity-90">{feedback.description}</p> : null}
        </div>
      </div>
    </div>
  );
}
