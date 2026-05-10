import { ClickUpClient } from '../clickup-client';
import { clickupLogger } from '../clickup-logger';

async function main() {
  const args = process.argv.slice(2);
  const listId = args[0];
  const taskName = args[1];
  const description = args[2] || "";

  if (!listId || !taskName) {
    clickupLogger.error("Usage: npm run clickup:create-task <listId> <taskName> [description]");
    return;
  }

  const client = new ClickUpClient();

  try {
    clickupLogger.info(`Creating task: ${taskName} in List: ${listId}`);
    const task = await client.createTask(listId, {
      name: taskName,
      description: description
    });

    if (task) {
      clickupLogger.success(`Task created: ${task.url}`);
    }
  } catch (error: any) {
    clickupLogger.error("Failed to create task:", error.message);
  }
}

main();
