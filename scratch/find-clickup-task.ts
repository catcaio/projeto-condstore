import { ClickUpClient } from '../tools/clickup/clickup-client';
import { clickupConfig } from '../tools/clickup/clickup-config';

async function main() {
  const client = new ClickUpClient();
  const spaceId = clickupConfig.defaultSpaceId;

  console.log(`Searching for PILOT tasks in Space: ${spaceId}`);
  
  const foldersData = await client.getFolders(spaceId);
  const folders = foldersData.folders || [];
  
  for (const folder of folders) {
    const listsData = await client.getLists(folder.id);
    const lists = listsData.lists || [];
    
    for (const list of lists) {
      const tasksData = await client.getTasks(list.id);
      const tasks = tasksData.tasks || [];
      
      for (const task of tasks) {
        if (task.name.includes('PILOT') || task.name.includes('Audit') || task.name.includes('MPV-106')) {
          console.log(`Found Task: ${task.name} (ID: ${task.id}) in List: ${list.name}`);
        }
      }
    }
  }
}

main();
