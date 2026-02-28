import { RetrievedChunk } from './retrieval.service';

export interface AnswerBuilderParams {
    question: string;
    retrievedChunks: RetrievedChunk[];
    confidence: number;
    threshold?: number;
}

export function buildGroundedAnswer({
    retrievedChunks,
    confidence,
    threshold = 0.78
}: AnswerBuilderParams): string {
    if (confidence < threshold || retrievedChunks.length === 0) {
        return "Não encontrei essa informação nos seus documentos. Deseja que eu pesquise na web ou adicione um novo arquivo?";
    }

    const citations = retrievedChunks.map(c => {
        const pageLabel = c.pageNumber !== null ? `, pág ${c.pageNumber}` : '';
        return `[${c.documentTitle}${pageLabel}]:\n${c.content}`;
    }).join('\n\n--- \n\n');

    return `Baseado nos seus documentos, aqui estão os trechos mais relevantes extraídos:\n\n${citations}\n\n(Recomendação: Passe este contexto ancorado para a LLM gerar a resposta fluída.)`;
}
