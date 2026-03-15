/**
 * Lojacond Catalog Seed Script
 *
 * Idempotent seed of real products from lojacondstore.com.br.
 * Uses deterministic IDs based on SHA-256(tenantId + sku) so re-runs
 * update existing rows instead of duplicating.
 */

import { createHash } from 'crypto';

export const LOJACOND_TENANT_ID = 'LOJACOND';

export interface SeedProduct {
    sku: string;
    name: string;
    price: number;      // BRL
    weight: number;     // kg
    width: number;      // cm
    height: number;     // cm
    length: number;     // cm
}

/** Deterministic product ID from tenant + sku */
export function makeProductId(tenantId: string, sku: string): string {
    const hash = createHash('sha256').update(tenantId + ':' + sku).digest('hex');
    // Format as UUID-like: 8-4-4-4-12
    return [hash.slice(0, 8), hash.slice(8, 12), hash.slice(12, 16), hash.slice(16, 20), hash.slice(20, 32)].join('-');
}

/**
 * Real Lojacond catalog — products sourced from lojacondstore.com.br
 * Weights and dimensions are realistic estimates for freight simulation.
 */
export const LOJACOND_CATALOG: SeedProduct[] = [
    // ─── Containers / Lixeiras ──────────────────────────────────────────
    { sku: 'LIX-CONT-240L', name: 'Lixeira Container 240L com Rodas Americanas – Contemar', price: 549.90, weight: 13.5, width: 58, height: 107, length: 73 },
    { sku: 'LIX-CONT-360L', name: 'Contentor de Resíduos C-360L – Contemar', price: 849.90, weight: 17.0, width: 62, height: 110, length: 85 },
    { sku: 'LIX-CONT-700L', name: 'Lixeira Contentor de Resíduos C-700L – Contemar', price: 1899.90, weight: 38.0, width: 77, height: 126, length: 137 },
    { sku: 'LIX-EUR-240L', name: 'Lixeira Conteiner Europeu 240L – Bralimpia', price: 579.90, weight: 14.0, width: 58, height: 107, length: 73 },
    { sku: 'LIX-PED-30L', name: 'Lixeira com Pedal 30L – Bralimpia', price: 189.90, weight: 3.2, width: 29, height: 60, length: 37 },
    { sku: 'LIX-PED-80L', name: 'Lixeira com Pedal 80L – Bralimpia', price: 349.90, weight: 6.5, width: 42, height: 75, length: 50 },
    { sku: 'LIX-INOX-JASPE', name: 'Lixeira com Pedal Inox Quadrada Jaspe – Mor', price: 259.90, weight: 4.8, width: 27, height: 62, length: 27 },
    { sku: 'LIX-COL-370L', name: 'Carrinho Coletor para Condomínio Preto 370L – JSN', price: 990.00, weight: 22.0, width: 64, height: 100, length: 90 },
    { sku: 'KIT-PAPELEIRA-50L', name: 'Kit Lixeiras Papeleira 50L c/ Suporte Tipo Poste – Belosch', price: 499.90, weight: 8.5, width: 42, height: 90, length: 42 },
    { sku: 'KIT-COCOPET-50L', name: 'Kit CocôPet Cão – Lixeira Papeleira Belosch 50L', price: 529.90, weight: 9.0, width: 42, height: 90, length: 42 },
    { sku: 'KIT-COCOPET-40L', name: 'Kit Cocô PetCão Lixeira Papeleira 40L – JSN', price: 449.90, weight: 7.5, width: 38, height: 85, length: 38 },

    // ─── Carrinhos de Compras ───────────────────────────────────────────
    { sku: 'CARR-140L', name: 'Carrinho de Compra para Condomínio 140L – Roda Grande', price: 699.90, weight: 12.0, width: 54, height: 100, length: 60 },
    { sku: 'CARR-215L', name: 'Carrinho de Compra para Condomínio 215L – Roda de Borracha', price: 849.90, weight: 15.0, width: 56, height: 102, length: 70 },
    { sku: 'CARR-215L-REP', name: 'Carrinho de Compras para Condomínio com Repartição Lateral 215L', price: 899.90, weight: 16.0, width: 56, height: 102, length: 70 },
    { sku: 'CARR-ECOFLEX-25L', name: 'Carrinho De Compras Ecoflex Duplo Cesto 25L – Siris', price: 359.90, weight: 6.0, width: 43, height: 95, length: 50 },
    { sku: 'CARR-ABAST-120L', name: 'Carrinho Abastecedor Siris Duplo 120L', price: 599.90, weight: 10.0, width: 50, height: 98, length: 55 },
    { sku: 'TRAVA-CARR-ELEC', name: 'Trava para Carrinho de Compras – Eletrônica', price: 189.90, weight: 0.8, width: 12, height: 15, length: 8 },
    { sku: 'CART-PARKLOCK', name: 'Cartão para Trava de Carrinho de Compras – ParkLock', price: 9.90, weight: 0.05, width: 8.5, height: 0.1, length: 5.4 },
    { sku: 'TRAVA-PARKLOCK', name: 'Trava Para Carrinho De Compras – ParkLock', price: 159.90, weight: 0.7, width: 12, height: 14, length: 8 },

    // ─── Caixas de Correio ──────────────────────────────────────────────
    { sku: 'CX-COLMEIA-CHUMB', name: 'Caixa de Correio Tipo Colmeia para Chumbar', price: 49.90, weight: 0.8, width: 22, height: 35, length: 12 },
    { sku: 'CX-INOX-FRONT', name: 'Caixa de Correio para Chumbar Inox – Acesso Frontal', price: 69.90, weight: 1.0, width: 22, height: 35, length: 14 },
    { sku: 'CX-INOX-COLMEIA', name: 'Caixa de Correio Inox Tipo Colmeia Para Condomínios – Revistas', price: 89.90, weight: 1.2, width: 25, height: 38, length: 15 },
    { sku: 'CX-ALU-COLMEIA', name: 'Caixa de Correio Alumínio Tipo Colmeia Para Condomínios – Revistas', price: 59.90, weight: 0.6, width: 25, height: 38, length: 15 },
    { sku: 'CX-ALU-GRADE', name: 'Caixa de Correio de Alumínio Tipo Grade – sem chave', price: 39.90, weight: 0.5, width: 20, height: 30, length: 12 },
    { sku: 'CX-L-MURO-INOX', name: 'Caixa de Correio Tipo L Para Muro Inox', price: 79.90, weight: 1.1, width: 25, height: 40, length: 18 },

    // ─── Bicicletários ──────────────────────────────────────────────────
    { sku: 'BIC-U-CHUMB', name: 'Bicicletário U Invertido de Chumbar – Altmayer AL236C', price: 289.90, weight: 5.5, width: 10, height: 90, length: 80 },
    { sku: 'BIC-U-PARAF', name: 'Bicicletário U Invertido de Parafusar – Altmayer AL236', price: 279.90, weight: 5.3, width: 10, height: 90, length: 80 },
    { sku: 'BIC-STD-5V', name: 'Bicicletário Standard 1-5 vagas – Altmayer', price: 399.90, weight: 8.0, width: 68, height: 45, length: 130 },
    { sku: 'BIC-CHAO-7V', name: 'Bicicletário de Chão Leve 7 vagas – Altmayer AL226', price: 449.90, weight: 10.0, width: 100, height: 45, length: 180 },
    { sku: 'BIC-VERT-AL09', name: 'Bicicletário Vertical Individual de Parede – Altmayer AL09', price: 129.90, weight: 2.0, width: 15, height: 50, length: 35 },
    { sku: 'BIC-V-2V', name: 'Bicicletário de Chão 2 Vagas em V – Altmayer AL175', price: 199.90, weight: 3.5, width: 30, height: 35, length: 60 },

    // ─── Limpeza / Mops ─────────────────────────────────────────────────
    { sku: 'MOP-PO-40CM', name: 'Kit Mop Pó 40cm Eletrostático Euro Cabo Alumínio Azul', price: 89.90, weight: 0.8, width: 15, height: 140, length: 42 },
    { sku: 'MOP-PO-60CM', name: 'Kit Mop Pó 60cm Eletrostático Euro Cabo Alumínio Azul', price: 109.90, weight: 1.0, width: 15, height: 140, length: 62 },
    { sku: 'MOP-PO-80CM', name: 'Kit Mop Pó 80cm Eletrostático Euro Cabo Alumínio Azul', price: 129.90, weight: 1.2, width: 15, height: 140, length: 82 },
    { sku: 'MOP-PO-120CM', name: 'Kit Mop Pó 120cm Eletrostático Euro Cabo Alumínio Azul', price: 159.90, weight: 1.5, width: 15, height: 140, length: 122 },
    { sku: 'RODO-VIDRO-25CM', name: 'Rodo Combinado Limpa Vidro 25cm – Bralimpia', price: 49.90, weight: 0.4, width: 8, height: 35, length: 27 },
    { sku: 'RODO-VIDRO-35CM', name: 'Rodo Combinado Limpa Vidro 35cm – Bralimpia', price: 59.90, weight: 0.5, width: 8, height: 35, length: 37 },
    { sku: 'RODO-VIDRO-45CM', name: 'Rodo Combinado Limpa Vidro 45cm – Bralimpia', price: 69.90, weight: 0.6, width: 8, height: 35, length: 47 },

    // ─── Acessórios para Condomínio ─────────────────────────────────────
    { sku: 'ESP-CONV-40CM', name: 'Espelho Convexo 40cm Borda Borracha – Vision', price: 129.90, weight: 1.5, width: 42, height: 42, length: 12 },
    { sku: 'ESP-CONV-50CM', name: 'Espelho Convexo 50cm Borda Borracha – Vision', price: 169.90, weight: 2.0, width: 52, height: 52, length: 14 },
    { sku: 'CANT-ESTAC-80', name: 'Kit com 2 Cantoneiras Autocolante Para Estacionamento 80cm', price: 79.90, weight: 1.0, width: 15, height: 80, length: 5 },
    { sku: 'EMB-GCH-INOX', name: 'Embalador Guarda-chuva Inox Quadrado Resistente', price: 299.90, weight: 4.5, width: 25, height: 80, length: 25 },
    { sku: 'EMB-GCH-CLEAN', name: 'Embalador de Guarda-chuvas Clean Inox', price: 249.90, weight: 3.8, width: 22, height: 75, length: 22 },
    { sku: 'PLACA-CAVALETE', name: 'Placa de Sinalização Tipo Cavalete – Bralimpia', price: 69.90, weight: 1.5, width: 30, height: 60, length: 30 },
    { sku: 'ARM-48-CHAVES', name: 'Armário 48 Chaves MDF – Acrimet', price: 199.90, weight: 3.0, width: 25, height: 38, length: 6 },
];

/**
 * Validate that every product has required fields for freight/quote operations.
 */
export function validateCatalog(catalog: SeedProduct[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const skus = new Set<string>();

    for (const p of catalog) {
        if (!p.sku) errors.push(`Missing SKU for product "${p.name}"`);
        if (!p.name) errors.push(`Missing name for SKU "${p.sku}"`);
        if (p.price <= 0) errors.push(`Invalid price for "${p.sku}": ${p.price}`);
        if (p.weight <= 0) errors.push(`Invalid weight for "${p.sku}": ${p.weight}`);
        if (p.width <= 0 || p.height <= 0 || p.length <= 0) {
            errors.push(`Invalid dimensions for "${p.sku}": ${p.width}x${p.height}x${p.length}`);
        }
        if (skus.has(p.sku)) errors.push(`Duplicate SKU: "${p.sku}"`);
        skus.add(p.sku);
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Build insert-ready rows from the catalog.
 */
export function buildProductRows(tenantId: string, catalog: SeedProduct[]) {
    return catalog.map(p => ({
        id: makeProductId(tenantId, p.sku),
        tenantId,
        name: p.name,
        sku: p.sku,
        price: p.price.toFixed(2),
        weight: p.weight.toFixed(3),
        width: p.width.toFixed(2),
        height: p.height.toFixed(2),
        length: p.length.toFixed(2),
    }));
}
