import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { jobQueue } from '../services/jobQueue.js';
import { exportService } from '../services/exportService.js';
import { reportService } from '../services/reportService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Get job status
 * GET /api/v1/jobs/:queueName/:jobId
 */
router.get('/:queueName/:jobId', authenticateToken, async (req, res) => {
  try {
    const { queueName, jobId } = req.params;
    const userId = req.user.id;

    const jobStatus = await jobQueue.getJobStatus(queueName, jobId);
    
    if (!jobStatus) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Ensure user can only access their own jobs
    if (jobStatus.data.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: jobStatus
    });

  } catch (error) {
    logger.error('Failed to get job status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job status'
    });
  }
});

/**
 * Cancel a job
 * DELETE /api/v1/jobs/:queueName/:jobId
 */
router.delete('/:queueName/:jobId', authenticateToken, async (req, res) => {
  try {
    const { queueName, jobId } = req.params;
    const userId = req.user.id;

    // Get job details first to check ownership
    const jobStatus = await jobQueue.getJobStatus(queueName, jobId);
    
    if (!jobStatus) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Ensure user can only cancel their own jobs
    if (jobStatus.data.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await jobQueue.cancelJob(queueName, jobId);

    logger.info('Job cancelled', {
      jobId,
      queueName,
      userId,
      cancelledBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Job cancelled successfully'
    });

  } catch (error) {
    logger.error('Failed to cancel job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel job'
    });
  }
});

/**
 * Get job history for current user
 * GET /api/v1/jobs/history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, queue } = req.query;

    const jobHistory = await jobQueue.getJobHistory(userId, parseInt(limit), queue);

    res.json({
      success: true,
      data: {
        jobs: jobHistory,
        total: jobHistory.length
      }
    });

  } catch (error) {
    logger.error('Failed to get job history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job history'
    });
  }
});

/**
 * Get queue statistics (admin only)
 * GET /api/v1/jobs/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { queue } = req.query;
    const stats = await jobQueue.getQueueStats(queue);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics'
    });
  }
});

/**
 * Retry failed jobs (admin only)
 * POST /api/v1/jobs/:queueName/retry
 */
router.post('/:queueName/retry', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { queueName } = req.params;
    const { limit = 10 } = req.body;

    const result = await jobQueue.retryFailedJobs(queueName, limit);

    logger.info('Failed jobs retried', {
      queueName,
      retriedCount: result.retriedCount,
      adminId: req.user.id
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to retry jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry failed jobs'
    });
  }
});

/**
 * Clean old jobs (admin only)
 * POST /api/v1/jobs/:queueName/clean
 */
router.post('/:queueName/clean', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { queueName } = req.params;
    const { olderThan = 24 * 60 * 60 * 1000 } = req.body; // Default 24 hours

    const result = await jobQueue.cleanOldJobs(queueName, olderThan);

    logger.info('Old jobs cleaned', {
      queueName,
      result,
      adminId: req.user.id
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to clean jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean old jobs'
    });
  }
});

/**
 * Pause queue (admin only)
 * POST /api/v1/jobs/:queueName/pause
 */
router.post('/:queueName/pause', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { queueName } = req.params;
    await jobQueue.pauseQueue(queueName);

    logger.info('Queue paused', {
      queueName,
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: `Queue '${queueName}' paused successfully`
    });

  } catch (error) {
    logger.error('Failed to pause queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause queue'
    });
  }
});

/**
 * Resume queue (admin only)
 * POST /api/v1/jobs/:queueName/resume
 */
router.post('/:queueName/resume', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { queueName } = req.params;
    await jobQueue.resumeQueue(queueName);

    logger.info('Queue resumed', {
      queueName,
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: `Queue '${queueName}' resumed successfully`
    });

  } catch (error) {
    logger.error('Failed to resume queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume queue'
    });
  }
});

export { router as jobsRouter };