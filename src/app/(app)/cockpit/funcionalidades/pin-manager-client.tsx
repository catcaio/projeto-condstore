'use client';

import * as React from 'react';
import { CockpitTile } from '@/modules/cockpit/launcher/tiles.registry';
import { setUserPinsAction } from './actions';
import { Button } from '@/ui/components';
import { Check, Pin, PinOff, Loader2 } from 'lucide-react';

export function PinManagerClient({
    availableTiles,
    initialPinnedIds,
}: {
    availableTiles: CockpitTile[];
    initialPinnedIds: string[];
}) {
    const [pinnedIds, setPinnedIds] = React.useState<Set<string>>(new Set(initialPinnedIds));
    const [isSaving, setIsSaving] = React.useState(false);

    const togglePin = (id: string) => {
        setPinnedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setUserPinsAction(Array.from(pinnedIds));
        } finally {
            setIsSaving(false);
        }
    };

    const hasChanges = Array.from(pinnedIds).sort().join(',') !== [...initialPinnedIds].sort().join(',');

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableTiles.map((tile) => {
                    const isPinned = pinnedIds.has(tile.id);
                    return (
                        <div
                            key={tile.id}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.01] ${isPinned
                                ? 'border-[hsl(var(--ui-brand))] bg-[hsl(var(--ui-brand))]/5 ring-1 ring-[hsl(var(--ui-brand))/0.2]'
                                : 'border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] hover:border-[hsl(var(--ui-border-active))]'
                                }`}
                        >
                            <div className="flex flex-col gap-1 pr-4">
                                <span className="font-medium text-[hsl(var(--ui-text))] leading-tight">
                                    {tile.label}
                                </span>
                                <span className="text-xs text-[hsl(var(--ui-text-muted))] line-clamp-1">
                                    {tile.description}
                                </span>
                            </div>
                            <Button
                                variant={isPinned ? 'default' : 'outline' as any}
                                size="sm"
                                onClick={() => togglePin(tile.id)}
                                className={isPinned ? 'bg-[hsl(var(--ui-brand))] hover:bg-[hsl(var(--ui-brand))]/90 text-white border-transparent' : ''}
                            >
                                {isPinned ? <PinOff className="w-4 h-4 mr-2" /> : <Pin className="w-4 h-4 mr-2" />}
                                {isPinned ? 'Desafixar' : 'Fixar'}
                            </Button>
                        </div>
                    );
                })}
            </div>

            <div className="pt-6 border-t border-[hsl(var(--ui-border))] flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className="bg-[hsl(var(--ui-brand))] hover:bg-[hsl(var(--ui-brand))]/90 text-white"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Check className="w-4 h-4 mr-2" />
                            Salvar Preferências
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
