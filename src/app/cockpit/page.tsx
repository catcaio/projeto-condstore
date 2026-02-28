import { CockpitMetrics } from './_components/cockpit-metrics';
import { FreightMetricsDashboard } from './_components/freight-metrics-dashboard';
import { FinOpsCard } from './_components/finops-card';
import { Badge, Button, Card, CardContent, CardHeader, ListGroup, ListItem, Separator } from '@/ui/components';
import { Activity, Database, Radio, Shield } from 'lucide-react';

export default function CockpitPage() {
    return (
        <div className="space-y-5">
            {/* Header */}
            <Card variant="elevated">
                <CardHeader
                    heading="Cockpit"
                    subheading="Visão operacional do tenant com métricas e status do sistema"
                    actions={
                        <div className="flex items-center gap-2">
                            <Badge variant="muted">Atualizado agora</Badge>
                            <Button variant="secondary" size="sm">Atualizar</Button>
                        </div>
                    }
                />
                <CardContent className="pt-0">
                    <ListGroup>
                        <ListItem leading={<Shield className="h-4 w-4" />} trailing={<Badge variant="success">Admin-only</Badge>}>
                            APIs protegidas por `requireAdmin` + middleware com role estrita
                        </ListItem>
                        <Separator />
                        <ListItem leading={<Activity className="h-4 w-4" />} trailing={<Badge variant="muted">requestId</Badge>}>
                            Logs estruturados, rate limit hardening e Sentry com redaction
                        </ListItem>
                    </ListGroup>
                </CardContent>
            </Card>

            {/* Metrics Grid */}
            <CockpitMetrics />

            <FreightMetricsDashboard />

            {/* FinOps Budget Card */}
            <FinOpsCard />

            {/* Recent Activity Mock (To be refactored later) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader
                        heading="Atividade recente"
                        subheading="Eventos operacionais resumidos"
                        actions={<Button variant="ghost" size="sm">Ver tudo</Button>}
                    />
                    <CardContent className="pt-0">
                        <ListGroup>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i}>
                                    <ListItem leading={<span className="h-2 w-2 rounded-full bg-[hsl(var(--ui-accent-blue))]" />} trailing={<span className="text-xs">{i * 5} min</span>}>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-[hsl(var(--ui-text))]">
                                                Novo pedido via WhatsApp
                                            </p>
                                            <p className="truncate text-xs text-[hsl(var(--ui-text-muted))]">
                                                Tenant: Lojacond • Ref: #ORD-{1000 + i}
                                            </p>
                                        </div>
                                    </ListItem>
                                    {i < 5 ? <Separator /> : null}
                                </div>
                            ))}
                        </ListGroup>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader heading="Status do sistema" subheading="Snapshot local do shell" />
                    <CardContent className="space-y-3">
                        <ListGroup>
                            <ListItem leading={<Radio className="h-4 w-4" />} trailing={<Badge variant="success">Operacional</Badge>}>
                                Twilio Webhook
                            </ListItem>
                            <Separator />
                            <ListItem leading={<Database className="h-4 w-4" />} trailing={<Badge variant="success">Operacional</Badge>}>
                                Banco de dados
                            </ListItem>
                            <Separator />
                            <ListItem leading={<Activity className="h-4 w-4" />} trailing={<Badge variant="muted">Monitorado</Badge>}>
                                Redis / rate limit
                            </ListItem>
                        </ListGroup>

                        <Button variant="secondary" className="w-full">
                            Ver logs do sistema
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
