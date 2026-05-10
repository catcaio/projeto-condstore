import { ClickUpClient } from '../tools/clickup/clickup-client';

async function main() {
  const client = new ClickUpClient();
  const listId = '901712443601';

  console.log(`Listing tasks in List: ${listId}`);
  
  const tasksData = await client.getTasks(listId);
  const tasks = tasksData.tasks || [];
  
  for (const task of tasks) {
    console.log(`Task: ${task.name} (ID: ${task.id}) - Status: ${task.status.status}`);
  }
}

main();
