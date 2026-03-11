import type {
    ClientActivityBucket,
    ClientConversationActivity,
    ClientConversationStatus,
    ClientOrderActivity,
    ClientOrderStatus,
    ClientRecord,
    ClientSimulationActivity,
    ClientSimulationStatus,
    ClientStatus,
} from './types';

export type {
    ClientActivityBucket,
    ClientConversationActivity,
    ClientConversationStatus,
    ClientOrderActivity,
    ClientOrderStatus,
    ClientRecord,
    ClientSimulationActivity,
    ClientSimulationStatus,
    ClientStatus,
};

const statuses: ClientStatus[] = ['ativo', 'monitorado', 'em-risco', 'vip'];
const activityBuckets: ClientActivityBucket[] = ['agora', 'hoje', 'recente'];
const owners = ['Marina CX', 'Henrique Ops', 'Camila CX', 'Joao Sales', 'Bianca Freight'] as const;

const clientSeeds = [
    { name: 'Rafaela Alves', company: 'Loja Riacho', city: 'Fortaleza, CE', segment: 'Varejo regional', tags: ['premium', 'recompra', 'atraso'], note: 'sensibilidade alta a prazo e recompra' },
    { name: 'Paulo Nobre', company: 'Casa Norte', city: 'Recife, PE', segment: 'Distribuicao', tags: ['b2b', 'janela', 'coleta'], note: 'volume alto em janelas curtas' },
    { name: 'Clara Mendes', company: 'Atacado Lima', city: 'Goiania, GO', segment: 'Atacado alimentar', tags: ['tracking', 'risco', 'prazo'], note: 'operacao sob observacao por divergencia de tracking' },
    { name: 'Igor Paiva', company: 'Mercado Vitta', city: 'Ribeirao Preto, SP', segment: 'Supermercado', tags: ['simulacao', 'margem', 'urgente'], note: 'cotacao recorrente com decisao rapida' },
    { name: 'Renata Silva', company: 'Construmais', city: 'Campinas, SP', segment: 'Material de construcao', tags: ['pedido', 'aprovacao', 'alto-ticket'], note: 'handoff frequente entre vendas e logistica' },
    { name: 'Marcos Teixeira', company: 'Drogaria Central', city: 'Belo Horizonte, MG', segment: 'Farmacia', tags: ['compliance', 'documento', 'comprovante'], note: 'atendimento com trilha e documentos sensiveis' },
    { name: 'Luciana Prado', company: 'Autopecas Delta', city: 'Curitiba, PR', segment: 'Autopecas', tags: ['frete', 'margem', 'revisao'], note: 'margem logistica monitorada de perto' },
    { name: 'Daniel Costa', company: 'Grupo Horizonte', city: 'Sao Paulo, SP', segment: 'Distribuicao nacional', tags: ['enterprise', 'sla', 'escalonamento'], note: 'conta enterprise com escalonamento rapido' },
    { name: 'Marta Nunes', company: 'Padaria Imperial', city: 'Niteroi, RJ', segment: 'Food service', tags: ['rota', 'cadastro', 'coleta'], note: 'alto giro com baixa tolerancia a erro' },
    { name: 'Andre Moura', company: 'TechLab Pro', city: 'Barueri, SP', segment: 'Eletronicos', tags: ['tracking', 'pedido-parcial', 'suporte'], note: 'embarque fracionado e visibilidade rigorosa' },
    { name: 'Talita Braga', company: 'Armazem do Vale', city: 'Joinville, SC', segment: 'Mercearia', tags: ['faturamento', 'simulacao', 'divergencia'], note: 'duvidas entre operacao e financeiro' },
    { name: 'Vitor Rocha', company: 'Eletro Prime', city: 'Guarulhos, SP', segment: 'E-commerce', tags: ['whatsapp', 'sla', 'reabertura'], note: 'tempo de resposta impacta recompra' },
    { name: 'Bianca Freitas', company: 'Casa Verde', city: 'Florianopolis, SC', segment: 'Home decor', tags: ['cancelamento', 'churn', 'prazo'], note: 'risco de churn em ruptura de prazo' },
    { name: 'Felipe Tavares', company: 'Bebidas Aurora', city: 'Salvador, BA', segment: 'Distribuidor', tags: ['janela', 'restricao', 'entrega'], note: 'restricao forte de horario de recebimento' },
    { name: 'Larissa Pires', company: 'Moda Leste', city: 'Sao Jose dos Campos, SP', segment: 'Fashion retail', tags: ['reabertura', 'cx', 'prioridade'], note: 'experiencia de atendimento sensivel' },
    { name: 'Gustavo Lima', company: 'Clinica Viva', city: 'Brasilia, DF', segment: 'Saude', tags: ['urgente', 'sensivel', 'entrega'], note: 'itens sensiveis com tolerancia baixa a atraso' },
    { name: 'Patricia Cezar', company: 'Metalurgica Sudoeste', city: 'Sorocaba, SP', segment: 'Industria', tags: ['veiculo', 'regra', 'descarga'], note: 'regras operacionais de acesso e descarga' },
    { name: 'Otavio Brito', company: 'Livraria Atlas', city: 'Porto Alegre, RS', segment: 'Editorial', tags: ['email', 'tracking', 'follow-up'], note: 'uso forte de email para follow-up operacional' },
    { name: 'Aline Duarte', company: 'Agro Serra', city: 'Cuiaba, MT', segment: 'Agro distribuicao', tags: ['contingencia', 'agro', 'rota-longa'], note: 'contingencia recorrente em rota longa' },
    { name: 'Nicolas Campos', company: 'Papelaria Ponto', city: 'Maceio, AL', segment: 'Papelaria', tags: ['pedido', 'duvida', 'baixo-ticket'], note: 'alto volume de duvidas repetitivas' },
    { name: 'Julia Nogueira', company: 'Cosmeticos Coral', city: 'Manaus, AM', segment: 'Beleza', tags: ['sla', 'estoque', 'atendimento'], note: 'cliente atento a prazo e ruptura de estoque' },
    { name: 'Bruno Gama', company: 'Ferragens Centro', city: 'Londrina, PR', segment: 'Ferragens', tags: ['coleta', 'regra', 'b2b'], note: 'coletas com dependencia de janela industrial' },
    { name: 'Helena Voss', company: 'Hospitalar Max', city: 'Sao Luis, MA', segment: 'Hospitalar', tags: ['compliance', 'urgente', 'tracking'], note: 'pedido sensivel com governanca forte' },
    { name: 'Caio Barreto', company: 'Moveis Vale', city: 'Vitoria, ES', segment: 'Moveis', tags: ['ticket-alto', 'coleta', 'montagem'], note: 'ticket medio alto e forte dependencia de coleta' },
    { name: 'Priscila Araujo', company: 'Distribuidora Prisma', city: 'Belem, PA', segment: 'Distribuicao regional', tags: ['simulacao', 'margem', 'volume'], note: 'alto volume e comparacao constante de frete' },
] as const;

function money(value: number) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function buildConversations(index: number, company: string): ClientConversationActivity[] {
    return [
        {
            id: `conv-${index + 1}-1`,
            channel: 'WhatsApp',
            title: `${company}: atualizacao de prazo e proxima coleta`,
            owner: owners[index % owners.length],
            status: index % 4 === 0 ? 'escalada' : index % 3 === 0 ? 'em-atendimento' : 'aberta',
            updatedAt: index < 5 ? `${6 + index} min` : `Hoje ${String(8 + (index % 6)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}`,
        },
        {
            id: `conv-${index + 1}-2`,
            channel: 'Email',
            title: `${company}: comprovante e follow-up operacional`,
            owner: owners[(index + 1) % owners.length],
            status: index % 5 === 0 ? 'resolvida' : 'em-atendimento',
            updatedAt: 'Ontem',
        },
        {
            id: `conv-${index + 1}-3`,
            channel: 'Portal',
            title: `${company}: solicitacao de ajuste cadastral`,
            owner: owners[(index + 2) % owners.length],
            status: 'resolvida',
            updatedAt: '2d',
        },
    ];
}

function buildOrders(index: number): ClientOrderActivity[] {
    return [
        {
            id: `${1830 + index}`,
            status: index % 4 === 0 ? 'aguardando-aprovacao' : index % 3 === 0 ? 'coleta' : 'processando',
            total: money(420 + index * 28),
            updatedAt: index < 8 ? `${10 + index} min` : 'Hoje',
        },
        {
            id: `${1730 + index}`,
            status: 'entregue',
            total: money(260 + index * 17),
            updatedAt: 'Ontem',
        },
        {
            id: `${1630 + index}`,
            status: 'entregue',
            total: money(310 + index * 13),
            updatedAt: '3d',
        },
    ];
}

function buildSimulations(index: number): ClientSimulationActivity[] {
    return [
        {
            id: `SIM-${4200 + index}`,
            carrier: index % 2 === 0 ? 'Braspress' : 'Jadlog',
            route: index % 2 === 0 ? 'SP > CE' : 'SP > GO',
            value: money(88 + index * 4),
            status: index % 3 === 0 ? 'contingencia' : 'aprovada',
            updatedAt: index < 6 ? `${5 + index} min` : 'Hoje',
        },
        {
            id: `SIM-${5200 + index}`,
            carrier: index % 2 === 0 ? 'Azul Cargo' : 'Latam Cargo',
            route: index % 2 === 0 ? 'CE > PE' : 'MG > SP',
            value: money(112 + index * 3),
            status: index % 4 === 0 ? 'pendente' : 'aprovada',
            updatedAt: 'Ontem',
        },
    ];
}

function getLastActivity(index: number) {
    if (index === 0) {
        return 'Agora';
    }
    if (index < 6) {
        return `${index * 9} min`;
    }
    if (index < 15) {
        return `Hoje ${String(8 + (index % 8)).padStart(2, '0')}:${String((index * 11) % 60).padStart(2, '0')}`;
    }
    return index % 2 === 0 ? 'Ontem' : '2d';
}

export const mockClients: ClientRecord[] = clientSeeds.map((seed, index) => {
    const status = statuses[index % statuses.length];
    const activityBucket = activityBuckets[index % activityBuckets.length];
    const orderCount = 8 + (index % 9);
    const conversationCount = 3 + (index % 6);
    const simulationCount = 5 + (index % 7);

    return {
        id: `client-${index + 1}`,
        name: seed.name,
        company: seed.company,
        contact: `${seed.name} • ${index % 2 === 0 ? 'Compras' : 'Operacoes'}`,
        email: `contato${index + 1}@${seed.company.toLowerCase().replace(/\s+/g, '')}.com.br`,
        phone: `+55 11 9${String(1000 + index * 37).slice(0, 4)}-${String(2000 + index * 19).slice(0, 4)}`,
        city: seed.city,
        segment: seed.segment,
        status,
        activityBucket,
        lastActivity: getLastActivity(index),
        orderCount,
        conversationCount,
        simulationCount,
        averageTicket: money(260 + index * 21),
        lastInteraction: index < 6 ? `${7 + index} min` : index < 14 ? 'Hoje' : 'Ontem',
        summary: `${seed.company} atua em ${seed.segment.toLowerCase()} e hoje exige leitura operacional unica entre atendimento, pedidos e frete, com foco em ${seed.note}.`,
        tags: seed.tags,
        conversations: buildConversations(index, seed.company),
        orders: buildOrders(index),
        simulations: buildSimulations(index),
    };
});
