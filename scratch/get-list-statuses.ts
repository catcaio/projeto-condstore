import { ClickUpClient } from '../tools/clickup/clickup-client';

async function main() {
  const client = new ClickUpClient();
  const list = await (client as any).request('GET', '/list/901712443601');
  console.log(JSON.stringify(list.statuses, null, 2));
}

main();
