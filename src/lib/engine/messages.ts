import { FreightRanking } from '../../types/freight';

export function generateQuoteMessage(ranking: FreightRanking): string {
    if (!ranking.bestOption) {
        return 'Não foi possível encontrar opções de frete disponíveis no momento.';
    }

    const { bestOption, cheapestOption, fastestOption, options } = ranking;
    const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    let message = `🚚 *Cotação de Frete*\n\n`;
    message += `Confira as melhores opções para o seu pedido:\n\n`;

    // Best Option Highlight
    message += `🏆 *Melhor Opção (Recomendada)*\n`;
    message += `📦 ${bestOption.carrier} - ${bestOption.service}\n`;
    message += `💰 ${currency.format(bestOption.price)}\n`;
    message += `🕒 ${bestOption.deliveryDays} dias úteis\n\n`;

    // Provide alternatives if they are different from best
    const alternatives = [];

    if (cheapestOption && cheapestOption.id !== bestOption.id) {
        alternatives.push({
            label: '💲 *Mais Barato*',
            opt: cheapestOption
        });
    }

    if (fastestOption && fastestOption.id !== bestOption.id && fastestOption.id !== cheapestOption?.id) {
        alternatives.push({
            label: '⚡ *Mais Rápido*',
            opt: fastestOption
        });
    }

    if (alternatives.length > 0) {
        message += `*Outras Opções:*\n`;
        alternatives.forEach(alt => {
            message += `${alt.label}\n`;
            message += `📦 ${alt.opt.carrier} - ${alt.opt.service}\n`;
            message += `💰 ${currency.format(alt.opt.price)} | 🕒 ${alt.opt.deliveryDays} dias\n\n`;
        });
    }

    return message.trim();
}
