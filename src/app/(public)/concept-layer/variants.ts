export type ConceptVariantType = 'A' | 'B' | 'C';

export interface ConceptVariantData {
    headline: string;
    sub: string;
    cta: string;
}

export const CONCEPT_VARIANTS: Record<ConceptVariantType, ConceptVariantData> = {
    A: {
        headline: "Recupere carrinhos pelo WhatsApp e saiba exatamente de onde veio cada venda.",
        sub: "Um sistema operacional para e-commerce que vende, rastreia e organiza sua operação.",
        cta: "Começar agora"
    },
    B: {
        headline: "Recupere 15–30% dos carrinhos abandonados pelo WhatsApp.",
        sub: "Atribuição completa: campanha → conversa → venda.",
        cta: "Ver ROI na prática"
    },
    C: {
        headline: "Seu WhatsApp vira canal de venda com rastreio total.",
        sub: "Controle, automação e métricas — por loja, por campanha, por conversa.",
        cta: "Ativar na minha loja"
    }
};
