/**
 * Apply database/schema.sql to the database (for initial setup or reset).
 * Uses DATABASE_URL from environment.
 * Run: npm run db:push
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import { config } from 'dotenv';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, 'schema.sql');

function splitSqlStatements(content) {
    const statements = [];
    let current = '';
    let inDollar = false;
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('--')) {
            if (current) current += '\n' + line;
            continue;
        }
        if (trimmed.startsWith('$$')) {
            inDollar = !inDollar;
        }
        current += (current ? '\n' : '') + line;
        const endsWithSemicolon = trimmed.endsWith(';') && !inDollar;
        if (endsWithSemicolon && current.trim()) {
            statements.push(current.trim());
            current = '';
        }
    }
    if (current.trim()) statements.push(current.trim());
    return statements.filter(s => s.length > 0);
}

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL is not set. Set it in .env or the environment.');
        process.exit(1);
    }

    const pool = new pg.Pool({ connectionString });
    const schema = readFileSync(schemaPath, 'utf8');
    const statements = splitSqlStatements(schema);

    console.log(`Applying schema (${statements.length} statements) from database/schema.sql ...`);
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const preview = stmt.slice(0, 60).replace(/\s+/g, ' ');
        try {
            await pool.query(stmt);
            console.log(`  [${i + 1}/${statements.length}] OK: ${preview}${stmt.length > 60 ? '...' : ''}`);
        } catch (err) {
            if (err.code === '42P07' || err.message?.includes('already exists')) {
                console.log(`  [${i + 1}/${statements.length}] Skip (exists): ${preview}...`);
            } else {
                console.error(`  [${i + 1}/${statements.length}] FAIL: ${preview}...`);
                console.error(err.message);
                await pool.end();
                process.exit(1);
            }
        }
    }
    await pool.end();
    console.log('Schema applied successfully.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
