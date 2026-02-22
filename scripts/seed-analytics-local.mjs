import mysql from 'mysql2/promise';
import crypto from 'node:crypto';

const connectionUri = process.env.DATABASE_URL || 'mysql://user:pass@127.0.0.1:3306/lojacond';

async function main() {
  const conn = await mysql.createConnection({ uri: connectionUri });

  const anonId = 'anon_test';
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const events = [
    ['landing_view', '/'],
    ['pricing_view', '/pricing'],
    ['pricing_click_checkout', '/pricing'],
  ];

  for (const [event, path] of events) {
    await conn.execute(
      `INSERT INTO public_events (id, anon_id, event, path, props, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)` ,
      [crypto.randomUUID(), anonId, event, path, JSON.stringify({ seeded: true }), 'seed-script', now],
    );
  }

  console.log('Seeded 3 analytics events for anon_test.');
  await conn.end();
}

main().catch((error) => {
  console.error('Failed to seed analytics events:', error);
  process.exit(1);
});
