import 'dotenv/config';
import { getDb } from '../src/infra/db';

async function run() {
    const db = await getDb();
    
    await db.execute(`
        CREATE TABLE IF NOT EXISTS \`conversations\` (
            \`id\` varchar(36) NOT NULL,
            \`tenant_id\` varchar(36) NOT NULL,
            \`customer_id\` varchar(36),
            \`organization_id\` varchar(36),
            \`phone_hash\` varchar(64) NOT NULL,
            \`phone_encrypted\` varchar(255) NOT NULL,
            \`channel\` varchar(20) NOT NULL DEFAULT 'WHATSAPP',
            \`status\` varchar(30) NOT NULL DEFAULT 'OPEN',
            \`stage\` enum('NEW','QUALIFYING','QUOTED','NEGOTIATING','WON','LOST') NOT NULL DEFAULT 'NEW',
            \`assigned_to\` varchar(36),
            \`last_message_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
            \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT \`conversations_id\` PRIMARY KEY(\`id\`)
        );
    `);
    
    await db.execute(`
        CREATE TABLE IF NOT EXISTS \`conversation_messages\` (
            \`id\` varchar(36) NOT NULL,
            \`tenant_id\` varchar(36) NOT NULL,
            \`conversation_id\` varchar(36) NOT NULL,
            \`direction\` varchar(20) NOT NULL,
            \`source\` varchar(30) NOT NULL,
            \`message\` text NOT NULL,
            \`metadata\` json,
            \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT \`conversation_messages_id\` PRIMARY KEY(\`id\`)
        );
    `);
    
    await db.execute(`DROP TABLE IF EXISTS \`frank_suggestions\`;`);
    await db.execute(`
        CREATE TABLE IF NOT EXISTS \`frank_suggestions\` (
            \`id\` varchar(36) NOT NULL,
            \`tenant_id\` varchar(36) NOT NULL,
            \`session_id\` varchar(36) NOT NULL,
            \`conversation_id\` varchar(36) NOT NULL,
            \`intent\` varchar(50) NOT NULL,
            \`entities\` json NOT NULL,
            \`playbook_id\` varchar(36),
            \`suggested_response\` text NOT NULL,
            \`confidence\` float NOT NULL,
            \`status\` varchar(20) NOT NULL DEFAULT 'pending',
            \`edited_response\` text,
            \`approved_by\` varchar(36),
            \`approved_at\` timestamp NULL,
            \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT \`frank_suggestions_id\` PRIMARY KEY(\`id\`)
        );
    `);

    console.log("✅ Tables created.");
    process.exit(0);
}
run();
