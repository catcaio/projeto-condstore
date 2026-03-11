import { AlertBlock, SectionHeader, SurfacePanel } from '@/ui/foundation';
import type { LogisticsException } from '../mock-data';

export function LogisticsExceptions({ items }: { items: LogisticsException[] }) {
    return (
        <SurfacePanel>
            <SectionHeader
                title="Excecoes"
                description="Atraso, erro de calculo, ruptura, reenvio e redespacho em uma camada visivel."
            />
            <div className="mt-4 space-y-3">
                {items.length === 0 ? (
                    <AlertBlock
                        title="Sem excecao ativa"
                        description="Registro logistico dentro da trilha prevista, sem necessidade de resposta manual no momento."
                        tone="success"
                    />
                ) : (
                    items.map((item) => (
                        <AlertBlock
                            key={item.id}
                            title={item.title}
                            description={item.detail}
                            tone={item.severity === 'critical' ? 'critical' : 'warning'}
                            action={item.type}
                        />
                    ))
                )}
            </div>
        </SurfacePanel>
    );
}
