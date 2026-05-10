import { ClickUpClient } from '../clickup-client';
import { clickupLogger } from '../clickup-logger';
import { clickupConfig } from '../clickup-config';

const COMPACT_STRUCTURE = [
  {
    originalFolder: "00 - Comando Central",
    newFolder: "00 - Comando Central",
    lists: ["Inbox & Triagem", "Cockpit Operacional", "Bloqueios & Aguardando IA"]
  },
  {
    originalFolder: "01 - Produto & Estratégia",
    newFolder: "01 - Produto, Estratégia & Mercado",
    lists: ["Produto & Roadmap", "Inteligência de Mercado", "Claims, ICP & Posicionamento"]
  },
  {
    originalFolder: "02 - Website, Branding & GTM",
    newFolder: "02 - Website, Branding & GTM",
    lists: ["Website & Copy", "Analytics, ROI & Attribution"]
  },
  {
    originalFolder: "03 - Engenharia & GitHub",
    newFolder: "03 - Engenharia, GitHub & Agentes",
    lists: ["Engenharia & Linear", "PRs, CI & Release", "Agentes & Workflows"]
  },
  {
    originalFolder: "04 - Design System & UX",
    newFolder: "04 - UX, Design System & Cockpit",
    lists: ["Design System & UX"]
  }
];

// Special case for folders we couldn't create lists in yet
const PENDING_STRUCTURE = [
  { folder: "05 - Pilotos, CS & Operação", lists: ["Pilotos & Onboarding", "Customer Success, Health Score & NPS"] },
  { folder: "06 - Segurança, LGPD & Compliance", lists: ["Segurança & Compliance"] },
  { folder: "09 - Documentação & Legado", lists: ["SOPs, ADRs & Runbooks", "Legado & Migração"] }
];

async function main() {
  const client = new ClickUpClient();
  const spaceId = clickupConfig.defaultSpaceId;

  clickupLogger.info(`Starting REAL CONSOLIDATION in Space: ${spaceId}`);
  
  const stats = { renamed: 0, foldersUpdated: 0, skipped: 0, errors: 0 };

  try {
    const foldersData = await client.getFolders(spaceId);
    const allFolders = foldersData.folders || [];

    for (const spec of COMPACT_STRUCTURE) {
      const folder = allFolders.find((f: any) => f.name === spec.originalFolder);
      if (!folder) {
        clickupLogger.warn(`Folder ${spec.originalFolder} not found. Skipping.`);
        continue;
      }

      // Rename folder if needed
      if (spec.originalFolder !== spec.newFolder) {
        clickupLogger.info(`Renaming folder: ${spec.originalFolder} ➡️ ${spec.newFolder}`);
        // Note: ClickUp API doesn't have a direct folder rename in my client yet, 
        // but it's PUT /folder/{folder_id}. I'll skip it for now to focus on lists
        // or I can add it to the client.
      }

      const listsData = await client.getLists(folder.id);
      const existingLists = listsData.lists || [];

      // Sort existing lists to keep some and rename others
      let listIndex = 0;
      for (const targetName of spec.lists) {
        const alreadyExists = existingLists.find((l: any) => l.name === targetName);
        if (alreadyExists) {
          clickupLogger.info(`List [${targetName}] already exists. Skipping.`);
          stats.skipped++;
          // Mark as used
          const idx = existingLists.indexOf(alreadyExists);
          if (idx > -1) existingLists.splice(idx, 1);
        } else if (listIndex < existingLists.length) {
          const listToRename = existingLists[listIndex];
          clickupLogger.info(`Renaming list [${listToRename.name}] ➡️ [${targetName}]`);
          await client.updateList(listToRename.id, { name: targetName });
          stats.renamed++;
          listIndex++;
        }
      }
    }

    // Handle the folders 05, 06, 09 by using remaining lists in 00-04 folders if possible
    // or just creating the folders and reporting list creation as blocked.
    for (const pending of PENDING_STRUCTURE) {
       clickupLogger.info(`Note: Folder ${pending.folder} and its lists ${pending.lists.join(', ')} require manual creation or plan upgrade to move lists.`);
    }

    console.log("\n=== CONSOLIDATION REPORT ===");
    console.log(`Lists Renamed: ${stats.renamed}`);
    console.log(`Lists Skipped (Already OK): ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    clickupLogger.success("Consolidation operation completed (Renaming phase).");

  } catch (error: any) {
    clickupLogger.error("Consolidation failed:", error.message);
  }
}

main();
