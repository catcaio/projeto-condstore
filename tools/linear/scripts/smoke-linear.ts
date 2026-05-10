import { LinearClient } from '../linear-client';

async function main() {
  const client = new LinearClient();
  try {
    const viewer = await client.getViewer();
    console.log('Connected as:', viewer.viewer.name);

    const teams = await client.getTeams();
    console.log('Available Teams:');
    teams.teams.nodes.forEach((t: any) => {
      console.log(`- [${t.key}] ${t.name} (ID: ${t.id})`);
    });

    const mpvTeam = teams.teams.nodes.find((t: any) => t.key === 'MPV');
    if (mpvTeam) {
      console.log('\nFound target team MPV!');
      const states = await client.getStates(mpvTeam.id);
      console.log('Available States:');
      states.team.states.nodes.forEach((s: any) => {
        console.log(`  - [${s.type}] ${s.name} (ID: ${s.id})`);
      });
    } else {
      console.log('\nTeam MPV not found.');
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

main();
