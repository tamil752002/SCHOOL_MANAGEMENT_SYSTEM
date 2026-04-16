import { createClient } from 'redis';
import { config } from 'dotenv';

config();

let redisClient = null;
let isConnected = false;

/**
 * Get or create Redis client
 * @returns {Promise<RedisClientType>} Redis client instance
 */
export async function getRedisClient() {
    // ✅ Better check
    if (redisClient?.isOpen) {
        return redisClient;
    }

    try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const isSecure = redisUrl.startsWith('rediss://');

        redisClient = createClient({
            url: redisUrl,
            socket: {
                tls: isSecure,
                rejectUnauthorized: false,
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('Redis: Max reconnection attempts reached');
                        return new Error('Max reconnection attempts reached');
                    }
                    return Math.min(retries * 50, 3000);
                }
            }
        });

        // ✅ Events (important for debugging)
        redisClient.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });

        redisClient.on('connect', () => {
            console.log('Redis: Connecting...');
        });

        redisClient.on('ready', () => {
            console.log('Redis: Connected and ready');
        });

        redisClient.on('reconnecting', () => {
            console.log('Redis: Reconnecting...');
        });

        redisClient.on('end', () => {
            console.log('Redis: Connection ended');
        });

        // ✅ MUST CONNECT
        await redisClient.connect();

        return redisClient;

    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        return null;
    }
}

/**
 * Close Redis connection
 */
export async function closeRedisClient() {
    if (redisClient && isConnected) {
        try {
            await redisClient.quit();
            isConnected = false;
            console.log('Redis: Connection closed');
        } catch (error) {
            console.error('Error closing Redis connection:', error);
        }
    }
}

/**
 * Check if Redis is available
 * @returns {Promise<boolean>}
 */
export async function isRedisAvailable() {
    try {
        const client = await getRedisClient();
        if (!client) return false;
        // Check if client is ready (v5 API)
        if (client.isReady !== undefined) {
            if (!client.isReady) return false;
        }
        await client.ping();
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached value or null
 */
export async function getCache(key) {
    try {
        const client = await getRedisClient();
        if (!client) return null;

        const value = await client.get(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error(`Redis get error for key ${key}:`, error);
        return null;
    }
}

/**
 * Set cached value
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 300)
 * @returns {Promise<boolean>} Success status
 */
export async function setCache(key, value, ttl = 300) {
    try {
        const client = await getRedisClient();
        if (!client) return false;

        await client.setEx(key, ttl, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Redis set error for key ${key}:`, error);
        return false;
    }
}

/**
 * Delete cached value
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
export async function deleteCache(key) {
    try {
        const client = await getRedisClient();
        if (!client) return false;

        await client.del(key);
        return true;
    } catch (error) {
        console.error(`Redis delete error for key ${key}:`, error);
        return false;
    }
}

/**
 * Delete multiple cached values by pattern
 * @param {string} pattern - Pattern to match (e.g., 'school:*')
 * @returns {Promise<number>} Number of keys deleted
 */
export async function deleteCacheByPattern(pattern) {
    try {
        const client = await getRedisClient();
        if (!client) return 0;

        const keys = await client.keys(pattern);
        if (keys.length === 0) return 0;

        return await client.del(keys);
    } catch (error) {
        console.error(`Redis delete pattern error for ${pattern}:`, error);
        return 0;
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    await closeRedisClient();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeRedisClient();
    process.exit(0);
});

