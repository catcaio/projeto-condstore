import type { CatalogProductMatch } from '@/modules/catalog/catalog.service';

function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatProductInquiryResponse(product: CatalogProductMatch): string {
    return `Temos o ${product.name} disponível.`;
}

export function formatFreightQuoteResponse(input: {
    cep: string;
    freightPrice: number;
    estimatedDays: number;
    carrier: string;
}): string {
    return `O frete estimado para CEP ${input.cep} fica em ${formatCurrency(input.freightPrice)} com prazo de ${input.estimatedDays} dias pela ${input.carrier}.`;
}

export function formatProductSuggestions(products: CatalogProductMatch[]): string {
    const lines = products.slice(0, 3).map((item, index) => `${index + 1}. ${item.name}`);
    return `Encontrei mais de uma opção:\n${lines.join('\n')}`;
}
