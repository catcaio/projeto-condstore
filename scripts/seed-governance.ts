import { db } from '../src/db/client';
import { 
    governanceSpaces, 
    governanceProjects, 
    governanceLists, 
    governanceTasks, 
    governanceTaskLinks, 
    governanceTaskComments 
} from '../src/drizzle/schema';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';

// WARN: DO NOT RUN IN PRODUCTION
if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    console.error('SEED SCRIPT CANNOT BE RUN IN PRODUCTION');
    process.exit(1);
}

const sysUserId = randomUUID();

export async function seedGovernance(tenantId: string) {
    console.log(`Starting Governance Seed for tenant: ${tenantId}`);

    // 1. Clean existing data for tenant to avoid duplicates in dev
    console.log('Cleaning existing demo data...');
    await db.delete(governanceTaskLinks).where(eq(governanceTaskLinks.tenantId, tenantId));
    await db.delete(governanceTaskComments).where(eq(governanceTaskComments.tenantId, tenantId));
    await db.delete(governanceTasks).where(eq(governanceTasks.tenantId, tenantId));
    await db.delete(governanceLists).where(eq(governanceLists.tenantId, tenantId));
    await db.delete(governanceProjects).where(eq(governanceProjects.tenantId, tenantId));
    await db.delete(governanceSpaces).where(eq(governanceSpaces.tenantId, tenantId));

    // 2. Create Main Space
    const spaceId = randomUUID();
    await db.insert(governanceSpaces).values({
        id: spaceId,
        tenantId,
        name: 'Condstore HQ',
        slug: 'hq',
        color: '#4F46E5', // brand-primary
    });
    console.log('Created Space HQ');

    // 3. Create Projects
    const projects = [
        { name: 'Core Platform', slug: 'core-platform', desc: 'Infra and technical debt' },
        { name: 'CRM & Operação', slug: 'crm-operacao', desc: 'Customer tracking and sales operations' },
        { name: 'Logística & Frete', slug: 'logistica-frete', desc: 'Freight and shipping interventions' },
        { name: 'Cockpit & Observabilidade', slug: 'cockpit-observabilidade', desc: 'Dashboards and alerts' },
    ];

    for (let i = 0; i < projects.length; i++) {
        const p = projects[i];
        const projectId = randomUUID();
        await db.insert(governanceProjects).values({
            id: projectId,
            tenantId,
            spaceId,
            name: p.name,
            slug: p.slug,
            description: p.desc,
            createdBy: sysUserId,
            sortOrder: i,
        });

        // 4. Create Standard Lists per project
        const listIds = {
            todo: randomUUID(),
            inProgress: randomUUID(),
            done: randomUUID()
        };

        await db.insert(governanceLists).values([
            { id: listIds.todo, tenantId, projectId, name: 'To Do', sortOrder: 0 },
            { id: listIds.inProgress, tenantId, projectId, name: 'In Progress', sortOrder: 1 },
            { id: listIds.done, tenantId, projectId, name: 'Done', sortOrder: 2 },
        ]);

        // 5. Create Realistic Tasks
        let tasks: any[] = [];
        if (p.slug === 'core-platform') {
            tasks.push({
                id: randomUUID(), tenantId, projectId, listId: listIds.inProgress,
                title: 'Ajuste de caching por tenant', priority: 'high', status: 'In Progress',
                reporterUserId: sysUserId, sourceType: 'manual', dueAt: new Date(Date.now() + 86400000)
            });
            tasks.push({
                id: randomUUID(), tenantId, projectId, listId: listIds.todo,
                title: 'Refatoração da camada de autenticação EDGE', priority: 'normal', status: 'To Do',
                reporterUserId: sysUserId, sourceType: 'manual'
            });
        }
        else if (p.slug === 'crm-operacao') {
            tasks.push({
                id: randomUUID(), tenantId, projectId, listId: listIds.todo,
                title: 'Onboarding do tenant enterprise (Acme Corp)', priority: 'urgent', status: 'To Do',
                reporterUserId: sysUserId, sourceType: 'system'
            });
            tasks.push({
                id: randomUUID(), tenantId, projectId, listId: listIds.inProgress,
                title: 'Follow-up de conversa estagnada no WhatsApp', priority: 'high', status: 'In Progress',
                reporterUserId: sysUserId, sourceType: 'system'
            });
        }
        else if (p.slug === 'logistica-frete') {
            const blockedTaskId = randomUUID();
            tasks.push({
                id: blockedTaskId, tenantId, projectId, listId: listIds.todo,
                title: 'Vincular simulação de frete ao pedido #1045', priority: 'urgent', status: 'Blocked',
                reporterUserId: sysUserId, sourceType: 'manual'
            });

            // Create a link
            await db.insert(governanceTaskLinks).values({
                id: randomUUID(), tenantId, taskId: blockedTaskId, 
                entityType: 'order', entityId: 'ORD-1045', label: 'Order Blocked'
            });
            
            // Create comment
            await db.insert(governanceTaskComments).values({
                id: randomUUID(), tenantId, taskId: blockedTaskId, authorUserId: sysUserId,
                body: 'API dos Correios retornou erro de timeout ao simular. Aguardando refactoring da integração.'
            });
        }
        else {
            tasks.push({
                id: randomUUID(), tenantId, projectId, listId: listIds.todo,
                title: 'Investigar latência na rota de metrics', priority: 'high', status: 'To Do',
                reporterUserId: sysUserId, sourceType: 'manual'
            });
        }

        if (tasks.length > 0) {
            await db.insert(governanceTasks).values(tasks);
        }
    }

    console.log(`Seed completed successfully for tenant ${tenantId}`);
}

// Minimal CLI execution handler
const tenantArg = process.argv[2];
if (tenantArg) {
    seedGovernance(tenantArg)
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Seed execution failed:', err);
            process.exit(1);
        });
} else {
    console.log('Usage: npx tsx scripts/seed-governance.ts <tenant_id>');
}
