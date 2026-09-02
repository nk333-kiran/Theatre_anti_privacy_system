"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistentJobQueue = exports.PersistentJobQueue = void 0;
const crypto_1 = __importDefault(require("crypto"));
const events_1 = require("events");
const redisManager_1 = require("../redis/redisManager");
const logger_1 = require("../logging/logger");
class PersistentJobQueue extends events_1.EventEmitter {
    handlers = new Map();
    localQueue = new Map();
    deadLetterQueue = new Map();
    activeJobsCount = 0;
    concurrency = 4;
    constructor() {
        super();
    }
    registerHandler(type, handler) {
        this.handlers.set(type, handler);
        logger_1.logger.info(`[PersistentJobQueue] Registered handler for job type: ${type}`);
    }
    async add(type, data, options) {
        const redis = redisManager_1.redisManager.getProvider();
        // Deduplication check
        if (options?.deduplicationKey) {
            const lock = await redis.acquireLock(`dedup:${options.deduplicationKey}`, 30);
            if (!lock.acquired) {
                logger_1.logger.warn(`[PersistentJobQueue] Skipped duplicate job for dedup key: ${options.deduplicationKey}`);
                const existing = this.localQueue.get(options.deduplicationKey);
                if (existing)
                    return existing;
            }
        }
        const jobId = `job_${Date.now()}_${crypto_1.default.randomBytes(3).toString("hex")}`;
        const job = {
            id: jobId,
            type,
            data,
            status: "PENDING",
            retryCount: 0,
            maxRetries: options?.maxRetries ?? 3,
            progress: 0,
            createdAt: new Date(),
        };
        this.localQueue.set(job.id, job);
        logger_1.logger.info(`[PersistentJobQueue] Added job ${job.id} (${type})`);
        this.emit("job_added", job);
        this.processNext();
        return job;
    }
    getJob(id) {
        return this.localQueue.get(id) || this.deadLetterQueue.get(id);
    }
    cancelJob(id) {
        const job = this.localQueue.get(id);
        if (job && (job.status === "PENDING" || job.status === "RETRYING")) {
            job.status = "FAILED";
            job.error = "Cancelled by operator";
            job.completedAt = new Date();
            logger_1.logger.info(`[PersistentJobQueue] Cancelled job ${id}`);
            return true;
        }
        return false;
    }
    getQueueStats() {
        const jobs = Array.from(this.localQueue.values());
        return {
            total: jobs.length + this.deadLetterQueue.size,
            pending: jobs.filter((j) => j.status === "PENDING").length,
            processing: jobs.filter((j) => j.status === "PROCESSING").length,
            completed: jobs.filter((j) => j.status === "COMPLETED").length,
            failed: jobs.filter((j) => j.status === "FAILED").length,
            deadLetterCount: this.deadLetterQueue.size,
            concurrency: this.concurrency,
            activeWorkers: this.activeJobsCount,
        };
    }
    getDeadLetterJobs() {
        return Array.from(this.deadLetterQueue.values());
    }
    async processNext() {
        if (this.activeJobsCount >= this.concurrency)
            return;
        const pending = Array.from(this.localQueue.values()).filter((j) => j.status === "PENDING" || j.status === "RETRYING");
        if (pending.length === 0)
            return;
        const job = pending[0];
        const handler = this.handlers.get(job.type);
        if (!handler) {
            job.status = "FAILED";
            job.error = `No handler registered for ${job.type}`;
            this.deadLetterQueue.set(job.id, job);
            this.localQueue.delete(job.id);
            return;
        }
        this.activeJobsCount++;
        job.status = "PROCESSING";
        job.startedAt = new Date();
        try {
            logger_1.logger.info(`[PersistentJobQueue] Processing job ${job.id} (${job.type})`);
            const result = await handler(job);
            job.status = "COMPLETED";
            job.result = result;
            job.progress = 100;
            job.completedAt = new Date();
            logger_1.logger.info(`[PersistentJobQueue] Job ${job.id} COMPLETED`);
            this.emit("job_completed", job);
        }
        catch (err) {
            job.error = err.message || "Execution error";
            if (job.retryCount < job.maxRetries) {
                job.retryCount++;
                job.status = "RETRYING";
                const backoffMs = Math.pow(2, job.retryCount) * 100;
                logger_1.logger.warn(`[PersistentJobQueue] Job ${job.id} failed. Retrying in ${backoffMs}ms...`);
                setTimeout(() => this.processNext(), backoffMs);
            }
            else {
                job.status = "FAILED";
                job.completedAt = new Date();
                logger_1.logger.error(`[PersistentJobQueue] Job ${job.id} routed to DEAD LETTER queue`);
                this.deadLetterQueue.set(job.id, job);
                this.localQueue.delete(job.id);
                this.emit("job_dead_letter", job);
            }
        }
        finally {
            this.activeJobsCount--;
            this.processNext();
        }
    }
}
exports.PersistentJobQueue = PersistentJobQueue;
exports.persistentJobQueue = new PersistentJobQueue();
