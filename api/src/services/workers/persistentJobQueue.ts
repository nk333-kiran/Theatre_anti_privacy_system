import crypto from "crypto";
import { EventEmitter } from "events";
import { Job, JobType, JobStatus, JobHandler } from "./types";
import { redisManager } from "../redis/redisManager";
import { logger } from "../logging/logger";

export interface PersistentJobOptions {
  maxRetries?: number;
  priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  deduplicationKey?: string;
  timeoutMs?: number;
}

export class PersistentJobQueue extends EventEmitter {
  private handlers: Map<JobType, JobHandler> = new Map();
  private localQueue: Map<string, Job> = new Map();
  private deadLetterQueue: Map<string, Job> = new Map();
  private activeJobsCount = 0;
  private concurrency = 4;

  constructor() {
    super();
  }

  public registerHandler<T = any>(type: JobType, handler: JobHandler<T>): void {
    this.handlers.set(type, handler);
    logger.info(`[PersistentJobQueue] Registered handler for job type: ${type}`);
  }

  public async add<T = any>(
    type: JobType,
    data: T,
    options?: PersistentJobOptions
  ): Promise<Job<T>> {
    const redis = redisManager.getProvider();

    // Deduplication check
    if (options?.deduplicationKey) {
      const lock = await redis.acquireLock(`dedup:${options.deduplicationKey}`, 30);
      if (!lock.acquired) {
        logger.warn(`[PersistentJobQueue] Skipped duplicate job for dedup key: ${options.deduplicationKey}`);
        const existing = this.localQueue.get(options.deduplicationKey);
        if (existing) return existing;
      }
    }

    const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const job: Job<T> = {
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
    logger.info(`[PersistentJobQueue] Added job ${job.id} (${type})`);
    this.emit("job_added", job);

    this.processNext();
    return job;
  }

  public getJob(id: string): Job | undefined {
    return this.localQueue.get(id) || this.deadLetterQueue.get(id);
  }

  public cancelJob(id: string): boolean {
    const job = this.localQueue.get(id);
    if (job && (job.status === "PENDING" || job.status === "RETRYING")) {
      job.status = "FAILED";
      job.error = "Cancelled by operator";
      job.completedAt = new Date();
      logger.info(`[PersistentJobQueue] Cancelled job ${id}`);
      return true;
    }
    return false;
  }

  public getQueueStats() {
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

  public getDeadLetterJobs(): Job[] {
    return Array.from(this.deadLetterQueue.values());
  }

  private async processNext(): Promise<void> {
    if (this.activeJobsCount >= this.concurrency) return;

    const pending = Array.from(this.localQueue.values()).filter(
      (j) => j.status === "PENDING" || j.status === "RETRYING"
    );

    if (pending.length === 0) return;

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
      logger.info(`[PersistentJobQueue] Processing job ${job.id} (${job.type})`);
      const result = await handler(job);
      job.status = "COMPLETED";
      job.result = result;
      job.progress = 100;
      job.completedAt = new Date();
      logger.info(`[PersistentJobQueue] Job ${job.id} COMPLETED`);
      this.emit("job_completed", job);
    } catch (err: any) {
      job.error = err.message || "Execution error";
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = "RETRYING";
        const backoffMs = Math.pow(2, job.retryCount) * 100;
        logger.warn(`[PersistentJobQueue] Job ${job.id} failed. Retrying in ${backoffMs}ms...`);
        setTimeout(() => this.processNext(), backoffMs);
      } else {
        job.status = "FAILED";
        job.completedAt = new Date();
        logger.error(`[PersistentJobQueue] Job ${job.id} routed to DEAD LETTER queue`);
        this.deadLetterQueue.set(job.id, job);
        this.localQueue.delete(job.id);
        this.emit("job_dead_letter", job);
      }
    } finally {
      this.activeJobsCount--;
      this.processNext();
    }
  }
}

export const persistentJobQueue = new PersistentJobQueue();
