export type CatalogProduct = {
    id: string;
    name: string;
    keywords: string[];
    price: number;
    prontaEntrega: boolean;
    category: string;
    baseReply: string;
};

export const PRODUCTS: CatalogProduct[] = [
    {
        id: "espelho-convexo-60cm",
        name: "Espelho Convexo 60cm",
        keywords: ["espelho", "convexo", "60cm", "garagem", "saida", "seguranca"],
        price: 299.90,
        prontaEntrega: true,
        category: "seguranca",
        baseReply: "O Espelho 60cm (R$ 299,90) é ótimo para garagens. Confirma se o diâmetro de 60cm é o ideal para você? Me informe seu CEP para eu ver o frete.",
    },
    {
        id: "espelho-convexo-80cm",
        name: "Espelho Convexo 80cm",
        keywords: ["espelho", "convexo", "80cm", "garagem", "panoramico", "transito", "seguranca"],
        price: 379.90,
        prontaEntrega: true,
        category: "seguranca",
        baseReply: "O Espelho 80cm (R$ 379,90) oferece ótima visibilidade. Confirma se 80cm é o tamanho que você busca? Me informe seu CEP para calcularmos a entrega.",
    },
    {
        id: "protetor-coluna",
        name: "Protetor de Coluna de Garagem",
        keywords: ["protetor", "coluna", "garagem", "eva", "impacto", "quina", "seguranca"],
        price: 89.90,
        prontaEntrega: true,
        category: "seguranca",
        baseReply: "O Protetor de Coluna (R$ 89,90) é feito de EVA de alta densidade. Quantas unidades você precisa? Por favor, me informe seu CEP para cálculo do frete.",
    },
];

export function findProductByMessage(message: string): CatalogProduct | null {
    const normalized = message.toLowerCase();

    for (const product of PRODUCTS) {
        for (const keyword of product.keywords) {
            if (normalized.includes(keyword)) {
                return product;
            }
        }
    }

    return null;
}
