import { headers } from 'next/headers';
import { SettingsPage, SettingsSection } from '@/ui/settings';
import { Badge } from '@/ui/components';
import { getSystemStatus, SystemStatusPayload } from './queries';
import { Database, ShieldAlert, Cpu, MessageCircle, Cloud, Activity, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { DomineProcessorCard } from './DomineProcessorCard';

export const revalidate = 60; // SSR cache

function StatusBadge({ status }: { status: 'ok' | 'degraded' | 'down' | string }) {
    if (status === 'ok' || status === 'unlocked') return <Badge variant="success">OK</Badge>;
    if (status === 'degraded' || status === 'degraded_preemptive') return <Badge variant="muted">ATENÇÃO</Badge>;
    if (status === 'down' || status === 'locked') return <Badge variant="danger">FALHA</Badge>;
    return <Badge>{status}</Badge>;
}

export default async function SystemStatusPage() {
    const headersList = await headers();
    const tenantId = headersList.get('x-auth-tenant-id');
    const role = headersList.get('x-auth-role') || 'viewer';

    if (!tenantId) return <div>Sem contexto</div>;

    const data: SystemStatusPayload = await getSystemStatus(tenantId, role);
    const date = new Date(data.lastUpdatedAt).toLocaleTimeString('pt-BR');

    return (
        <SettingsPage
            title="SISTEMA: CENTRO DE COMANDO"
            description="Visão em tempo real da saúde operacional do seu hub"
            headerAction={<span className="text-xs text-[hsl(var(--ui-text-muted))]" role="status" aria-live="polite">Atualizado às {date}</span>}
        >
            <SettingsSection title="Governança & FinOps" description="Saúde dos limites de sua conta">
                <div className="flex items-center justify-between p-4 bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))]">
                    <div className="flex gap-4">
                        <ShieldAlert className="w-5 h-5 text-[hsl(var(--ui-text-muted))]" />
                        <div>
                            <p className="font-medium text-sm text-[hsl(var(--ui-text))]">Estado da Conta: {data.finops.state}</p>
                            <p className="text-xs text-[hsl(var(--ui-text-muted))]">Consumo: {data.finops.percentUsed}% | {data.finops.limitsSummary}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <StatusBadge status={data.finops.state} />
                        {(data.finops.state === 'locked' || data.finops.state === 'degraded') && (
                            <Link href="/cockpit/finops/alerts" className="text-xs font-semibold text-[hsl(var(--ui-text))] hover:underline flex items-center gap-1">
                                Gerenciar Billing <ArrowRight className="w-3 h-3" />
                            </Link>
                        )}
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Motor de Conhecimento (Inbox)" description="Estatísticas de indexação vetorial e documentos">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] flex justify-between items-center">
                        <div className="flex gap-3">
                            <Database className="w-5 h-5 text-[hsl(var(--ui-text-muted))]" />
                            <div>
                                <p className="font-medium text-sm text-[hsl(var(--ui-text))]">Documentos Armazenados: {data.knowledge.docsTotal}</p>
                                <p className="text-xs text-[hsl(var(--ui-text-muted))]">Índices Prontos: {data.knowledge.readyIndexedTotal} | Falhas: {data.knowledge.failedTotal}</p>
                            </div>
                        </div>
                        <Link href="/cockpit/knowledge" className="text-xs text-[hsl(var(--ui-accent-blue))] font-medium hover:underline">Ver Inbox</Link>
                    </div>
                    <div className="p-4 bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] flex justify-between items-center">
                        <div className="flex gap-3">
                            <Cloud className="w-5 h-5 text-[hsl(var(--ui-text-muted))]" />
                            <div>
                                <p className="font-medium text-sm text-[hsl(var(--ui-text))]">Filas & Sync (Redis)</p>
                                <p className="text-xs text-[hsl(var(--ui-text-muted))]">Ingest Queue: {data.knowledge.ingestQueueDepth} | Sync Queue: {data.knowledge.syncQueueDepth}</p>
                            </div>
                        </div>
                        <Link href="/cockpit/knowledge/collections" className="text-xs text-[hsl(var(--ui-accent-blue))] font-medium hover:underline">Políticas</Link>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Inteligência Artificial (IA)" description="Status das respostas do Frank">
                <div className="p-4 bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] flex flex-col gap-2">
                    <div className="flex justify-between items-center pb-2 border-b border-[hsl(var(--ui-border))]">
                        <span className="text-sm font-medium flex items-center gap-2"><Cpu className="w-4 h-4" /> Raciocínio (LLM)</span>
                        <Badge variant={data.ai.providerEnabled ? 'success' : 'danger'}>{data.ai.providerEnabled ? 'Ativo' : 'Desativado'}</Badge>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-[hsl(var(--ui-border))]">
                        <span className="text-sm font-medium flex items-center gap-2"><Database className="w-4 h-4" /> Vector Engine Nátivo (TiDB)</span>
                        <Badge variant={data.ai.vectorNativeEnabled ? 'success' : 'muted'}>{data.ai.vectorNativeEnabled ? 'Hardware Acelerado' : 'Fallback JS (Cosine)'}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs text-[hsl(var(--ui-text-muted))]">
                        <span>Último Embedding Gerado: {data.ai.lastEmbeddingAt ? new Date(data.ai.lastEmbeddingAt).toLocaleString('pt-BR') : 'Nunca'}</span>
                        <span>Última Pergunta Feita: {data.ai.lastAskAt ? new Date(data.ai.lastAskAt).toLocaleString('pt-BR') : 'Nunca'}</span>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Infraestrutura Core" description="Status de latência e comunicação dos servidores">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] flex flex-col gap-2 justify-between">
                        <span className="text-sm font-semibold flex items-center gap-2 text-[hsl(var(--ui-text))]"><Database className="w-4 h-4" /> Banco de Dados</span>
                        <span className="text-xs text-[hsl(var(--ui-text-muted))]">Latência Transacional</span>
                        <div className="mt-2 text-right"><StatusBadge status={data.infra.db} /></div>
                    </div>
                    <div className="p-4 bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] flex flex-col gap-2 justify-between">
                        <span className="text-sm font-semibold flex items-center gap-2 text-[hsl(var(--ui-text))]"><Activity className="w-4 h-4" /> Redis Node</span>
                        <span className="text-xs text-[hsl(var(--ui-text-muted))]">Cache & Filas</span>
                        <div className="mt-2 text-right"><StatusBadge status={data.infra.redis} /></div>
                    </div>
                    <div className="p-4 bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] flex flex-col gap-2 justify-between">
                        <span className="text-sm font-semibold flex items-center gap-2 text-[hsl(var(--ui-text))]"><Cloud className="w-4 h-4" /> Object Storage</span>
                        <span className="text-xs text-[hsl(var(--ui-text-muted))] line-clamp-1">{data.infra.storageReason || 'AWS S3 / R2 Bucket'}</span>
                        <div className="mt-2 text-right"><StatusBadge status={data.infra.storage} /></div>
                    </div>
                </div>
            </SettingsSection>

            {data.domineProcessor && (
                <SettingsSection title="Processamento de Eventos (Espinha Dorsal)" description="Status do loop idempotente de processamento">
                    <DomineProcessorCard {...data.domineProcessor} />
                </SettingsSection>
            )}
        </SettingsPage>
    );
}
