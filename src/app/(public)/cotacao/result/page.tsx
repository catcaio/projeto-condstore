import QuoteResultsClient from '@/ui/components/public/cotacao/QuoteResultsClient';
import { redirect } from 'next/navigation';

export default async function CotacaoResultPage({
    searchParams,
}: {
    searchParams: Promise<{ intentId?: string }>;
}) {
    const params = await searchParams;
    const intentId = params.intentId;

    if (!intentId) {
        redirect('/cotacao');
    }

    return (
        <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-start py-10 px-4">
            <div className="max-w-2xl w-full">
                <a
                    href="/cotacao"
                    className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 inline-block"
                >
                    ← Nova cotação
                </a>
                <QuoteResultsClient intentId={intentId} />
            </div>
        </div>
    );
}
