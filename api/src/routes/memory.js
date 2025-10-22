import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import memoryOptimizer from "../services/memoryOptimizer.js";
import fileUploadOptimizer from "../services/fileUploadOptimizer.js";

export const memoryRouter = Router();

memoryRouter.use(requireAuth);

// Get current memory statistics
memoryRouter.get("/stats", async (req, res) => {
  try {
    const currentStats = memoryOptimizer.getCurrentStats();
    const memoryHistory = memoryOptimizer.getMemoryHistory(60); // Last hour
    const gcHistory = memoryOptimizer.getGCHistory(10); // Last 10 GC runs
    const leakDetection = memoryOptimizer.detectMemoryLeaks();
    
    res.json({
      success: true,
      data: {
        current: {
          heapUsed: Math.round(currentStats.heapUsed / 1024 / 1024),
          heapTotal: Math.round(currentStats.heapTotal / 1024 / 1024),
          rss: Math.round(currentStats.rss / 1024 / 1024),
          external: Math.round(currentStats.external / 1024 / 1024),
          heapUtilization: Math.round(currentStats.heapUtilization * 100),
          uptime: Math.round(currentStats.uptime / 3600)
        },
        history: memoryHistory.map(stat => ({
          timestamp: stat.timestamp,
          heapUsed: Math.round(stat.heapUsed / 1024 / 1024),
          heapUtilization: Math.round(stat.heapUtilization * 100)
        })),
        garbageCollection: gcHistory,
        leakDetection,
        monitoring: {
          isActive: memoryOptimizer.isMonitoring,
          dataPoints: memoryHistory.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get memory statistics" });
  }
});

// Get comprehensive memory report
memoryRouter.get("/report", async (req, res) => {
  try {
    const report = memoryOptimizer.generateMemoryReport();
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate memory report" });
  }
});

// Force garbage collection (if available)
memoryRouter.post("/gc", async (req, res) => {
  try {
    const gcResult = memoryOptimizer.forceGarbageCollection();
    
    if (gcResult) {
      res.json({
        success: true,
        message: "Garbage collection completed",
        data: {
          duration: Math.round(gcResult.duration),
          memoryFreed: Math.round(gcResult.memoryFreed / 1024 / 1024),
          heapReduction: Math.round(gcResult.heapReduction)
        }
      });
    } else {
      res.json({
        success: false,
        message: "Garbage collection not available. Start Node.js with --expose-gc flag."
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to trigger garbage collection" });
  }
});

// Optimize memory usage
memoryRouter.post("/optimize", async (req, res) => {
  try {
    const optimization = memoryOptimizer.optimizeMemory();
    
    res.json({
      success: true,
      message: "Memory optimization completed",
      data: {
        memoryFreed: Math.round(optimization.memoryFreed / 1024 / 1024),
        gcTriggered: optimization.gcTriggered
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to optimize memory" });
  }
});

// Start memory monitoring
memoryRouter.post("/monitoring/start", async (req, res) => {
  try {
    const { interval = 60000 } = req.body; // Default 1 minute
    
    memoryOptimizer.startMonitoring(interval);
    
    res.json({
      success: true,
      message: "Memory monitoring started",
      data: {
        interval: interval,
        intervalMinutes: Math.round(interval / 1000 / 60)
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to start memory monitoring" });
  }
});

// Stop memory monitoring
memoryRouter.post("/monitoring/stop", async (req, res) => {
  try {
    memoryOptimizer.stopMonitoring();
    
    res.json({
      success: true,
      message: "Memory monitoring stopped"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to stop memory monitoring" });
  }
});

// Get file upload statistics
memoryRouter.get("/uploads", async (req, res) => {
  try {
    const uploadStats = await fileUploadOptimizer.getUploadStats();
    
    if (uploadStats) {
      res.json({
        success: true,
        data: {
          ...uploadStats,
          // Convert sizes to MB for readability
          temporary: {
            ...uploadStats.temporary,
            totalSize: Math.round(uploadStats.temporary.totalSize / 1024 / 1024)
          },
          images: {
            ...uploadStats.images,
            totalSize: Math.round(uploadStats.images.totalSize / 1024 / 1024)
          },
          documents: {
            ...uploadStats.documents,
            totalSize: Math.round(uploadStats.documents.totalSize / 1024 / 1024)
          },
          total: {
            ...uploadStats.total,
            totalSize: Math.round(uploadStats.total.totalSize / 1024 / 1024)
          }
        }
      });
    } else {
      res.status(500).json({ error: "Failed to get upload statistics" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to get upload statistics" });
  }
});

// Clean up temporary files
memoryRouter.post("/uploads/cleanup", async (req, res) => {
  try {
    const cleanup = await fileUploadOptimizer.cleanupTempFiles();
    
    res.json({
      success: true,
      message: "Temporary file cleanup completed",
      data: {
        filesRemoved: cleanup.filesRemoved,
        sizeFreed: Math.round(cleanup.sizeFreed / 1024 / 1024)
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to cleanup temporary files" });
  }
});

// Memory leak detection
memoryRouter.get("/leak-detection", async (req, res) => {
  try {
    const leakDetection = memoryOptimizer.detectMemoryLeaks();
    
    res.json({
      success: true,
      data: leakDetection
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to perform leak detection" });
  }
});

export default memoryRouter;