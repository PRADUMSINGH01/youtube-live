import { Queue } from "bullmq";
import type { JobsOptions } from "bullmq";
import { redis } from "../utils/redis.server.js";

const queue = new Queue("youtube-live", { connection: redis });

export async function addJob(job: string, data: any, options: JobsOptions = {}) {
    await queue.add(job, data, { 
        removeOnComplete: true, 
        removeOnFail: true,
        ...options 
    });
}

export async function deleteJob(jobId: string) {
    await queue.remove(jobId);
}

export async function getJob(jobId: string) {
    return await queue.getJob(jobId);
}

export async function getJobStatus(jobId: string) {
    return await queue.getJob(jobId);
}

