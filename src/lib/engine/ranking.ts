import { FreightOption, FreightRanking, EconomicContext } from '../../types/freight';

export interface RankingStrategy {
    priceWeight: number;
    timeWeight: number;
    marginWeight?: number; // Optional for backward compatibility/simpler strategies
}

export const DEFAULT_STRATEGY: RankingStrategy = {
    priceWeight: 0.6,
    timeWeight: 0.4,
    marginWeight: 0,
};

export function calculateRanking(
    options: FreightOption[],
    strategy: RankingStrategy = DEFAULT_STRATEGY,
    context?: EconomicContext
): FreightRanking {
    if (!options.length) {
        return { options: [] };
    }

    // 0. Calculate Economics if Context is provided
    let workingOptions = [...options];

    if (context) {
        workingOptions = workingOptions.map((opt) => {
            const operationalCost = context.operationalCost || 0;
            const netRevenue = context.sellingPrice - opt.price;
            const profit = netRevenue - context.productCost - operationalCost;
            const marginPercent = context.sellingPrice > 0
                ? (profit / context.sellingPrice) * 100
                : 0;

            return {
                ...opt,
                economics: {
                    netRevenue,
                    profit,
                    marginPercent
                }
            };
        });
    }

    // 1. Identify extremes for normalization
    const sortedByPrice = [...workingOptions].sort((a, b) => a.price - b.price);
    const sortedByTime = [...workingOptions].sort((a, b) => a.deliveryDays - b.deliveryDays);

    const cheapest = sortedByPrice[0];
    const fastest = sortedByTime[0];

    // Identify best margin if economics exist
    let bestMarginOption: FreightOption | undefined;
    if (context) {
        const sortedByMargin = [...workingOptions].sort((a, b) =>
            (b.economics?.marginPercent || 0) - (a.economics?.marginPercent || 0)
        );
        bestMarginOption = sortedByMargin[0];
    }

    // 2. Calculate Score (Lower is better)
    const minPrice = cheapest.price;
    const minTime = fastest.deliveryDays;

    // For margin, we want higher to be better. 
    // To fit into "lower score is better", we invert it: 
    // Score = 1 - (CurrentMargin / BestMargin)
    // BestMargin gets score 0 (good), WorseMargin gets score -> 1 (bad)
    const maxMargin = bestMarginOption?.economics?.marginPercent || 1; // Avoid div/0

    const scoredOptions = workingOptions.map((opt) => {
        const priceScore = (opt.price / minPrice) * strategy.priceWeight;
        const timeScore = (opt.deliveryDays / minTime) * strategy.timeWeight;

        let marginScore = 0;
        if (context && strategy.marginWeight && opt.economics) {
            // Normalized inverse margin
            const relativeMargin = opt.economics.marginPercent / maxMargin;
            // distinct from price/time: higher margin is better, so we subtract
            // OR we define "distance from perfect margin"
            // Let's use: (1 - relativeMargin) * weight
            // If relativeMargin is 1 (max), score adds 0.
            // If relativeMargin is 0.5, score adds 0.5 * weight.
            marginScore = (1 - relativeMargin) * strategy.marginWeight;
        }

        return {
            ...opt,
            score: priceScore + timeScore + marginScore,
        };
    });

    // 3. Sort by Score
    const ranked = scoredOptions.sort((a, b) => (a as any).score - (b as any).score);
    const bestOption = ranked[0];

    return {
        options: ranked,
        bestOption,
        cheapestOption: cheapest,
        fastestOption: fastest,
        bestCostBenefit: bestOption,
    };
}
