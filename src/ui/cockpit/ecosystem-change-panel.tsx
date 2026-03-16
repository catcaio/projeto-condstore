import { ecosystemFeedService } from '@/modules/frank/services/ecosystem-feed.service';
import { SettingsSection } from '@/ui/settings';
import { Activity, ShieldAlert, Wrench, Briefcase, ExternalLink } from 'lucide-react';
import { Badge } from '@/ui/components';
import Link from 'next/link';

export async function EcosystemChangePanel({ tenantId }: { tenantId: string }) {
    const feed = await ecosystemFeedService.getRecentFeed(tenantId, 5);

    if (!feed || feed.length === 0) {
        return (
            <SettingsSection title="Mural do Ecossistema">
                <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 rounded-xl border border-[hsl(var(--ui-border))] border-dashed">
                    <Activity className="h-8 w-8 text-gray-400 mb-3 opacity-50" />
                    <p className="text-sm font-medium text-gray-500">Nenhum evento detectado nas últimas horas.</p>
                </div>
            </SettingsSection>
        );
    }

    return (
        <SettingsSection title="Mural do Ecossistema (Frank Analysis)">
            <div className="flex flex-col gap-3">
                {feed.map((event) => {
                    const isRisk = event.impactCategory === 'risk';
                    const isTech = event.impactCategory === 'technical';
                    const isCom = event.impactCategory === 'commercial';
                    
                    return (
                        <div key={event.id} className="group relative flex flex-col gap-3 p-4 bg-white border border-[hsl(var(--ui-border))] rounded-xl shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {isTech ? <Wrench className="w-4 h-4 text-purple-500" /> : 
                                     isRisk ? <ShieldAlert className="w-4 h-4 text-red-500" /> : 
                                     isCom  ? <Briefcase className="w-4 h-4 text-emerald-500" /> : 
                                     <Activity className="w-4 h-4 text-blue-500" />}
                                    <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                        {event.eventType}
                                    </span>
                                </div>
                                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                                    {new Date(event.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <p className="text-[13px] leading-relaxed text-gray-600">
                                {event.description}
                            </p>

                            <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100">
                                <Badge variant={isRisk ? 'danger' : isTech ? 'muted' : isCom ? 'success' : 'default'} className="text-[10px] px-2 py-0.5">
                                    {event.impactCategory}
                                </Badge>
                                
                                {event.suggestedAction && (
                                    <Link 
                                        href={event.suggestedAction.actionUrl}
                                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md"
                                    >
                                        <span>{event.suggestedAction.label}</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </SettingsSection>
    );
}
