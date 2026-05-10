import { ClickUpClient } from '../clickup-client';
import { clickupLogger } from '../clickup-logger';
import { clickupConfig } from '../clickup-config';

async function main() {
  const client = new ClickUpClient();
  const spaceId = clickupConfig.defaultSpaceId;

  try {
    clickupLogger.info(`Fetching conveyor status for Space: ${spaceId}`);
    
    const foldersData = await client.getFolders(spaceId);
    const folders = foldersData.folders || [];
    
    console.log("\n🚀 ESTEIRA DE TRABALHO CONDSTORE - STATUS ATUAL\n");

    for (const folder of folders) {
      console.log(`📂 FOLDER: ${folder.name}`);
      const listsData = await client.getLists(folder.id);
      const lists = listsData.lists || [];
      
      for (const list of lists) {
        console.log(`  📋 LIST: ${list.name}`);
        const tasksData = await client.getTasks(list.id);
        const tasks = tasksData.tasks || [];
        
        if (tasks.length === 0) {
          console.log(`    (Nenhuma tarefa encontrada)`);
          continue;
        }

        const statusCount: Record<string, number> = {};
        for (const task of tasks) {
          const status = task.status.status.toUpperCase();
          statusCount[status] = (statusCount[status] || 0) + 1;
        }

        for (const [status, count] of Object.entries(statusCount)) {
          console.log(`    - ${status}: ${count} tarefa(s)`);
        }
        
        // Show last 3 tasks
        const recentTasks = tasks.slice(0, 3);
        recentTasks.forEach((t: any) => {
            console.log(`      • [${t.status.status}] ${t.name}`);
        });
        if (tasks.length > 3) console.log(`      ... + ${tasks.length - 3} outras`);
      }
      console.log("");
    }

    clickupLogger.success("Status report completed.");
  } catch (error: any) {
    clickupLogger.error("Failed to fetch status:", error.message);
  }
}

main();
