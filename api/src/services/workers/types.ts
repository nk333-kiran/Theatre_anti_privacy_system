export type JobType =
  | "VIDEO_TRANSCODE"
  | "THUMBNAIL_GEN"
  | "HLS_PACKAGING"
  | "DRM_PACKAGING"
  | "ASSET_VALIDATION"
  | "CLEANUP";

export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "RETRYING";

export interface Job<T = any> {
  id: string;
  type: JobType;
  data: T;
  status: JobStatus;
  retryCount: number;
  maxRetries: number;
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface JobResult {
  success: boolean;
  jobId: string;
  data?: any;
  error?: string;
}

export type JobHandler<T = any> = (job: Job<T>) => Promise<any>;
