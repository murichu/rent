import Bull from 'bull';
import { createClient } from 'redis';
import logger from '../utils/logger.js';
import config from '../config/environment.js';

/**
 * Job Queue Service using Bull Queue
 * Handles background job processing with Redis
 */
class JobQueueService {
  constructor() {
    this.redis = null;
    this.queues = new Map();
    this.processors = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the job queue system
   */
  async initialize() {
    try {
      // Initialize Redis connection
      this.redis = createClient({
        username: 'default',
        password: config.REDIS_PASSWORD,
        socket: {
          host: config.REDIS_HOST,
          port: config.REDIS_PORT
        },
        database: config.REDIS_DB || 1 // Use different DB for jobs
      });

      await this.redis.connect();

      // Test Redis connection
      await this.redis.ping();
      logger.info('Job queue Redis connection established');

      // Create default queues
      await this.createQueue('exports', { 
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 100,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      });

      await this.createQueue('reports', {
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: 50,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        }
      });

      await this.createQueue('notifications', {
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        }
      });

      await this.createQueue('maintenance', {
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 20,
          attempts: 1,
        }
      });

      this.isInitialized = true;
      logger.info('Job queue system initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize job queue system:', error);
      throw error;
    }
  }

  /**
   * Create a new queue
   */
  async createQueue(name, options = {}) {
    if (this.queues.has(name)) {
      return this.queues.get(name);
    }

    const queue = new Bull(name, {
      redis: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        password: config.REDIS_PASSWORD,
        db: config.REDIS_DB || 1,
      },
      ...options
    });

    // Add event listeners
    queue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed in queue ${name}`, {
        jobId: job.id,
        queue: name,
        duration: Date.now() - job.timestamp,
        result: typeof result === 'object' ? JSON.stringify(result) : result
      });
    });

    queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed in queue ${name}`, {
        jobId: job.id,
        queue: name,
        error: err.message,
        attempts: job.attemptsMade,
        data: job.data
      });
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled in queue ${name}`, {
        jobId: job.id,
        queue: name
      });
    });

    queue.on('progress', (job, progress) => {
      logger.debug(`Job ${job.id} progress: ${progress}%`, {
        jobId: job.id,
        queue: name,
        progress
      });
    });

    this.queues.set(name, queue);
    logger.info(`Queue '${name}' created successfully`);
    return queue;
  }

  /**
   * Add a job to a queue
   */
  async addJob(queueName, jobType, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Job queue system not initialized');
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const jobOptions = {
      priority: options.priority || 0,
      delay: options.delay || 0,
      attempts: options.attempts || queue.defaultJobOptions?.attempts || 3,
      backoff: options.backoff || queue.defaultJobOptions?.backoff,
      removeOnComplete: options.removeOnComplete !== undefined ? options.removeOnComplete : 50,
      removeOnFail: options.removeOnFail !== undefined ? options.removeOnFail : 100,
      ...options
    };

    const job = await queue.add(jobType, {
      ...data,
      createdAt: new Date().toISOString(),
      userId: data.userId,
      agencyId: data.agencyId
    }, jobOptions);

    logger.info(`Job added to queue '${queueName}'`, {
      jobId: job.id,
      jobType,
      queue: queueName,
      priority: jobOptions.priority,
      userId: data.userId,
      agencyId: data.agencyId
    });

    return {
      id: job.id,
      queue: queueName,
      type: jobType,
      status: 'waiting',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Register a job processor
   */
  registerProcessor(queueName, jobType, processor, concurrency = 1) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const processorKey = `${queueName}:${jobType}`;
    this.processors.set(processorKey, processor);

    queue.process(jobType, concurrency, async (job) => {
      const startTime = Date.now();
      
      try {
        logger.info(`Processing job ${job.id} of type ${jobType}`, {
          jobId: job.id,
          jobType,
          queue: queueName,
          data: job.data
        });

        // Update progress to 0%
        await job.progress(0);

        // Execute the processor
        const result = await processor(job);

        // Update progress to 100%
        await job.progress(100);

        const duration = Date.now() - startTime;
        logger.info(`Job ${job.id} completed successfully`, {
          jobId: job.id,
          jobType,
          queue: queueName,
          duration: `${duration}ms`,
          result
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Job ${job.id} failed`, {
          jobId: job.id,
          jobType,
          queue: queueName,
          duration: `${duration}ms`,
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    });

    logger.info(`Processor registered for ${queueName}:${jobType} with concurrency ${concurrency}`);
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      id: job.id,
      type: job.name,
      queue: queueName,
      status: state,
      progress: progress,
      data: job.data,
      createdAt: new Date(job.timestamp).toISOString(),
      processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      failedReason: job.failedReason,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts
    };
  }

  /**
   * Cancel a job
   */
  async cancelJob(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    if (state === 'completed' || state === 'failed') {
      throw new Error(`Cannot cancel job in state: ${state}`);
    }

    await job.remove();
    
    logger.info(`Job ${jobId} cancelled`, {
      jobId,
      queue: queueName,
      previousState: state
    });

    return true;
  }

  /**
   * Get job history for a user
   */
  async getJobHistory(userId, limit = 50, queueName = null) {
    const jobs = [];
    const queuesToCheck = queueName ? [queueName] : Array.from(this.queues.keys());

    for (const name of queuesToCheck) {
      const queue = this.queues.get(name);
      
      // Get completed jobs
      const completed = await queue.getJobs(['completed'], 0, limit);
      // Get failed jobs
      const failed = await queue.getJobs(['failed'], 0, limit);
      // Get active jobs
      const active = await queue.getJobs(['active'], 0, limit);
      // Get waiting jobs
      const waiting = await queue.getJobs(['waiting'], 0, limit);

      const allJobs = [...completed, ...failed, ...active, ...waiting];
      
      for (const job of allJobs) {
        if (job.data.userId === userId) {
          const state = await job.getState();
          jobs.push({
            id: job.id,
            type: job.name,
            queue: name,
            status: state,
            progress: job.progress(),
            createdAt: new Date(job.timestamp).toISOString(),
            processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
            finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
            failedReason: job.failedReason,
            attempts: job.attemptsMade,
            maxAttempts: job.opts.attempts
          });
        }
      }
    }

    // Sort by creation date (newest first)
    jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return jobs.slice(0, limit);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName = null) {
    const stats = {};
    const queuesToCheck = queueName ? [queueName] : Array.from(this.queues.keys());

    for (const name of queuesToCheck) {
      const queue = this.queues.get(name);
      
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ]);

      stats[name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      };
    }

    return queueName ? stats[queueName] : stats;
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs(queueName, limit = 10) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const failedJobs = await queue.getFailed(0, limit - 1);
    const retriedJobs = [];

    for (const job of failedJobs) {
      try {
        await job.retry();
        retriedJobs.push(job.id);
        logger.info(`Retried failed job ${job.id} in queue ${queueName}`);
      } catch (error) {
        logger.error(`Failed to retry job ${job.id}:`, error);
      }
    }

    return {
      retriedCount: retriedJobs.length,
      retriedJobs
    };
  }

  /**
   * Clean old jobs from queues
   */
  async cleanOldJobs(queueName = null, olderThan = 24 * 60 * 60 * 1000) { // 24 hours
    const results = {};
    const queuesToClean = queueName ? [queueName] : Array.from(this.queues.keys());

    for (const name of queuesToClean) {
      const queue = this.queues.get(name);
      
      const cleaned = await queue.clean(olderThan, 'completed');
      const cleanedFailed = await queue.clean(olderThan, 'failed');
      
      results[name] = {
        completedCleaned: cleaned.length,
        failedCleaned: cleanedFailed.length,
        total: cleaned.length + cleanedFailed.length
      };

      logger.info(`Cleaned ${results[name].total} old jobs from queue ${name}`);
    }

    return results;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.pause();
    logger.info(`Queue '${queueName}' paused`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.resume();
    logger.info(`Queue '${queueName}' resumed`);
  }

  /**
   * Shutdown the job queue system
   */
  async shutdown() {
    logger.info('Shutting down job queue system...');

    // Close all queues
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
      logger.info(`Queue '${name}' closed`);
    }

    // Close Redis connection
    if (this.redis) {
      await this.redis.quit();
      logger.info('Job queue Redis connection closed');
    }

    this.isInitialized = false;
    logger.info('Job queue system shutdown complete');
  }
}

// Export singleton instance
export const jobQueue = new JobQueueService();
export default jobQueue;