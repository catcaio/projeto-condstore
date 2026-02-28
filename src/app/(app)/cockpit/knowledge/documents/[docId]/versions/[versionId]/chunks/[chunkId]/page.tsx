import { getDb } from '@/infra/db';
import { tenantDocumentChunks, tenantDocumentVersions, tenantDocuments } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { headers } from 'next/headers';
import { SettingsPage, SettingsSection } from '@/ui/settings';
import { isSuperAdmin } from '@/ui/auth/entitlements-logic';
import { Badge } from '@/ui/components';
import { ShieldAlert, BookOpen, Quote } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function CitationViewerPage(props: { params: Promise<{ docId: string; versionId: string; chunkId: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;

    const headersList = await headers();
    const sessionTenantId = headersList.get('x-auth-tenant-id');
    const role = headersList.get('x-auth-role');

    const actAsSuperAdmin = isSuperAdmin(role) && inspectTenantId;
    const tenantId = actAsSuperAdmin ? inspectTenantId : sessionTenantId;

    if (!tenantId) {
        return <div>Não autorizado.</div>;
    }

    const { docId, versionId, chunkId } = params;

    const db = await getDb();

    // Validar e buscar o chunk, assegurando que seja do tenantId e versão correta.
    const [chunkData] = await db.select({
        id: tenantDocumentChunks.id,
        content: tenantDocumentChunks.content,
        orderIndex: tenantDocumentChunks.orderIndex,
        charStart: tenantDocumentChunks.charStart,
        charEnd: tenantDocumentChunks.charEnd,
        docTitle: tenantDocuments.title,
        isSensitive: tenantDocuments.isSensitive,
        versionHash: tenantDocumentVersions.sha256,
        status: tenantDocumentVersions.status,
    })
        .from(tenantDocumentChunks)
        .innerJoin(tenantDocumentVersions, eq(tenantDocumentVersions.id, tenantDocumentChunks.versionId))
        .innerJoin(tenantDocuments, eq(tenantDocuments.id, tenantDocumentVersions.documentId))
        .where(
            and(
                eq(tenantDocumentChunks.id, chunkId),
                eq(tenantDocumentChunks.tenantId, tenantId),
                eq(tenantDocumentVersions.id, versionId),
                eq(tenantDocuments.id, docId)
            )
        );

    if (!chunkData) {
        notFound();
    }

    // Buscar contexto (chunk anterior e próximo) se existirem
    const contextPrefix = await db.select({ content: tenantDocumentChunks.content })
        .from(tenantDocumentChunks)
        .where(
            and(
                eq(tenantDocumentChunks.versionId, versionId),
                eq(tenantDocumentChunks.tenantId, tenantId),
                eq(tenantDocumentChunks.orderIndex, chunkData.orderIndex - 1)
            )
        )
        .limit(1);

    const contextSuffix = await db.select({ content: tenantDocumentChunks.content })
        .from(tenantDocumentChunks)
        .where(
            and(
                eq(tenantDocumentChunks.versionId, versionId),
                eq(tenantDocumentChunks.tenantId, tenantId),
                eq(tenantDocumentChunks.orderIndex, chunkData.orderIndex + 1)
            )
        )
        .limit(1);

    return (
        <SettingsPage
            title="Visualizador de Citação (Chunk)"
            description={`Recorte do documento "${chunkData.docTitle}" extraído no processamento vetorial.`}
        >
            <div className="mb-6 flex gap-3">
                <Badge variant="outline">Ordem: {chunkData.orderIndex}</Badge>
                {chunkData.isSensitive && (
                    <Badge variant="danger"><ShieldAlert className="w-3 h-3 mr-1" /> Sensível</Badge>
                )}
                {chunkData.status === 'ready_indexed' ? (
                    <Badge variant="success">Indexado (Ativo)</Badge>
                ) : (
                    <Badge variant="muted">Estado: {chunkData.status}</Badge>
                )}
            </div>

            <SettingsSection title="Trecho Principal Recuperado">
                <div className="bg-[hsl(var(--ui-surface))] border-l-4 border-[hsl(var(--ui-accent-blue))] p-6 rounded-r-md relative">
                    <Quote className="absolute top-4 right-4 w-12 h-12 text-[hsl(var(--ui-border))] pointer-events-none opacity-50" />

                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[hsl(var(--ui-text))] font-medium relative z-10">
                        {chunkData.content}
                    </p>
                    <div className="mt-4 pt-4 border-t border-[hsl(var(--ui-border))] flex justify-between text-xs text-[hsl(var(--ui-text-muted))] font-mono">
                        <span>Range: {chunkData.charStart} - {chunkData.charEnd}</span>
                        <span>Chunk ID: {chunkId}</span>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Contexto Adjacente (Apenas Visualização)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[hsl(var(--ui-text-muted))]">
                            <BookOpen className="w-4 h-4" /> Trecho Anterior
                        </h4>
                        <div className="border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] rounded-md p-4 h-48 overflow-y-auto">
                            {contextPrefix[0] ? (
                                <p className="text-xs text-[hsl(var(--ui-text-muted))] whitespace-pre-wrap opacity-70">
                                    {contextPrefix[0].content}
                                </p>
                            ) : (
                                <p className="text-xs italic text-[hsl(var(--ui-text-muted))]">-- Início do documento --</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[hsl(var(--ui-text-muted))]">
                            <BookOpen className="w-4 h-4" /> Trecho Posterior
                        </h4>
                        <div className="border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] rounded-md p-4 h-48 overflow-y-auto">
                            {contextSuffix[0] ? (
                                <p className="text-xs text-[hsl(var(--ui-text-muted))] whitespace-pre-wrap opacity-70">
                                    {contextSuffix[0].content}
                                </p>
                            ) : (
                                <p className="text-xs italic text-[hsl(var(--ui-text-muted))]">-- Fim do documento --</p>
                            )}
                        </div>
                    </div>
                </div>
            </SettingsSection>
        </SettingsPage>
    );
}
