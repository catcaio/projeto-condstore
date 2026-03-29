import { getGitEvolutionData } from '@/lib/git-evolution';
import ShowcaseClient from './ShowcaseClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visão Geral do Produto | CONDSTORE',
  description: 'Conheça o escopo e a evolução tecnológica do hub empresarial logístico e operacional CONDSTORE.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ShowcasePage() {
  const evolutionData = await getGitEvolutionData();

  const frontsStatus = [
    {
      id: 'auth',
      name: 'Auth & Security',
      description: 'Proteção de rotas, RBAC e gestão de sessão',
      status: 'Estável',
      percentage: 95,
      reasoning: 'Middleware e guardrails fundamentais (src/infra/security, middleware) com coverage ativado.',
    },
    {
      id: 'cockpit',
      name: 'Cockpit & CRM',
      description: 'Painel central de gestão de conversas e clientes',
      status: 'Em Produção',
      percentage: 85,
      reasoning: 'Infraestrutura de conversas estabelecida (src/modules/cockpit) e pipeline operante.',
    },
    {
      id: 'tenant',
      name: 'Tenant & Admin',
      description: 'Isolamento de dados e gestão multilocatário',
      status: 'Protegido',
      percentage: 90,
      reasoning: 'Implementado com proteção de dados no nível do schema e validado por scripts E2E.',
    },
    {
      id: 'freight',
      name: 'Logística (Freight)',
      description: 'Automação de cotas, painel logístico e tracking',
      status: 'Evolução',
      percentage: 75,
      reasoning: 'Lógica transacional na API ativa (src/app/api/freight), pendências de refinamento do painel.',
    },
    {
      id: 'observability',
      name: 'Observability & Core',
      description: 'Monitoramento, Evals e Performance',
      status: 'Avançado',
      percentage: 80,
      reasoning: 'Sentry e tracking de infra implantados e com métricas de uso provadas.',
    },
    {
      id: 'integration',
      name: 'Webhooks & Integrações',
      description: 'WhatsApp, Stripe e serviços terceiros',
      status: 'Integração',
      percentage: 65,
      reasoning: 'Integrações ativas via controllers (webhook) mas necessitando cobertura maior em edge-cases.',
    }
  ];

  return (
    <ShowcaseClient 
      evolutionData={evolutionData} 
      frontsStatus={frontsStatus} 
    />
  );
}
