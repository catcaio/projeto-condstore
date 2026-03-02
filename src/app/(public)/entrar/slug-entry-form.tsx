'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, TextField, Button } from '@/ui/components';
import { Store, Shield } from 'lucide-react';

interface SlugEntryFormProps {
    title: string;
    description: string;
    targetPathPattern: string; // example: "/t/[slug]/entrar"
    type: 'employee' | 'manager';
}

export function SlugEntryForm({ title, description, targetPathPattern, type }: SlugEntryFormProps) {
    const router = useRouter();
    const [slug, setSlug] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!slug.trim()) return;

        setLoading(true);
        const normalizedSlug = slug.trim().toLowerCase().replace(/\s+/g, '-');
        const href = targetPathPattern.replace('[slug]', normalizedSlug);

        router.push(href);
    };

    return (
        <div className="w-full max-w-md">
            <Card variant="elevated" className="overflow-hidden">
                <CardHeader
                    className="pb-4"
                    heading={
                        <div className="flex items-center gap-3">
                            <span className={`grid h-10 w-10 place-items-center rounded-2xl ${type === 'manager'
                                ? 'bg-[hsl(var(--ui-success)/0.12)] text-[hsl(var(--ui-success))]'
                                : 'bg-[hsl(var(--ui-accent-purple)/0.12)] text-[hsl(var(--ui-accent-purple))]'
                                }`}>
                                {type === 'manager' ? <Shield className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                            </span>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight text-[hsl(var(--ui-text))]">
                                    {title}
                                </h1>
                            </div>
                        </div>
                    }
                />

                <CardContent>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))] mb-6">
                        {description}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <TextField
                            id="slug"
                            label="Identificador (Slug)"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="ex: lojacond"
                            required
                            autoFocus
                            autoComplete="off"
                        />

                        <Button
                            type="submit"
                            disabled={loading || !slug.trim()}
                            className="w-full mt-2"
                            size="lg"
                            variant={type === 'manager' ? 'primary' : 'secondary'}
                        >
                            {loading ? 'Redirecionando...' : 'Continuar'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
