import { ClickUpClient } from '../clickup-client';
import { clickupLogger } from '../clickup-logger';
import { clickupConfig } from '../clickup-config';

async function main() {
  const client = new ClickUpClient();
  const spaceId = clickupConfig.defaultSpaceId;

  if (!spaceId) {
    clickupLogger.error('CLICKUP_DEFAULT_SPACE_ID not set.');
    return;
  }

  try {
    clickupLogger.info(`Fetching hierarchy for Space ID: ${spaceId}`);
    
    const foldersData = await client.getFolders(spaceId);
    const folders = foldersData.folders || [];
    
    for (const folder of folders) {
      console.log(`\n📁 Folder: ${folder.name} (ID: ${folder.id})`);
      const listsData = await client.getLists(folder.id);
      const lists = listsData.lists || [];
      for (const list of lists) {
        console.log(`   └─ 📋 List: ${list.name} (ID: ${list.id}) [Tasks: ${list.task_count || 0}]`);
      }
    }
  } catch (error: any) {
    clickupLogger.error('Failed to fetch hierarchy:', error.message);
  }
}

main();
