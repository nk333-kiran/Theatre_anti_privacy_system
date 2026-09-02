"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobQueue = exports.JobQueue = void 0;
const crypto_1 = __importDefault(require("crypto"));
const events_1 = require("events");
const logger_1 = require("../logging/logger");
class JobQueue extends events_1.EventEmitter {
    queue = new Map();
    handlers = new Map();
    isProcessing = false;
    concurrency = 3;
    activeJobsCount = 0;
    constructor() {
        super();
    }
    registerHandler(type, handler) {
        this.handlers.set(type, handler);
        logger_1.logger.info(`[JobQueue] Registered background handler for job type: ${type}`);
    }
    async add(type, data, options) {
        const job = {
            id: `job_${Date.now()}_${crypto_1.default.randomBytes(3).toString("hex")}`,
            type,
            data,
            status: "PENDING",
            retryCount: 0,
            maxRetries: options?.maxRetries ?? 3,
            progress: 0,
            createdAt: new Date(),
        };
        this.queue.set(job.id, job);
        logger_1.logger.info(`[JobQueue] Added job ${job.id} (${job.type}) to queue`);
        this.emit("job_added", job);
        this.processNext();
        return job;
    }
    getJob(id) {
        return this.queue.get(id);
    }
    getAllJobs() {
        return Array.from(this.queue.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    getQueueStats() {
        const jobs = Array.from(this.queue.values());
        return {
            total: jobs.length,
            pending: jobs.filter((j) => j.status === "PENDING").length,
            processing: jobs.filter((j) => j.status === "PROCESSING").length,
            completed: jobs.filter((j) => j.status === "COMPLETED").length,
            failed: jobs.filter((j) => j.status === "FAILED").length,
        };
    }
    async processNext() {
        if (this.activeJobsCount >= this.concurrency)
            return;
        const pendingJobs = Array.from(this.queue.values()).filter((j) => j.status === "PENDING" || j.status === "RETRYING");
        if (pendingJobs.length === 0)
            return;
        const job = pendingJobs[0];
        const handler = this.handlers.get(job.type);
        if (!handler) {
            logger_1.logger.error(`[JobQueue] No handler found for job type: ${job.type}`);
            job.status = "FAILED";
            job.error = `No handler registered for ${job.type}`;
            return;
        }
        this.activeJobsCount++;
        job.status = "PROCESSING";
        job.startedAt = new Date();
        try {
            logger_1.logger.info(`[JobQueue] Processing job ${job.id} (${job.type})`);
            const result = await handler(job);
            job.status = "COMPLETED";
            job.result = result;
            job.completedAt = new Date();
            job.progress = 100;
            logger_1.logger.info(`[JobQueue] Job ${job.id} COMPLETED successfully`);
            this.emit("job_completed", job);
        }
        catch (err) {
            job.error = err.message || "Unknown error";
            if (job.retryCount < job.maxRetries) {
                job.retryCount++;
                job.status = "RETRYING";
                const delayMs = Math.pow(2, job.retryCount) * 100; // Exponential backoff
                logger_1.logger.warn(`[JobQueue] Job ${job.id} failed (attempt ${job.retryCount}/${job.maxRetries}). Retrying in ${delayMs}ms...`);
                setTimeout(() => this.processNext(), delayMs);
            }
            else {
                job.status = "FAILED";
                job.completedAt = new Date();
                logger_1.logger.error(`[JobQueue] Job ${job.id} permanently FAILED after ${job.maxRetries} retries:`, err);
                this.emit("job_failed", job);
            }
        }
        finally {
            this.activeJobsCount--;
            this.processNext();
        }
    }
}
exports.JobQueue = JobQueue;
exports.jobQueue = new JobQueue();
