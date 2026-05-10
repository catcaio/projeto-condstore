import dotenv from 'dotenv';
import path from 'path';

// Load .env.local as priority
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

export const clickupConfig = {
  apiToken: process.env.CLICKUP_API_TOKEN || '',
  workspaceId: process.env.CLICKUP_WORKSPACE_ID || '',
  defaultSpaceId: process.env.CLICKUP_DEFAULT_SPACE_ID || '',
  condstoreFolderId: process.env.CLICKUP_CONDSTORE_FOLDER_ID || '',
  isDryRun: process.env.CLICKUP_DRY_RUN === 'true',
  allowDestructive: process.env.CLICKUP_ALLOW_DESTRUCTIVE === 'true',
  apiUrl: 'https://api.clickup.com/api/v2',
};

export function validateConfig() {
  const missing = [];
  if (!clickupConfig.apiToken) missing.push('CLICKUP_API_TOKEN');
  if (!clickupConfig.workspaceId) missing.push('CLICKUP_WORKSPACE_ID');

  if (missing.length > 0) {
    throw new Error(`Missing ClickUp configuration: ${missing.join(', ')}`);
  }
}
