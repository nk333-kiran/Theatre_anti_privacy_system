import crypto from "crypto";
import { EventEmitter } from "events";
import { Job, JobType, JobStatus, JobHandler } from "./types";
import { logger } from "../logging/logger";

export class JobQueue extends EventEmitter {
  private queue: Map<string, Job> = new Map();
  private handlers: Map<JobType, JobHandler> = new Map();
  private isProcessing = false;
  private concurrency = 3;
  private activeJobsCount = 0;

  constructor() {
    super();
  }

  public registerHandler<T = any>(type: JobType, handler: JobHandler<T>): void {
    this.handlers.set(type, handler);
    logger.info(`[JobQueue] Registered background handler for job type: ${type}`);
  }

  public async add<T = any>(
    type: JobType,
    data: T,
    options?: { maxRetries?: number }
  ): Promise<Job<T>> {
    const job: Job<T> = {
      id: `job_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      type,
      data,
      status: "PENDING",
      retryCount: 0,
      maxRetries: options?.maxRetries ?? 3,
      progress: 0,
      createdAt: new Date(),
    };

    this.queue.set(job.id, job);
    logger.info(`[JobQueue] Added job ${job.id} (${job.type}) to queue`);
    this.emit("job_added", job);

    this.processNext();
    return job;
  }

  public getJob(id: string): Job | undefined {
    return this.queue.get(id);
  }

  public getAllJobs(): Job[] {
    return Array.from(this.queue.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  public getQueueStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const jobs = Array.from(this.queue.values());
    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === "PENDING").length,
      processing: jobs.filter((j) => j.status === "PROCESSING").length,
      completed: jobs.filter((j) => j.status === "COMPLETED").length,
      failed: jobs.filter((j) => j.status === "FAILED").length,
    };
  }

  private async processNext(): Promise<void> {
    if (this.activeJobsCount >= this.concurrency) return;

    const pendingJobs = Array.from(this.queue.values()).filter(
      (j) => j.status === "PENDING" || j.status === "RETRYING"
    );

    if (pendingJobs.length === 0) return;

    const job = pendingJobs[0];
    const handler = this.handlers.get(job.type);

    if (!handler) {
      logger.error(`[JobQueue] No handler found for job type: ${job.type}`);
      job.status = "FAILED";
      job.error = `No handler registered for ${job.type}`;
      return;
    }

    this.activeJobsCount++;
    job.status = "PROCESSING";
    job.startedAt = new Date();

    try {
      logger.info(`[JobQueue] Processing job ${job.id} (${job.type})`);
      const result = await handler(job);
      job.status = "COMPLETED";
      job.result = result;
      job.completedAt = new Date();
      job.progress = 100;
      logger.info(`[JobQueue] Job ${job.id} COMPLETED successfully`);
      this.emit("job_completed", job);
    } catch (err: any) {
      job.error = err.message || "Unknown error";
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = "RETRYING";
        const delayMs = Math.pow(2, job.retryCount) * 100; // Exponential backoff
        logger.warn(`[JobQueue] Job ${job.id} failed (attempt ${job.retryCount}/${job.maxRetries}). Retrying in ${delayMs}ms...`);
        setTimeout(() => this.processNext(), delayMs);
      } else {
        job.status = "FAILED";
        job.completedAt = new Date();
        logger.error(`[JobQueue] Job ${job.id} permanently FAILED after ${job.maxRetries} retries:`, err);
        this.emit("job_failed", job);
      }
    } finally {
      this.activeJobsCount--;
      this.processNext();
    }
  }
}

export const jobQueue = new JobQueue();
