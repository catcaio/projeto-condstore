import { mysqlTable, varchar, text, bigint, index } from 'drizzle-orm/mysql-core';

export const events = mysqlTable('events', {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }),
    name: varchar('name', { length: 128 }).notNull(),
    payloadJson: text('payload_json').notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
}, (table) => {
    return {
        userIdIdx: index('user_id_idx').on(table.userId),
        nameIdx: index('name_idx').on(table.name),
        createdAtIdx: index('created_at_idx').on(table.createdAt),
    };
});
