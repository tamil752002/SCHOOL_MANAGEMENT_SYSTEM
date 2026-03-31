import cors from 'cors';
import { config } from 'dotenv';
import express from "express";
import type { Application, Request, Response } from "express";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import cluster from 'cluster';
import os from 'os';

import { query } from './database/db.js';

// Import modularized routes
import { globalErrorHandler } from "./server-modules/middleware/errorHandler.js";
import routes from './server-modules/routes/index.js';
// Initialize dotenv
config();

const HOST: string = process.env.HOST || '0.0.0.0';
const PORT: number = Number(process.env.PORT) || 8080;

const CLUSTER_MODE: boolean = process.env.CLUSTER_MODE !== 'false';

const NUM_WORKERS: number = process.env.CLUSTER_WORKERS
    ? parseInt(process.env.CLUSTER_WORKERS, 10)
    : os.cpus().length;


// Create Express app
function createApp(): Application {
    const app: Application = express();

    // Middleware
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));

    // Routes
    // app.use('/api', developerRoutes);
    // app.use('/api', dataRoutes);
    // app.use('/api/auth', authRoutes);
    // app.use('/api/students', studentRoutes);
    // app.use('/api/attendance', attendanceRoutes);
    // app.use('/api/fees', feeRoutes);
    // app.use('/api/exams', examRoutes);
    // app.use('/api/settings', settingsRoutes);
    // app.use('/api/teachers', teachersRoutes);
    // app.use('/api/subjects', subjectsRoutes);
    // app.use('/api/leave', leaveRoutes);
    // app.use('/api/classes', classesRoutes);
    // app.use('/api/enrollments', enrollmentsRoutes);
    app.use('/api',routes)

    // Health check endpoint
    app.get('/api/health', async (req: Request, res: Response) => {
        try {
            const health = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
                worker: cluster.isWorker ? cluster.worker?.id : 'single',
                database: 'unknown',
                redis: 'unknown'
            };

            // DB check
            try {
                await query('SELECT 1');
                health.database = 'connected';
            } catch {
                health.database = 'disconnected';
                health.status = 'degraded';
            }

            // Redis check
            try {
                const { isRedisAvailable } = await import(
                    './server-modules/utils/redis.js'
                );

                const redisAvailable = await isRedisAvailable();
                health.redis = redisAvailable ? 'connected' : 'disconnected';
            } catch {
                health.redis = 'not configured';
            }

            const statusCode = health.status === 'ok' ? 200 : 503;

            res.status(statusCode).json(health);
        } catch (error: any) {
            res.status(503).json({
                status: 'error',
                error: error.message
            });
        }
    });

    // Static files
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    if (process.env.NODE_ENV === 'production') {
        const distPath = join(__dirname, 'dist');

        if (existsSync(distPath)) {
            app.use(express.static(distPath));
        }
    }
    app.use(globalErrorHandler);
    return app;
}


// Start server
function startServer(): void {
    const app = createApp();

    app.listen(PORT, HOST, () => {
        const workerInfo = cluster.isWorker
            ? `Worker ${cluster.worker?.id}`
            : 'Single process';

        console.log(
            `${workerInfo} - Server running on http://${HOST}:${PORT}`
        );
    });
}


// Cluster mode
if (CLUSTER_MODE && cluster.isPrimary) {
    console.log(`Master process ${process.pid} is running`);
    console.log(`Starting ${NUM_WORKERS} workers...`);

    for (let i = 0; i < NUM_WORKERS; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(
            `Worker ${worker.process.pid} died (${signal || code}). Restarting...`
        );
        cluster.fork();
    });

    cluster.on('online', (worker) => {
        console.log(`Worker ${worker.process.pid} is online`);
    });

} else {
    startServer();
}