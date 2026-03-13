import type { CatalogProductLookup } from '@/modules/catalog/catalog.service';

type ProductLike = Pick<CatalogProductLookup, 'name' | 'sku' | 'basePrice' | 'price'>;

function formatCurrency(value: number): string {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function resolvePrice(product: ProductLike): number {
    return product.basePrice > 0 ? product.basePrice : product.price;
}

function formatProductLabel(product: ProductLike): string {
    const parts = [product.name];

    if (product.sku) {
        parts.push(`SKU ${product.sku}`);
    }

    const price = resolvePrice(product);
    if (price > 0) {
        parts.push(formatCurrency(price));
    }

    return parts.join(' | ');
}

export function formatProductInquiryResponse(product: CatalogProductLookup): string {
    const price = resolvePrice(product);
    const priceLine = price > 0 ? ` Valor base: ${formatCurrency(price)}.` : '';
    const skuLine = product.sku ? ` SKU: ${product.sku}.` : '';

    return `Temos ${product.name} disponível.${skuLine}${priceLine}`.replace(/\s+/g, ' ').trim();
}

export function formatProductSuggestionsResponse(products: CatalogProductLookup[]): string {
    if (products.length === 0) {
        return 'Não encontrei um produto com esse nome no momento. Se quiser, me diga o SKU ou descreva o item com mais detalhe.';
    }

    const lines = products
        .slice(0, 3)
        .map((product, index) => `${index + 1}. ${formatProductLabel(product)}`);

    return `Encontrei estas opções:\n${lines.join('\n')}\n\nMe confirme o modelo desejado e, se quiser o frete, envie também o CEP.`;
}

export function formatProductQueryResponse(products: CatalogProductLookup[]): string {
    if (products.length === 1) {
        return `${formatProductInquiryResponse(products[0])}\n\nSe quiser, eu também calculo o frete com o CEP.`;
    }

    return formatProductSuggestionsResponse(products);
}

export function formatFreightQuoteResponse(params: {
    destinationZip: string;
    freightPrice: number;
    estimatedDays: number;
    carrier: string;
}): string {
    return `O frete estimado para CEP ${params.destinationZip} fica em ${formatCurrency(params.freightPrice)} com prazo de ${params.estimatedDays} dias pela ${params.carrier}.`;
}

export function formatFreightSimulationResponse(
    destinationZip: string,
    carrier: string,
    deliveryDays: number,
    price: number,
): string {
    return formatFreightQuoteResponse({
        destinationZip,
        freightPrice: price,
        estimatedDays: deliveryDays,
        carrier,
    });
}
