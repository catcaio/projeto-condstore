import { ClickUpClient } from '../clickup-client';
import { clickupLogger } from '../clickup-logger';
import { clickupConfig } from '../clickup-config';

async function main() {
  clickupLogger.info('Starting Smoke Test...');
  const client = new ClickUpClient();

  try {
    const teamsData = await client.getTeams();
    const teams = teamsData.teams || [];
    
    clickupLogger.success(`Successfully connected! Found ${teams.length} workspaces.`);
    
    const targetTeam = teams.find((t: any) => t.id === clickupConfig.workspaceId);
    if (targetTeam) {
      clickupLogger.success(`Target Workspace verified: ${targetTeam.name} (${targetTeam.id})`);
    } else {
      clickupLogger.warn(`Workspace ID ${clickupConfig.workspaceId} not found in available teams.`);
      clickupLogger.info('Available Workspaces:', teams.map((t: any) => ({ id: t.id, name: t.name })));
    }
  } catch (error: any) {
    clickupLogger.error('Smoke test failed:', error.message);
    process.exit(1);
  }
}

main();
