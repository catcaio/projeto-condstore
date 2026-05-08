import { PageContainer } from '@/ui/site/page-container';
import { PageSection } from '@/ui/site/page-section';

export const metadata = {
    title: 'Política de Privacidade — CONDSTORE OS',
    description: 'Política de privacidade e proteção de dados do CONDSTORE OS.',
};

export default function PrivacidadePage() {
    return (
        <PageSection spacing="lg">
            <PageContainer narrow>
                <h1 className="text-3xl md:text-4xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight mb-8">
                    Política de Privacidade
                </h1>

                <div className="prose prose-sm max-w-none text-[hsl(var(--ui-text-muted))] space-y-6">
                    <p className="text-base leading-relaxed">
                        Última atualização: Março de 2026
                    </p>

                    <h2 className="text-lg font-bold text-[hsl(var(--ui-text))] mt-8">1. Dados coletados</h2>
                    <p>
                        Coletamos apenas os dados necessários para operação da plataforma: nome, e-mail corporativo,
                        telefone comercial e dados de frete (CEP, peso, dimensões). Dados sensíveis como e-mail e
                        telefone são criptografados (AES-256-GCM) ou hasheados (SHA-256) antes do armazenamento.
                    </p>

                    <h2 className="text-lg font-bold text-[hsl(var(--ui-text))] mt-8">2. Uso dos dados</h2>
                    <p>
                        Os dados são utilizados exclusivamente para: operação da plataforma, geração de cotações de frete,
                        gestão de pedidos, atendimento via WhatsApp e métricas operacionais. Não vendemos, compartilhamos
                        ou transferimos dados pessoais a terceiros fora do escopo operacional.
                    </p>

                    <h2 className="text-lg font-bold text-[hsl(var(--ui-text))] mt-8">3. Segurança</h2>
                    <p>
                        Utilizamos arquitetura multi-tenant com isolamento por tenant, criptografia em trânsito (TLS 1.3)
                        e em repouso, controle de acesso baseado em papéis (RBAC), audit trail completo e detecção
                        automática de anomalias.
                    </p>

                    <h2 className="text-lg font-bold text-[hsl(var(--ui-text))] mt-8">4. Retenção</h2>
                    <p>
                        Dados operacionais são retidos pelo período necessário à execução do serviço. Dados de sessão
                        expiram após 30 minutos de inatividade. O titular pode solicitar a exclusão de seus dados a
                        qualquer momento.
                    </p>

                    <h2 className="text-lg font-bold text-[hsl(var(--ui-text))] mt-8">5. Direitos do titular</h2>
                    <p>
                        Conforme a LGPD (Lei 13.709/2018), você tem direito a: acesso, correção, exclusão, portabilidade
                        e revogação de consentimento. Para exercer seus direitos, entre em contato pelo e-mail
                        privacidade@condstore.com.br.
                    </p>

                    <h2 className="text-lg font-bold text-[hsl(var(--ui-text))] mt-8">6. Contato</h2>
                    <p>
                        CONDSTORE TECNOLOGIA LTDA — CNPJ: 29.578.008/0001-11<br />
                        E-mail: privacidade@condstore.com.br
                    </p>
                </div>
            </PageContainer>
        </PageSection>
    );
}
