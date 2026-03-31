import { getCache, setCache, deleteCache, deleteCacheByPattern as redisDeleteCacheByPattern } from '../utils/redis.js';

// Re-export for convenience
export { deleteCacheByPattern } from '../utils/redis.js';

const DEFAULT_TTL = parseInt(process.env.CACHE_TTL || '300', 10); // Default 5 minutes

/**
 * Generate cache key from request
 * @param {Object} req - Express request object
 * @param {string} prefix - Cache key prefix
 * @returns {string} Cache key
 */
function generateCacheKey(req, prefix = 'api') {
    const url = req.originalUrl || req.url;
    const query = req.query ? JSON.stringify(req.query) : '';
    const schoolId = req.query?.schoolId || req.body?.schoolId || '';
    return `${prefix}:${url}:${query}:${schoolId}`;
}

/**
 * Cache middleware for GET requests
 * @param {Object} options - Middleware options
 * @param {number} options.ttl - Time to live in seconds
 * @param {string} options.prefix - Cache key prefix
 * @param {Function} options.keyGenerator - Custom key generator function
 * @returns {Function} Express middleware
 */
export function cacheMiddleware(options = {}) {
    const ttl = options.ttl || DEFAULT_TTL;
    const prefix = options.prefix || 'api';
    const keyGenerator = options.keyGenerator || generateCacheKey;

    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Skip caching if explicitly disabled
        if (req.query?.noCache === 'true' || req.headers['x-no-cache'] === 'true') {
            return next();
        }

        try {
            const cacheKey = keyGenerator(req, prefix);
            const cachedData = await getCache(cacheKey);

            if (cachedData !== null) {
                // Set cache hit header
                res.setHeader('X-Cache', 'HIT');
                return res.json(cachedData);
            }

            // Store original json method
            const originalJson = res.json.bind(res);

            // Override json method to cache response
            res.json = function (data) {
                // Cache the response
                setCache(cacheKey, data, ttl).catch(err => {
                    console.error('Failed to cache response:', err);
                });

                // Set cache miss header
                res.setHeader('X-Cache', 'MISS');
                return originalJson(data);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
            // Continue without caching if there's an error
            next();
        }
    };
}

/**
 * Invalidate cache for specific patterns
 * @param {string|string[]} patterns - Cache key patterns to invalidate
 * @returns {Function} Express middleware
 */
export function invalidateCache(patterns) {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];

    return async (req, res, next) => {
        try {
            // Invalidate cache after response is sent
            res.on('finish', async () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    for (const pattern of patternArray) {
                        await redisDeleteCacheByPattern(pattern);
                    }
                }
            });
        } catch (error) {
            console.error('Cache invalidation error:', error);
        }
        next();
    };
}

/**
 * Invalidate cache by key
 * @param {Function} keyGenerator - Function to generate cache key from request
 * @returns {Function} Express middleware
 */
export function invalidateCacheByKey(keyGenerator) {
    return async (req, res, next) => {
        try {
            // Invalidate cache after response is sent
            res.on('finish', async () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const cacheKey = keyGenerator(req);
                    await deleteCache(cacheKey);
                }
            });
        } catch (error) {
            console.error('Cache invalidation error:', error);
        }
        next();
    };
}

/**
 * Helper to invalidate school-specific cache
 * @param {string} schoolId - School ID
 */
export async function invalidateSchoolCache(schoolId) {
    try {
        await redisDeleteCacheByPattern(`api:*schoolId*${schoolId}*`);
        await redisDeleteCacheByPattern(`api:*${schoolId}*`);
        await redisDeleteCacheByPattern(`api:/data*${schoolId}*`);
        await redisDeleteCacheByPattern(`api:data:*${schoolId}*`);
    } catch (error) {
        console.error('Error invalidating school cache:', error);
    }
}

