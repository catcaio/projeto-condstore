import { PageContainer } from '@/ui/site/page-container';
import { PageSection } from '@/ui/site/page-section';

export const metadata = {
    title: 'Termos de Uso — CONDSTORE OS',
    description: 'Termos de uso e condições de serviço do CONDSTORE OS.',
};

export default function TermosPage() {
    return (
        <PageSection spacing="lg">
            <PageContainer narrow>
                <h1 className="text-3xl md:text-4xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight mb-8">
                    Termos de Uso
                </h1>

                <div className="prose prose-sm max-w-none text-[hsl(var(--ui-text-muted))] space-y-6">
                    <p className="text-base leading-relaxed">
                        Última atualização: Março de 2026
                    </p>

                    <h2 className="text-lg font-bold text-[hsl(var(--ui-text))] mt-8">1. Aceitação</h2>
                    <p>
                        Ao utilizar o CONDSTORE OS, você concorda com estes termos. Se não concordar, não utilize a plataforma.
                        Estes termos se aplicam a todos os usuários, incluindo administradores, operadores e clientes finais.
                    </p>

                    <h2 className="text-lg font-bold text-[hsl(var(--ui-text))] mt-8">2. Serviço</h2>
                    <p>
                        O CONDSTORE OS é uma plataforma SaaS B2B de infraestrutura operacional para logística. Oferecemos
                        gestão de frete, CRM, atendimento via WhatsApp, inteligência artificial e dashboards operacionais
                        em ambiente multi-tenant.
                    </p>

                    <h2 className="text-lg font-bold text-[hsl(var(--ui-text))] mt-8">3. Conta e acesso</h2>
                    <p>
                        Cada organização recebe um tenant isolado. O administrador é responsável por gerenciar os acessos
                        de sua equipe. Credenciais são pessoais e intransferíveis. Compartilhamento de credenciais viola
                        estes termos.
                    </p>

                    <h2 className="text-lg font-bold text-[hsl(var(--ui-text))] mt-8">4. Uso aceitável</h2>
                    <p>
                        A plataforma deve ser utilizada apenas para fins operacionais legítimos. É proibido: tentativa de
                        acesso a dados de outros tenants, engenharia reversa, scraping, uso abusivo de APIs e qualquer
                        atividade que possa comprometer a segurança ou disponibilidade do serviço.
                    </p>

                    <h2 className="text-lg font-bold text-[hsl(var(--ui-text))] mt-8">5. Disponibilidade</h2>
                    <p>
                        Buscamos manter o serviço disponível 24/7, mas não garantimos disponibilidade ininterrupta.
                        Manutenções programadas serão comunicadas com antecedência. O SLA contratual varia por plano.
                    </p>

                    <h2 className="text-lg font-bold text-[hsl(var(--ui-text))] mt-8">6. Propriedade intelectual</h2>
                    <p>
                        Todo o código, design e conteúdo do CONDSTORE OS são propriedade da CONDSTORE TECNOLOGIA LTDA.
                        Os dados inseridos pelo cliente permanecem de propriedade do cliente.
                    </p>

                    <h2 className="text-lg font-bold text-[hsl(var(--ui-text))] mt-8">7. Contato</h2>
                    <p>
                        CONDSTORE TECNOLOGIA LTDA — CNPJ: 29.578.008/0001-11<br />
                        E-mail: contato@condstore.com.br
                    </p>
                </div>
            </PageContainer>
        </PageSection>
    );
}
