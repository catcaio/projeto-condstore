import { ClickUpClient } from '../tools/clickup/clickup-client';

async function main() {
  const client = new ClickUpClient();
  const taskId = '86e1aeenp';

  try {
    console.log(`Fetching ClickUp Task: ${taskId}`);
    const task = await client.getTask(taskId);
    console.log(JSON.stringify(task, null, 2));
  } catch (error: any) {
    console.error("Failed to fetch task:", error.message);
  }
}

main();
