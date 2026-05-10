import { ClickUpClient } from '../tools/clickup/clickup-client';

async function main() {
  const client = new ClickUpClient();
  const taskId = '86e1aeenp';
  console.log(`Updating task ${taskId} to concluído...`);
  const result = await client.updateTask(taskId, { status: 'concluído' });
  if (result) {
    console.log('Task updated successfully.');
  }
}

main();
