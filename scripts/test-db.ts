import { createPool } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function testConnection() {
    console.log('Testing DB connection...');
    console.log('URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@')); // Mask password

    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing');
        process.exit(1);
    }

    try {
        const pool = createPool({
            uri: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: true,
            },
        });

        const connection = await pool.getConnection();
        console.log('Connected successfully!');

        const [rows] = await connection.execute('SELECT 1 as val');
        console.log('Query result:', rows);

        connection.release();
        await pool.end();
        console.log('Connection closed.');
    } catch (error) {
        console.error('Connection failed:', error);
        process.exit(1);
    }
}

testConnection();
