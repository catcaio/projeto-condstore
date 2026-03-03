'use client';

import { useState, useEffect } from 'react';
import { SettingsSection } from '@/ui/settings';
import { Button } from '@/ui/components';
import { TextField } from '@/ui/components/text-field';
import { ShieldCheck, MessageSquare, CreditCard, Bot, KeyRound, ServerCrash } from 'lucide-react';

interface SecretMetadata {
    id: string;
    scope: string;
    keyName: string;
    lastRotatedAt: string;
    lastVerifiedAt: string | null;
    rotatedByUserId: string;
    createdAt: string;
    updatedAt: string;
}

export function SecuritySettingsClient({ tenantId }: { tenantId: string }) {
    const [secrets, setSecrets] = useState<SecretMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const [outboundEnabled, setOutboundEnabled] = useState<boolean | null>(null);
    const [isUpdatingOutbound, setIsUpdatingOutbound] = useState(false);
    const [incidentMode, setIncidentMode] = useState<boolean | null>(null);
    const [isUpdatingIncidentMode, setIsUpdatingIncidentMode] = useState(false);
    const [healthSummary, setHealthSummary] = useState<any>(null);

    // Rotate Modal State
    const [isRotateModalOpen, setIsRotateModalOpen] = useState(false);
    const [rotatingKey, setRotatingKey] = useState<{ scope: string; keyName: string; displayName: string } | null>(null);
    const [newValue, setNewValue] = useState('');
    const [showValue, setShowValue] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isRotating, setIsRotating] = useState(false);

    // Test Connection State
    const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchSecrets();
        fetchSettings();
        fetchHealthSummary();
    }, [tenantId]);

    async function fetchHealthSummary() {
        try {
            const res = await fetch(`/api/tenants/${tenantId}/health`);
            if (res.ok) {
                const data = await res.json();
                setHealthSummary(data);
            }
        } catch (error) {
            console.error('Failed to fetch health summary');
        }
    }

    async function fetchSettings() {
        try {
            const res = await fetch(`/api/tenants/${tenantId}/settings`);
            if (res.ok) {
                const data = await res.json();
                setOutboundEnabled(data.outboundEnabled !== false); // default true
                setIncidentMode(data.incidentMode === true); // default false
            }
        } catch (error) {
            console.error('Failed to fetch settings');
        }
    }

    async function fetchSecrets() {
        setLoading(true);
        try {
            const res = await fetch(`/api/tenants/${tenantId}/secrets`);
            if (res.ok) {
                const data = await res.json();
                setSecrets(data.secrets || []);
            }
        } catch (error) {
            alert('Erro ao carregar segredos');
        } finally {
            setLoading(false);
        }
    }

    const getSecretMeta = (scope: string, keyName: string) => {
        return secrets.find(s => s.scope === scope && s.keyName === keyName);
    };

    const handleOpenRotate = (scope: string, keyName: string, displayName: string) => {
        setRotatingKey({ scope, keyName, displayName });
        setNewValue('');
        setShowValue(false);
        setConfirmText('');
        setIsRotateModalOpen(true);
    };

    const handleRotateSubmit = async () => {
        if (confirmText !== 'ROTATE' || !newValue.trim() || !rotatingKey) return;

        setIsRotating(true);
        try {
            const res = await fetch(`/api/tenants/${tenantId}/secrets/rotate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scope: rotatingKey.scope,
                    keyName: rotatingKey.keyName,
                    newValue
                })
            });

            if (res.ok) {
                alert('Chave atualizada com sucesso!');
                setIsRotateModalOpen(false);
                fetchSecrets();
            } else {
                const err = await res.json();
                alert(`Erro ao rotacionar: ${err.error}`);
            }
        } catch (error) {
            alert('Erro na requisição');
        } finally {
            setIsRotating(false);
        }
    };

    const handleTestConnection = async (scope: string) => {
        setIsTesting(prev => ({ ...prev, [scope]: true }));
        try {
            const res = await fetch(`/api/tenants/${tenantId}/secrets/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scope })
            });
            const data = await res.json();
            if (data.ok) {
                alert(`Conexão OK!\n\n${data.message}`);
                fetchSecrets(); // Refresh to get the updated lastVerifiedAt
            } else {
                alert(`Falha na conexão!\n\n${data.message || data.error}`);
            }
        } catch (error) {
            alert('Erro ao testar conexão');
        } finally {
            setIsTesting(prev => ({ ...prev, [scope]: false }));
        }
    };

    const handleToggleOutbound = async () => {
        setIsUpdatingOutbound(true);
        const newValue = !outboundEnabled;
        try {
            const res = await fetch(`/api/tenants/${tenantId}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outboundEnabled: newValue })
            });
            if (res.ok) {
                setOutboundEnabled(newValue);
            } else {
                alert('Erro ao atualizar configurações.');
            }
        } catch (error) {
            alert('Falha na requisição.');
        } finally {
            setIsUpdatingOutbound(false);
        }
    };

    const handleToggleIncidentMode = async () => {
        setIsUpdatingIncidentMode(true);
        const newValue = !incidentMode;
        try {
            const res = await fetch(`/api/tenants/${tenantId}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ incidentMode: newValue })
            });
            if (res.ok) {
                setIncidentMode(newValue);
            } else {
                alert('Erro ao atualizar configurações de incidente.');
            }
        } catch (error) {
            alert('Falha na requisição.');
        } finally {
            setIsUpdatingIncidentMode(false);
        }
    };

    const renderSecretItem = (
        scope: string,
        keyName: string,
        displayName: string,
        options: { isReadOnly?: boolean; description?: string } = {}
    ) => {
        const meta = getSecretMeta(scope, keyName);
        const sourceLabel = meta ? 'DB (encrypted)' : 'ENV (fallback)';
        const rotatedLabel = meta?.lastRotatedAt
            ? new Date(meta.lastRotatedAt).toLocaleString('pt-BR')
            : 'Padrão do sistema';

        const isVerified = Boolean(meta?.lastVerifiedAt);
        const verifiedLabel = isVerified ? new Date(meta!.lastVerifiedAt!).toLocaleString('pt-BR') : 'Pendente de teste';

        let statusTag = null;
        if (meta) {
            if (isVerified) {
                statusTag = <span className="text-xs px-2 py-0.5 bg-[hsl(var(--ui-success)/0.1)] text-[hsl(var(--ui-success))] font-bold rounded">Ativo</span>;
            } else {
                statusTag = <span className="text-xs px-2 py-0.5 bg-[hsl(var(--ui-warning)/0.1)] text-[hsl(var(--ui-warning))] font-bold rounded">Pending (Não testado)</span>;
            }
        }

        return (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 border-b border-[hsl(var(--ui-border)/0.5)] last:border-0 gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[hsl(var(--ui-text))]">{displayName}</span>
                        {statusTag}
                    </div>
                    <span className="text-xs text-[hsl(var(--ui-text-muted))] mt-1">
                        Source: <span className={meta ? 'text-[hsl(var(--ui-success))] font-medium' : 'font-mono'}>{sourceLabel}</span> • Atualizado: {rotatedLabel}
                        {meta && ` • Verificado: ${verifiedLabel}`}
                    </span>
                    {options.description && (
                        <p className="text-xs text-[hsl(var(--ui-danger))] mt-1">{options.description}</p>
                    )}
                </div>
                <div className="flex shrink-0">
                    {options.isReadOnly ? (
                        <span className="text-xs px-2 py-1 bg-[hsl(var(--ui-surface-hover))] rounded border border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text-muted))] font-mono">
                            Read-Only
                        </span>
                    ) : (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenRotate(scope, keyName, displayName)}
                        >
                            Trocar a chave
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {healthSummary && (
                <SettingsSection
                    title="Health Summary"
                    description="Painel de diagnósticos rápidos dos serviços vitais."
                >
                    <div className="bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-[hsl(var(--ui-text-muted))] uppercase tracking-wider font-semibold">Redis</span>
                            <span className={`text-sm font-bold ${healthSummary.redis === 'ok' ? 'text-[hsl(var(--ui-success))]' : 'text-[hsl(var(--ui-danger))]'}`}>
                                {healthSummary.redis === 'ok' ? 'Online' : 'Offline'}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-[hsl(var(--ui-text-muted))] uppercase tracking-wider font-semibold">Limite Taxa</span>
                            <span className={`text-sm font-bold ${healthSummary.rateLimiterFallback?.count > 0 ? 'text-[hsl(var(--ui-warning))]' : 'text-[hsl(var(--ui-success))]'}`}>
                                {healthSummary.rateLimiterFallback?.count > 0 ? `Ativo (${healthSummary.rateLimiterFallback.count})` : 'Normal'}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-[hsl(var(--ui-text-muted))] uppercase tracking-wider font-semibold">Circuitos Abertos</span>
                            <span className={`text-sm font-bold ${healthSummary.circuitBreakers?.length > 0 ? 'text-[hsl(var(--ui-danger))]' : 'text-[hsl(var(--ui-success))]'}`}>
                                {healthSummary.circuitBreakers?.length > 0 ? healthSummary.circuitBreakers.map((cb: any) => cb.provider).join(', ') : 'Nenhum'}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-[hsl(var(--ui-text-muted))] uppercase tracking-wider font-semibold">Integridade</span>
                            <span className={`text-sm font-bold ${healthSummary.incidentMode ? 'text-[hsl(var(--ui-danger))]' : (healthSummary.outboundEnabled ? 'text-[hsl(var(--ui-success))]' : 'text-[hsl(var(--ui-warning))]')}`}>
                                {healthSummary.incidentMode ? 'Incidente (Lockdown)' : (healthSummary.outboundEnabled ? 'Operacional' : 'Envio Pausado')}
                            </span>
                        </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={fetchHealthSummary}>Refresh Health</Button>
                    </div>
                </SettingsSection>
            )}

            <SettingsSection
                title="Operational Controls (Kill Switch)"
                description="Controle de emergência para bloquear o tráfego de saída mantendo o recebimento de mensagens."
            >
                <div className="bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] px-4 py-4 flex items-center justify-between">
                    <div>
                        <span className="text-sm font-semibold text-[hsl(var(--ui-text))]">Permitir Envio de Mensagens</span>
                        <p className="text-xs text-[hsl(var(--ui-text-muted))] mt-1">Se desativado, o sistema parará de enviar qualquer mensagem para este tenant, logando tentativas como bloqueadas.</p>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleToggleOutbound}
                        disabled={isUpdatingOutbound || outboundEnabled === null}
                        className={!outboundEnabled ? "bg-[hsl(var(--ui-danger))] text-white border-transparent" : ""}
                    >
                        {isUpdatingOutbound ? 'Salvando...' : (outboundEnabled ? 'Ativado' : 'DESATIVADO')}
                    </Button>
                </div>

                <div className="bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] px-4 py-4 flex items-center justify-between mt-4">
                    <div>
                        <span className="text-sm font-semibold text-[hsl(var(--ui-text))]">Incident Mode (Lockdown)</span>
                        <p className="text-xs text-[hsl(var(--ui-text-muted))] mt-1">Se ativado, bloqueia chamadas externas e ativa a mensagem padrão indicando instabilidade (Fail-Safe).</p>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleToggleIncidentMode}
                        disabled={isUpdatingIncidentMode || incidentMode === null}
                        className={incidentMode ? "bg-[hsl(var(--ui-danger))] text-white border-transparent" : ""}
                    >
                        {isUpdatingIncidentMode ? 'Salvando...' : (incidentMode ? 'EM INCIDENTE' : 'Desativado')}
                    </Button>
                </div>
            </SettingsSection>

            <SettingsSection
                title="Mensageria (Twilio)"
                description="Credenciais e tokens para comunicação via WhatsApp."
            >
                <div className="bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] px-4 divide-y divide-[hsl(var(--ui-border)/0.5)]">
                    {renderSecretItem('twilio', 'TWILIO_ACCOUNT_SID', 'Account SID', { isReadOnly: true })}
                    {renderSecretItem('twilio', 'TWILIO_WHATSAPP_NUMBER', 'Phone Number', { isReadOnly: true })}
                    {renderSecretItem('twilio', 'TWILIO_WEBHOOK_BASE_URL', 'Webhook Base URL', { isReadOnly: true })}
                    {renderSecretItem('twilio', 'TWILIO_AUTH_TOKEN', 'Auth Token')}
                </div>
                <div className="mt-3 flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={isTesting['twilio']}
                        onClick={() => handleTestConnection('twilio')}
                    >
                        {isTesting['twilio'] ? 'Testando...' : 'Testar conexão Twilio'}
                    </Button>
                </div>
            </SettingsSection>

            <SettingsSection
                title="Billing (Stripe)"
                description="Assinaturas e recebimentos via Stripe."
            >
                <div className="bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] px-4 divide-y divide-[hsl(var(--ui-border)/0.5)]">
                    {renderSecretItem('stripe', 'STRIPE_WEBHOOK_SECRET', 'Webhook Secret')}
                    {renderSecretItem('stripe', 'STRIPE_SECRET_KEY', 'Secret Key')}
                </div>
                <div className="mt-3 flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={isTesting['stripe']}
                        onClick={() => handleTestConnection('stripe')}
                    >
                        {isTesting['stripe'] ? 'Validando...' : 'Validar formato do webhook'}
                    </Button>
                </div>
            </SettingsSection>

            <SettingsSection
                title="IA / Providers"
                description="Gerencie chaves de API da OpenAI, Anthropic ou LLMs locais."
            >
                <div className="bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] px-4 divide-y divide-[hsl(var(--ui-border)/0.5)]">
                    {renderSecretItem('ai_provider', 'OPENAI_API_KEY', 'OpenAI API Key')}
                </div>
            </SettingsSection>

            <SettingsSection
                title="Tokens Internos (Ops)"
                description="Atenção: A rotação derruba jobs cron e endpoints de health que não estejam com a mesma variável atualizada."
            >
                <div className="bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] px-4 divide-y divide-[hsl(var(--ui-border)/0.5)] text-sm">
                    {renderSecretItem('internal', 'INTERNAL_JOB_TOKEN', 'Job Execution Token', { description: 'Impacta agendamento e sincronismos' })}
                    {renderSecretItem('internal', 'INTERNAL_DIAG_TOKEN', 'Diagnostic / Health Token', { description: 'Impacta monitoramento de uptime' })}
                </div>
                <div className="mt-3 flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={isTesting['internal']}
                        onClick={() => handleTestConnection('internal')}
                    >
                        {isTesting['internal'] ? 'Testando...' : 'Testar banco e redis'}
                    </Button>
                </div>
            </SettingsSection>

            <SettingsSection
                title="Criptografia"
                description="Chaves mestres ou de encriptação at-rest."
            >
                <div className="bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] px-4 py-4">
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck className="w-5 h-5 text-[hsl(var(--ui-success))]" />
                        <span className="text-sm font-semibold">PII_ENCRYPTION_KEY</span>
                    </div>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">
                        Status: <span className="text-[hsl(var(--ui-success))] font-medium">Configured</span><br />
                        (Para modificar a chave master, acesse as variáveis de ambiente do deploy ou infraestrutura)
                    </p>
                </div>
            </SettingsSection>

            {/* Rotatation Modal overlay */}
            {isRotateModalOpen && rotatingKey && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-6">
                        <div className="flex justify-between items-center border-b border-[hsl(var(--ui-border))] pb-4">
                            <h2 className="text-lg font-bold text-[hsl(var(--ui-text))]">Modificar Chave</h2>
                            <button onClick={() => !isRotating && setIsRotateModalOpen(false)} className="text-[hsl(var(--ui-text-muted))] hover:text-white">&times;</button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-[hsl(var(--ui-text-muted))]">
                                Você está prestes a substituir a chave <strong className="text-[hsl(var(--ui-text))]">{rotatingKey.displayName}</strong>.
                                Essa ação será registrada no log de auditoria e a chave atual será invalidada imediatamente.
                            </p>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Nova Chave</label>
                                <div className="relative">
                                    <TextField
                                        type={showValue ? "text" : "password"}
                                        value={newValue}
                                        onChange={e => setNewValue(e.target.value)}
                                        placeholder="Cole a nova chave aqui"
                                        disabled={isRotating}
                                        className="pr-20"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowValue(!showValue)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[hsl(var(--ui-accent-blue))] hover:text-white"
                                        disabled={isRotating}
                                    >
                                        {showValue ? 'OCULTAR' : 'MOSTRAR'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-[hsl(var(--ui-danger)/0.1)] p-4 rounded-md border border-[hsl(var(--ui-danger)/0.2)]">
                                <label className="block text-sm font-bold text-[hsl(var(--ui-danger))] mb-1">Confirmação Extra</label>
                                <p className="text-xs text-[hsl(var(--ui-text-muted))] mb-3">Digite <strong className="font-mono text-[hsl(var(--ui-text))]">ROTATE</strong> para confirmar a rotação imediata.</p>
                                <TextField
                                    type="text"
                                    value={confirmText}
                                    onChange={e => setConfirmText(e.target.value.toUpperCase())}
                                    placeholder="ROTATE"
                                    disabled={isRotating}
                                    className="border-[hsl(var(--ui-danger)/0.3)] focus-visible:ring-[hsl(var(--ui-danger))] uppercase"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--ui-border))]">
                                <Button variant="ghost" onClick={() => setIsRotateModalOpen(false)} disabled={isRotating}>
                                    Cancelar
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleRotateSubmit}
                                    disabled={isRotating || confirmText !== 'ROTATE' || !newValue.trim()}
                                    className="bg-[hsl(var(--ui-danger))] hover:bg-[hsl(var(--ui-danger)/0.9)] text-white border-transparent"
                                >
                                    {isRotating ? 'Substituindo...' : 'Substituir Agora'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
