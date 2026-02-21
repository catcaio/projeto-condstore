import React from 'react';
import { Card } from '../../../ui/primitives/Card';

interface MetricCardProps {
    label: string;
    value: string | number;
    delta?: {
        value: string;
        type: 'positive' | 'negative' | 'neutral';
    };
}

export const MetricCard = ({ label, value, delta }: MetricCardProps) => {
    return (
        <Card className="flex flex-col gap-1 p-4">
            <p className="text-[var(--text-secondary)] text-[var(--text-muted)] font-medium">
                {label}
            </p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-[var(--brand-black)] tracking-tight">
                    {value}
                </h3>
                {delta && (
                    <span
                        className={`text-xs font-semibold ${delta.type === 'positive' ? 'text-green-600' :
                            delta.type === 'negative' ? 'text-red-600' :
                                'text-gray-500'
                            }`}
                    >
                        {delta.type === 'positive' && '+'}
                        {delta.value}
                    </span>
                )}
            </div>
        </Card>
    );
};
