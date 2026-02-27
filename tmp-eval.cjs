const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
    try {
        const pool = mysql.createPool(process.env.DATABASE_URL);
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS ai_eval_runs (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                prompt_id VARCHAR(128) NOT NULL,
                prompt_version VARCHAR(50) NOT NULL,
                model VARCHAR(100) NOT NULL,
                score INT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                report_json JSON NOT NULL,
                INDEX idx_ai_eval_runs_prompt_id (prompt_id),
                INDEX idx_ai_eval_runs_created_at (created_at)
            )
        `);
        console.log('table created');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
