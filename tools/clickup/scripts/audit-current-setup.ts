import { ClickUpClient } from '../clickup-client';
import { clickupLogger } from '../clickup-logger';
import { clickupConfig } from '../clickup-config';

async function main() {
  const client = new ClickUpClient();
  const spaceId = clickupConfig.defaultSpaceId;

  try {
    clickupLogger.info(`Starting Audit of Space: ${spaceId}`);
    
    const foldersData = await client.getFolders(spaceId);
    const folders = foldersData.folders || [];
    
    let totalTasks = 0;
    let issues: string[] = [];

    for (const folder of folders) {
      const listsData = await client.getLists(folder.id);
      const lists = listsData.lists || [];
      
      for (const list of lists) {
        const tasksData = await client.getTasks(list.id);
        const tasks = tasksData.tasks || [];
        totalTasks += tasks.length;

        for (const task of tasks) {
          if (!task.assignees || task.assignees.length === 0) {
            issues.push(`Task [${task.name}] in List [${list.name}] has no assignee.`);
          }
          if (task.status.status === 'to do' && !task.description) {
             issues.push(`Task [${task.name}] in List [${list.name}] has no description and is in 'To Do'.`);
          }
        }
      }
    }

    console.log("\n=== AUDIT REPORT ===");
    console.log(`Total Folders: ${folders.length}`);
    console.log(`Total Tasks Found: ${totalTasks}`);
    console.log(`Potential Issues Found: ${issues.length}`);
    
    if (issues.length > 0) {
      console.log("\nIssue Details:");
      issues.slice(0, 10).forEach(i => console.log(`- ${i}`));
      if (issues.length > 10) console.log(`... and ${issues.length - 10} more.`);
    }

    clickupLogger.success("Audit completed.");
  } catch (error: any) {
    clickupLogger.error("Audit failed:", error.message);
  }
}

main();
