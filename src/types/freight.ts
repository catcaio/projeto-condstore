export type FreightSource = 'melhor_envio' | 'tabela' | 'manual';

export interface FreightOption {
    id: string;
    carrier: string;
    service: string;
    price: number;
    deliveryDays: number;
    source: FreightSource;
    economics?: EconomicMetrics;
}

export interface EconomicContext {
    priceWeight: number;
    timeWeight: number;
    marginWeight: number;
    productCost: number;
    sellingPrice: number;
    operationalCost?: number;
}

export interface EconomicMetrics {
    netRevenue: number;
    profit: number;
    marginPercent: number;
}

export interface FreightRanking {
    options: FreightOption[];
    bestOption?: FreightOption;
    cheapestOption?: FreightOption;
    fastestOption?: FreightOption;
    bestCostBenefit?: FreightOption;
}

export interface Simulation {
    id: string;
    date: string;
    input: {
        cep: string;
        weight: number;
        quantity: number;
    };
    chosenOption?: FreightOption;
    ranking: FreightRanking;
}
