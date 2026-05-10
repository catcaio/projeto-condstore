import { ClickUpClient } from '../clickup-client';
import { clickupLogger } from '../clickup-logger';

async function main() {
  const args = process.argv.slice(2);
  const taskId = args[0];
  const reportText = args[1];

  if (!taskId || !reportText) {
    clickupLogger.error("Usage: npm run clickup:sync-report <taskId> <reportText>");
    return;
  }

  const client = new ClickUpClient();

  try {
    clickupLogger.info(`Syncing agent report to Task: ${taskId}`);
    const comment = await client.createTaskComment(taskId, reportText);

    if (comment) {
      clickupLogger.success(`Report synced as comment (ID: ${comment.id})`);
    }
  } catch (error: any) {
    clickupLogger.error("Failed to sync report:", error.message);
  }
}

main();
