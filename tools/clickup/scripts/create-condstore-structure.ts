import { ClickUpClient } from '../clickup-client';
import { clickupLogger } from '../clickup-logger';
import { clickupConfig } from '../clickup-config';

const NEW_STRUCTURE = [
  {
    name: "00 - Comando Central",
    lists: ["00 - Inbox Geral", "01 - Cockpit Diário", "02 - Aguardando Retorno de IA", "03 - Bloqueios", "04 - Decisões Pendentes", "05 - Done com Evidências"]
  },
  {
    name: "01 - Produto & Estratégia",
    lists: ["01 - Matriz MVP / Roadmap / Invisível", "02 - Módulos e Frentes do Ecossistema", "03 - ICP, Dores e Posicionamento", "04 - Claims Permitidos e Proibidos", "05 - Roadmap Oficial", "06 - Backlog Estratégico"]
  },
  {
    name: "02 - Website, Branding & GTM",
    lists: ["01 - Arquitetura de Páginas", "02 - Copy e Narrativa", "03 - Landing Pages", "04 - Pricing / Planos", "05 - Demo / Piloto", "06 - SEO / Conteúdo", "07 - Analytics / ROI / Attribution"]
  },
  {
    name: "03 - Engenharia & GitHub",
    lists: ["01 - Intake Técnico", "02 - Linear Ready", "03 - Em Execução por Agente", "04 - PRs Abertas", "05 - CI / QA / Release", "06 - Bugs e Regressões", "07 - Migrations / Schema / Infra", "08 - Release Readiness"]
  },
  {
    name: "04 - Design System & UX",
    lists: ["01 - Design Tokens", "02 - Componentes", "03 - UX Público", "04 - UX Cockpit", "05 - Acessibilidade", "06 - Auditoria Visual"]
  },
  {
    name: "05 - Pilotos & Customer Success",
    lists: ["01 - Piloto Lojacond", "02 - Onboarding de Tenant", "03 - Implantação Assistida", "04 - Playbooks Verticais", "05 - Health Score", "06 - NPS / Pós-venda", "07 - Cases e Prova de ROI"]
  },
  {
    name: "06 - Segurança, LGPD & Compliance",
    lists: ["01 - Guardrails", "02 - Tenant Isolation", "03 - PII / Logs / Auditoria", "04 - Claims de Segurança", "05 - Revisões Críticas", "06 - Pendências MANUAL_RAFA"]
  },
  {
    name: "07 - Inteligência de Mercado",
    lists: ["01 - Pesquisas Perplexity", "02 - Concorrentes", "03 - CRM WhatsApp", "04 - Shipping / TMS", "05 - ERP Leve / Marketplace", "06 - Tendências SaaS B2B", "07 - Pricing Benchmark"]
  },
  {
    name: "08 - Agentes & Workflows",
    lists: ["01 - Workflows Oficiais", "02 - Prompts Mestres", "03 - Antigravity / Gemini 3.1 Pro", "04 - Codex", "05 - Jules", "06 - QA / PR Auditor / PR Closer", "07 - Smoke de Integrações"]
  },
  {
    name: "09 - Documentação, SOPs & ADRs",
    lists: ["01 - SOPs Operacionais", "02 - ADRs", "03 - Runbooks", "04 - Templates de Task", "05 - Pacotes de Contexto", "06 - Glossário CONDSTORE OS"]
  },
  {
    name: "99 - Legado & Migração",
    lists: ["01 - Tarefas Migradas", "02 - Tarefas Arquivadas", "03 - Itens Duplicados", "04 - Histórico PRs 269-276", "05 - Setup Antigo"]
  }
];

async function main() {
  const client = new ClickUpClient();
  const spaceId = clickupConfig.defaultSpaceId;

  if (clickupConfig.isDryRun) {
    clickupLogger.dryRun("=== DRY RUN: Proposed CONDSTORE OS Structure ===");
    for (const folder of NEW_STRUCTURE) {
      console.log(`📁 Folder: ${folder.name}`);
      for (const list of folder.lists) {
        console.log(`   └─ 📋 List: ${list}`);
      }
    }
    clickupLogger.info("\nTo create this structure, set CLICKUP_DRY_RUN=false in .env.local");
    return;
  }

  clickupLogger.info(`Starting REAL creation of CONDSTORE OS structure in Space: ${spaceId}`);

  const stats = {
    foldersCreated: 0,
    foldersSkipped: 0,
    listsCreated: 0,
    listsSkipped: 0,
    failed: 0
  };

  try {
    // 1. Get existing folders to avoid duplicates
    const existingFoldersData = await client.getFolders(spaceId);
    const existingFolders = existingFoldersData.folders || [];

    for (const folderSpec of NEW_STRUCTURE) {
      let folderId: string;
      const existingFolder = existingFolders.find((f: any) => f.name === folderSpec.name);

      if (existingFolder) {
        clickupLogger.info(`Folder [${folderSpec.name}] already exists. Skipping creation.`);
        folderId = existingFolder.id;
        stats.foldersSkipped++;
      } else {
        clickupLogger.info(`Creating Folder: ${folderSpec.name}`);
        const folder = await client.createFolder(spaceId, folderSpec.name);
        if (folder) {
          folderId = folder.id;
          stats.foldersCreated++;
        } else {
          clickupLogger.error(`Failed to create folder: ${folderSpec.name}`);
          stats.failed++;
          continue;
        }
      }

      // 2. Get existing lists in this folder
      const existingListsData = await client.getLists(folderId);
      const existingLists = existingListsData.lists || [];

      for (const listName of folderSpec.lists) {
        const existingList = existingLists.find((l: any) => l.name === listName);
        if (existingList) {
          clickupLogger.info(`   List [${listName}] already exists in folder ${folderSpec.name}. Skipping.`);
          stats.listsSkipped++;
        } else {
          clickupLogger.info(`   Creating List: ${listName}`);
          const list = await client.createList(folderId, listName);
          if (list) {
            stats.listsCreated++;
          } else {
            clickupLogger.error(`   Failed to create list: ${listName}`);
            stats.failed++;
          }
        }
      }
    }

    console.log("\n=== FINAL CREATION REPORT ===");
    console.log(`Folders Created: ${stats.foldersCreated}`);
    console.log(`Folders Skipped: ${stats.foldersSkipped}`);
    console.log(`Lists Created: ${stats.listsCreated}`);
    console.log(`Lists Skipped: ${stats.listsSkipped}`);
    console.log(`Failures: ${stats.failed}`);
    clickupLogger.success("Structure operation completed.");
  } catch (error: any) {
    clickupLogger.error("Failed to execute structure operation:", error.message);
  }
}

main();
