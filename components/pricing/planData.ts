export type PlanFeature = {
    name: string
    included: boolean
}

export type PricingPlan = {
    id: string
    name: string
    price: string
    description: string
    features: PlanFeature[]
    extraDetails: string[]
    recommended?: boolean
    oldPrice?: string
    savingsBadge?: string
    stripePriceId: string
}

export const planData: PricingPlan[] = [
    {
        id: "basic",
        stripePriceId: "price_basic_placeholder",
        name: "Basic",
        price: "R$ 49/mês",
        description: "Ideal para começar a gerenciar suas integrações.",
        features: [
            { name: "Até 100 pedidos/mês", included: true },
            { name: "Suporte por email", included: true },
            { name: "Painel de controle básico", included: true },
            { name: "Automações avançadas", included: false },
            { name: "Gerente de conta", included: false },
        ],
        extraDetails: [
            "Integração com 1 loja",
            "Relatórios mensais de uso",
            "Acesso ao histórico de 30 dias",
        ],
    },
    {
        id: "premium",
        stripePriceId: "price_premium_placeholder",
        name: "Premium",
        price: "R$ 149/mês",
        oldPrice: "R$ 179/mês",
        savingsBadge: "Economize 20%",
        description: "Para quem precisa de alta performance e automações.",
        features: [
            { name: "Pedidos ilimitados", included: true },
            { name: "Suporte prioritário 24/7", included: true },
            { name: "Painel de controle completo", included: true },
            { name: "Automações avançadas", included: true },
            { name: "Gerente de conta", included: false },
        ],
        extraDetails: [
            "Múltiplas lojas (até 5)",
            "Relatórios diários exportáveis",
            "Webhook para sistemas externos",
            "Histórico ilimitado",
        ],
        recommended: true,
    },
    {
        id: "pro",
        stripePriceId: "price_pro_placeholder",
        name: "Pro",
        price: "R$ 299/mês",
        description: "Solução enterprise com gerente exclusivo.",
        features: [
            { name: "Pedidos ilimitados", included: true },
            { name: "Suporte via WhatsApp", included: true },
            { name: "Painel White Label", included: true },
            { name: "Automações personalizadas", included: true },
            { name: "Gerente de conta", included: true },
        ],
        extraDetails: [
            "Integração com lojas ilimitadas",
            "SLA garantido de 99.9%",
            "API de alta disponibilidade",
            "Onboarding dedicado",
        ],
    },
]
