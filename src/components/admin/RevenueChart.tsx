import React from 'react';
import { Card } from '../../ui/primitives/Card';

interface RevenueChartProps {
    data: number[]; // Array of values (e.g., 30 days)
    label?: string;
}

export const RevenueChart = ({ data, label }: RevenueChartProps) => {
    // If no data or array is too short, provide a dummy skeleton or handle it
    const chartData = data && data.length > 0 ? data : Array(30).fill(0);

    const maxVal = Math.max(...chartData, 1); // Avoid division by zero
    const minVal = 0;

    // SVG coordinate system
    const height = 100;
    const width = 100; // Using viewBox="0 0 100 100" with preserveAspectRatio="none"

    // Calculate bar width and spacing based on data length
    const barSpacing = Math.max(1, 100 / (chartData.length * 2));
    const totalBarsAndGaps = chartData.length;
    // Each bar takes up a portion of the 100% width. (e.g. 30 bars = 100 / 30 = 3.33)
    const barWidth = (100 / totalBarsAndGaps) - (barSpacing / totalBarsAndGaps);
    const stepX = 100 / totalBarsAndGaps;

    return (
        <Card className="p-4 w-full">
            {label && (
                <p className="text-[var(--text-secondary)] text-[var(--text-muted)] font-medium mb-4">
                    {label}
                </p>
            )}

            <div className="w-full h-[120px] relative">
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible"
                >
                    {/* Grid lines (optional minimal grid) */}
                    <line x1="0" y1="100" x2="100" y2="100" stroke="var(--surface-muted)" strokeWidth="0.5" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="var(--surface-muted)" strokeWidth="0.5" strokeDasharray="1,1" />

                    {/* Render Bars */}
                    {chartData.map((val, index) => {
                        const barH = (val / maxVal) * height;
                        const x = index * stepX;
                        const y = height - barH;

                        return (
                            <rect
                                key={index}
                                x={x}
                                y={y}
                                width={Math.max(barWidth, 0.5)}
                                height={barH}
                                fill="var(--brand-blue)"
                                className="transition-all duration-300 hover:fill-blue-400"
                                rx="1" // slightly rounded top corners
                            />
                        );
                    })}
                </svg>
            </div>
        </Card>
    );
};
