import { LinearClient } from '../tools/linear/linear-client';

const DONE_STATE_ID = '09caa56c-c5f7-4189-a956-456872bc45ac';

async function main() {
  const client = new LinearClient();
  try {
    const issue = await client.getIssueByIdentifier('MPV-71');
    if (issue.issue) {
      console.log(`Updating ${issue.issue.identifier} to Done...`);
      const result = await client.updateIssue(issue.issue.id, { stateId: DONE_STATE_ID });
      if (result.issueUpdate.success) {
        console.log('Success!');
      }
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

main();
