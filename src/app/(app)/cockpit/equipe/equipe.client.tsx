'use client';

import { useState } from 'react';
import { Mail, ShieldAlert, Briefcase, Eye, Plus, ShieldCheck, MoreVertical, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Member {
    id: string;
    name: string | null;
    email: string;
    role: string | null;
    createdAt: Date;
    authProvider: string | null;
}

interface Invite {
    id: string;
    email: string | null;
    role: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
}

interface EquipeClientProps {
    members: Member[];
    invites: Invite[];
    currentProvider?: string;
    currentUserId?: string;
}

export function EquipeClient({ members, invites, currentUserId }: EquipeClientProps) {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('operator');
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    // Mock invite action since we need a Server Action or API endpoint for real persistence
    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setIsSubmitting(true);
        setMessage(null);

        try {
            const res = await fetch('/api/auth/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao enviar convite');
            }

            setMessage({ type: 'success', text: 'Convite enviado com sucesso!' });
            setInviteEmail('');
            setInviteRole('operator');

            // Reload page smoothly to fetch new invites
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const roleMap: Record<string, { label: string, icon: any, color: string }> = {
        'admin': { label: 'Administrador', icon: ShieldAlert, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
        'manager': { label: 'Gerente', icon: Briefcase, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
        'operator': { label: 'Operador', icon: ShieldCheck, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
        'viewer': { label: 'Leitor', icon: Eye, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
    };

    return (
        <div className="flex flex-col gap-8">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-[hsl(var(--ui-text))]">Membros Ativos ({members.length})</h2>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Usuários que já aceitaram o convite e têm acesso à plataforma.</p>
                </div>
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--ui-accent-blue))] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[hsl(var(--ui-accent-blue))/0.9] transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Convidar Novo Membro
                </button>
            </div>

            {/* Members Table */}
            <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text-muted))] text-xs uppercase border-b border-[hsl(var(--ui-border))]">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold">Usuário</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Função / Nível</th>
                                <th scope="col" className="px-6 py-4 font-semibold hidden md:table-cell">Entrou em</th>
                                <th scope="col" className="px-6 py-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[hsl(var(--ui-border))] text-[hsl(var(--ui-text))]">
                            {members.map((member) => {
                                const roleInfo = member.role ? roleMap[member.role] : roleMap['viewer'];
                                const isMe = member.id === currentUserId;
                                const RIcon = roleInfo?.icon || Eye;

                                return (
                                    <tr key={member.id} className="hover:bg-[hsl(var(--ui-muted))] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-[hsl(var(--ui-border))] flex items-center justify-center text-[hsl(var(--ui-text))] font-bold overflow-hidden shadow-inner">
                                                    {member.name ? member.name.charAt(0).toUpperCase() : <Mail className="w-4 h-4 opacity-50" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="font-semibold flex items-center gap-2">
                                                        {member.name || 'Usuário Sem Nome'}
                                                        {isMe && <span className="text-[10px] uppercase font-bold text-[hsl(var(--ui-accent-blue))] bg-[hsl(var(--ui-accent-blue))/0.1] px-1.5 py-0.5 rounded-md">Você</span>}
                                                    </div>
                                                    <span className="text-xs text-[hsl(var(--ui-text-muted))]">{member.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium", roleInfo?.color)}>
                                                <RIcon className="w-3.5 h-3.5" />
                                                {roleInfo?.label || 'Sem Função'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell text-[hsl(var(--ui-text-muted))]">
                                            {format(new Date(member.createdAt), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] rounded-md hover:bg-[hsl(var(--ui-bg))] transition-colors">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pending Invites */}
            {invites.length > 0 && (
                <div className="flex flex-col gap-4 mt-8">
                    <div>
                        <h2 className="text-xl font-bold text-[hsl(var(--ui-text))]">Convites Pendentes ({invites.length})</h2>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))]">Convites enviados aguardando aceite.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {invites.map(invite => {
                            const roleInfo = roleMap[invite.role] || roleMap['viewer'];
                            const RIcon = roleInfo.icon;
                            return (
                                <div key={invite.id} className="flex flex-col p-4 rounded-xl border border-dashed border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-5 h-5 text-[hsl(var(--ui-text-muted))]" />
                                            <span className="font-medium text-[hsl(var(--ui-text))] text-sm truncate max-w-[150px]">{invite.email}</span>
                                        </div>
                                        <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase", roleInfo.color)}>
                                            <RIcon className="w-3 h-3" />
                                            {roleInfo.label}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[hsl(var(--ui-border))]">
                                        <span className="text-xs text-[hsl(var(--ui-text-muted))]">
                                            Expira: {format(new Date(invite.expiresAt), "dd/MM", { locale: ptBR })}
                                        </span>
                                        <button className="text-xs text-red-500 hover:text-red-600 font-medium">Revogar</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isSubmitting && setIsInviteModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-[hsl(var(--ui-surface))] rounded-2xl shadow-2xl border border-[hsl(var(--ui-border))] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))]">
                            <h3 className="text-lg font-bold text-[hsl(var(--ui-text))]">Convidar para Workspace</h3>
                            <button onClick={() => !isSubmitting && setIsInviteModalOpen(false)} className="p-1 sm:p-2 text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] rounded-full hover:bg-[hsl(var(--ui-border))] transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleInvite} className="flex flex-col p-5 sm:p-6 gap-5">
                            {message && (
                                <div className={cn("p-3 rounded-lg text-sm font-medium flex items-center gap-2 border", message.type === 'error' ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20")}>
                                    <ShieldAlert className="w-4 h-4" />
                                    {message.text}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-[hsl(var(--ui-text))]">E-mail do Membro</label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    placeholder="ex: joao@suaempresa.com.br"
                                    className="w-full rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] px-4 py-3 text-sm focus:border-[hsl(var(--ui-accent-blue))] focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))] outline-none transition-all placeholder:text-[hsl(var(--ui-text-muted))/0.5]"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-[hsl(var(--ui-text))]">Nível de Acesso (Função)</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'admin', label: 'Administrador', desc: 'Acesso total, convida usuários.', icon: ShieldAlert },
                                        { id: 'manager', label: 'Gerente', desc: 'Edita configurações logísticas.', icon: Briefcase },
                                        { id: 'operator', label: 'Operador', desc: 'Gera etiquetas e atualiza pedidos.', icon: ShieldCheck },
                                        { id: 'viewer', label: 'Leitor', desc: 'Apenas visualiza dados e dashboards.', icon: Eye },
                                    ].map(role => (
                                        <label
                                            key={role.id}
                                            className={cn(
                                                "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                                inviteRole === role.id
                                                    ? "border-[hsl(var(--ui-accent-blue))] bg-[hsl(var(--ui-accent-blue))/0.05]"
                                                    : "border-[hsl(var(--ui-border))] hover:border-[hsl(var(--ui-text-muted))] bg-[hsl(var(--ui-surface))]"
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="role"
                                                value={role.id}
                                                checked={inviteRole === role.id}
                                                onChange={() => setInviteRole(role.id)}
                                                className="mt-1 flex-shrink-0"
                                            />
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 font-bold text-[hsl(var(--ui-text))] text-sm">
                                                    <role.icon className={cn("w-4 h-4", inviteRole === role.id ? "text-[hsl(var(--ui-accent-blue))]" : "text-[hsl(var(--ui-text-muted))]")} />
                                                    {role.label}
                                                </div>
                                                <span className="text-xs text-[hsl(var(--ui-text-muted))] mt-0.5">{role.desc}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsInviteModalOpen(false)}
                                    className="px-4 py-2.5 text-sm font-medium text-[hsl(var(--ui-text))] bg-[hsl(var(--ui-bg))] border border-[hsl(var(--ui-border))] rounded-xl hover:bg-[hsl(var(--ui-muted))] transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[hsl(var(--ui-accent-blue))] rounded-xl hover:bg-[hsl(var(--ui-accent-blue))/0.9] transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                                    Enviar Convite
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
