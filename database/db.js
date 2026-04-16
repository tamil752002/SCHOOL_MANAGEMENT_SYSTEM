import pg from 'pg';
import { config } from 'dotenv';

config();

const { Pool } = pg;

// Return DATE columns (OID 1082) as YYYY-MM-DD strings to avoid timezone shift when converting to JS Date
pg.types.setTypeParser(1082, 'text', (v) => (v === null ? null : String(v).split('T')[0]));

// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    // Connection pool settings
    max: parseInt(process.env.DB_POOL_MAX || '50', 10), // Maximum number of clients in the pool (default: 50)
    min: parseInt(process.env.DB_POOL_MIN || '5', 10), // Minimum number of clients in the pool (default: 5)
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10), // Close idle clients after 30 seconds
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10), // Return an error after 2 seconds if connection cannot be established
});

// Test connection
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    process.exit(-1);
});

// Helper function to execute queries
export async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

// Helper function to get a client from the pool (for transactions)
export function getClient() {
    return pool.connect();
}

export default pool;

