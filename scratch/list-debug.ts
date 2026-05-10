import { ClickUpClient } from '../tools/clickup/clickup-client';

async function main() {
  const c = new ClickUpClient();
  try {
    const data = await c.getLists('90178638377');
    console.log('Lists:', JSON.stringify(data.lists.map((l: any) => ({id: l.id, name: l.name})), null, 2));
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

main();
