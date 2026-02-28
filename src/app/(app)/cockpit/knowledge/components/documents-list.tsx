import { getDb } from '@/infra/db';
import { tenantDocuments, tenantDocumentVersions } from '@/drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { Badge } from '@/ui/components';
import { FileText, FileDown, ShieldAlert } from 'lucide-react';

export async function DocumentsList({ tenantId, limit, offset }: { tenantId: string, limit: number, offset: number }) {
    const db = await getDb();

    // MVP: Join versions straight
    const docs = await db.select({
        id: tenantDocuments.id,
        title: tenantDocuments.title,
        isSensitive: tenantDocuments.isSensitive,
        createdAt: tenantDocuments.createdAt,
        status: tenantDocumentVersions.status,
        sizeBytes: tenantDocumentVersions.sizeBytes,
    })
        .from(tenantDocuments)
        .leftJoin(tenantDocumentVersions, and(
            eq(tenantDocumentVersions.documentId, tenantDocuments.id),
            eq(tenantDocumentVersions.status, sql`(SELECT status FROM tenant_document_versions v2 WHERE v2.document_id = tenant_documents.id ORDER BY created_at DESC LIMIT 1)`) // Get latest status naive
        ))
        .where(eq(tenantDocuments.tenantId, tenantId))
        .orderBy(desc(tenantDocuments.createdAt))
        .limit(limit)
        .offset(offset);

    if (docs.length === 0) {
        return (
            <div className="text-center py-10 bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] rounded-md">
                <FileDown className="h-10 w-10 text-[hsl(var(--ui-text-muted))] mx-auto mb-3" />
                <p className="text-sm font-medium">Nenhum documento encontrado.</p>
                <p className="text-xs text-[hsl(var(--ui-text-muted))] mt-1">
                    Faça o upload do seu primeiro arquivo para iniciar o índice de conhecimento.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] rounded-md overflow-hidden">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[hsl(var(--ui-page))] border-b border-[hsl(var(--ui-border))]">
                    <tr>
                        <th className="px-4 py-3 font-medium text-[hsl(var(--ui-text-muted))]">Arquivo</th>
                        <th className="px-4 py-3 font-medium text-[hsl(var(--ui-text-muted))]">Status</th>
                        <th className="px-4 py-3 font-medium text-[hsl(var(--ui-text-muted))] hidden sm:table-cell">Tamanho</th>
                        <th className="px-4 py-3 font-medium text-[hsl(var(--ui-text-muted))] hidden md:table-cell">Envio</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--ui-border))]">
                    {docs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-[hsl(var(--ui-page)/0.5)] transition-colors">
                            <td className="px-4 py-3 max-w-[200px] truncate flex items-center gap-2">
                                <FileText className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />
                                <span className="font-medium">{doc.title}</span>
                                {doc.isSensitive && <ShieldAlert className="h-3 w-3 text-[hsl(var(--ui-warning-ink))]" />}
                            </td>
                            <td className="px-4 py-3">
                                <div role="status" aria-live="polite">
                                    {doc.status === 'processing' && <Badge variant="outline" className="text-blue-500 border-blue-500 bg-blue-50">Processando</Badge>}
                                    {doc.status === 'ready' && <Badge variant="success">Pronto</Badge>}
                                    {doc.status === 'failed' && <Badge variant="danger">Falha</Badge>}
                                    {doc.status === 'queued' && <Badge variant="outline">Fila</Badge>}
                                    {doc.status === 'uploaded' && <Badge variant="muted">Upload</Badge>}
                                    {!doc.status && <Badge variant="muted">Pendente</Badge>}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-[hsl(var(--ui-text-muted))] hidden sm:table-cell">
                                {doc.sizeBytes ? (doc.sizeBytes / 1024).toFixed(1) + ' KB' : '-'}
                            </td>
                            <td className="px-4 py-3 text-[hsl(var(--ui-text-muted))] hidden md:table-cell">
                                {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-4 py-3 text-right">
                                <button className="text-xs font-medium text-[hsl(var(--ui-accent-blue))] hover:underline mr-3">
                                    Ver Detalhes
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
