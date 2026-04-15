import type { LucideIcon } from 'lucide-react';
import {
    AlarmClock,
    ArrowRightLeft,
    Atom,
    Binary,
    Compass,
    FlaskConical,
    Snowflake,
    Layers,
    Link2,
    Orbit,
    ShieldCheck,
    Waves,
} from 'lucide-react';

export type StudyHubSection = {
    id: string;
    label: string;
};

export const studyHubSections: StudyHubSection[] = [
    { id: 'visao-geral', label: 'Visão geral' },
    { id: 'ideia-central', label: 'Ideia central' },
    { id: 'linha-do-tempo', label: 'Linha do tempo' },
    { id: 'glossario', label: 'Glossário rápido' },
    { id: 'paralelos-condstore', label: 'Paralelos com CONDSTORE' },
    { id: 'estado-rindler', label: 'Estado atual (Rindler)' },
    { id: 'proxima-execucao', label: 'Próxima execução' },
    { id: 'freeze-frentes', label: 'Freeze de frentes' },
];

export const timelineItems = [
    {
        title: 'Conjectura inicial consolidada',
        period: 'Etapa 1',
        description: 'A hipótese foi formulada como acoplamento entre geometria local, perda de coerência e produção de entropia relevante.',
    },
    {
        title: 'Recorte mínimo para teste',
        period: 'Etapa 2',
        description: 'Definiu-se Rindler como staging técnico para validar comportamento controlado antes de qualquer expansão narrativa.',
    },
    {
        title: 'Núcleo observável do MVP',
        period: 'Etapa 3',
        description: 'Foco operacional fechado em fonte gaussiana, setor soft, overlap gamma e monotonicidade mensurável.',
    },
    {
        title: 'Hub web didático isolado',
        period: 'Etapa 4 (atual)',
        description: 'Centralização do conteúdo em rota própria para leitura rápida, sem interferência no fluxo operacional do produto.',
    },
];

export const glossaryItems = [
    {
        term: 'Geometria efetiva',
        definition: 'Forma estável que emerge das relações observáveis e orienta a interpretação do estado local.',
    },
    {
        term: 'Decoerência operacional',
        definition: 'Perda de alinhamento entre estados que antes evoluíam de forma correlacionada no mesmo referencial.',
    },
    {
        term: 'Entropia relevante',
        definition: 'Medida de desordem útil para o problema atual, não a entropia total abstrata do sistema.',
    },
    {
        term: 'Staging Rindler',
        definition: 'Ambiente mínimo de teste onde os observáveis são controláveis e a leitura é mais robusta.',
    },
    {
        term: 'Overlap gamma',
        definition: 'Indicador de sobreposição entre estados no setor analisado, usado como sinal de consistência do modelo.',
    },
    {
        term: 'Monotonicidade',
        definition: 'Propriedade esperada de evolução sem inversões espúrias no indicador monitorado.',
    },
];

export type ParallelCard = {
    icon: LucideIcon;
    title: string;
    studyView: string;
    condstoreView: string;
};

export const parallelCards: ParallelCard[] = [
    {
        icon: Layers,
        title: 'Subálgebra ↔ Cockpit',
        studyView: 'Subálgebra organiza o subconjunto de relações que realmente importa para leitura local.',
        condstoreView: 'Cockpit expõe apenas o estado operacional crítico para decisão humana rápida.',
    },
    {
        icon: Compass,
        title: 'Horizonte ↔ Boundary',
        studyView: 'Horizonte define limite observável e evita inferência fora do domínio de medição.',
        condstoreView: 'Boundary de tenant/fluxo limita escopo de dados e previne vazamento de contexto.',
    },
    {
        icon: Waves,
        title: 'Decoerência ↔ Perda de contexto',
        studyView: 'Decoerência sinaliza degradação de correlação útil no estado em análise.',
        condstoreView: 'No atendimento, perda de contexto gera decisão ruim e retrabalho operacional.',
    },
    {
        icon: Orbit,
        title: 'Geometria ↔ Interface estável',
        studyView: 'Geometria efetiva precisa ser robusta para sustentar interpretação consistente.',
        condstoreView: 'Interface estável evita ambiguidade e mantém operação previsível no dia a dia.',
    },
];

export const statusCards = [
    {
        icon: Atom,
        title: 'Fonte gaussiana',
        summary: 'Base ativa do experimento para garantir entrada controlada e comparável entre execuções.',
        tag: 'Em execução',
    },
    {
        icon: Binary,
        title: 'Setor soft',
        summary: 'Recorte mantido como núcleo de leitura para reduzir ruído em regimes fora de interesse.',
        tag: 'Em monitoramento',
    },
    {
        icon: Link2,
        title: 'Overlap gamma',
        summary: 'Métrica priorizada para verificar consistência entre estados e estabilidade do acoplamento.',
        tag: 'Métrica principal',
    },
    {
        icon: AlarmClock,
        title: 'Monotonicidade',
        summary: 'Validação contínua para confirmar evolução sem reversões incompatíveis com a hipótese.',
        tag: 'Gate de aceitação',
    },
];

export const roadmapItems = [
    {
        icon: FlaskConical,
        title: 'Fechar bateria curta de validação Rindler',
        description: 'Consolidar leitura dos quatro observáveis com critérios binários de aprovação/rejeição.',
    },
    {
        icon: ArrowRightLeft,
        title: 'Refinar comparativos com CONDSTORE',
        description: 'Expandir exemplos didáticos sem abrir novas frentes técnicas além do núcleo MVP atual.',
    },
    {
        icon: ShieldCheck,
        title: 'Formalizar checklist de estabilização',
        description: 'Congelar expansão até evidência objetiva de estabilidade sem regressão no recorte atual.',
    },
];

export const freezeNotice = {
    title: 'Freeze ativo de frentes paralelas',
    description:
        'Até a estabilização deste MVP didático em Rindler, ficam congeladas expansões para cosmologia, buraco negro evaporante, interfaces paralelas e novos experimentos fora do núcleo definido.',
    points: [
        'Esta página é a base central de leitura e decisão para a frente de estudo atual.',
        'A prioridade é robustez de entendimento e validação do núcleo, não abertura de escopo.',
        'Qualquer unfreeze exige critério explícito de estabilidade e novo alinhamento de produto.',
    ],
    icon: Snowflake,
};
