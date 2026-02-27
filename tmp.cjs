const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
    try {
        const pool = mysql.createPool(process.env.DATABASE_URL);
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS ai_prompts (
                id VARCHAR(128) NOT NULL,
                version VARCHAR(50) NOT NULL,
                system TEXT NOT NULL,
                temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
                max_tokens INT NOT NULL DEFAULT 1000,
                active INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id, version),
                INDEX idx_ai_prompts_active (active)
            )
        `);
        console.log('table created');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
