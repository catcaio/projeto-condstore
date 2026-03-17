import { Metadata } from 'next';
import { Suspense } from 'react';
import { SignupForm } from './signup-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Criar conta — CondStore OS',
    description: 'Crie sua conta no CondStore OS.',
};

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen" />}>
            <SignupForm />
        </Suspense>
    );
}
