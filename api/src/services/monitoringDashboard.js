import logger from '../utils/logger.js';
import { performanceMetrics } from './performanceMetrics.js';
import { systemMonitoring } from './systemMonitoring.js';
import { databaseMonitoring } from './databaseMonitoring.js';
import { healthCheck } from './healthCheck.js';
import { performanceAnalytics } from './performanceAnalytics.js';
import { alertSystem } from './alertSystem.js';

/**
 * Monitoring Dashboard Service
 * Provides real-time metrics visualization and dashboard data
 */
class MonitoringDashboard {
  constructor() {
    this.dashboardCache = new Map();
    this.realtimeClients = new Set();
    
    // Configuration
    this.cacheTimeout = 30 * 1000; // 30 seconds
    this.realtimeUpdateInterval = 5 * 1000; // 5 seconds
    
    // Start real-time updates
    this.startRealtimeUpdates();
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(timeWindow = 60 * 60 * 1000) { // Default 1 hour
    const cacheKey = `dashboard_${timeWindow}`;
    const cached = this.dashboardCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const dashboardData = {
        timestamp: new Date().toISOString(),
        timeWindow: timeWindow / 1000,
        overview: await this.getSystemOverview(),
        performance: await this.getPerformanceMetrics(timeWindow),
        alerts: await this.getAlertsSummary(),
        health: await this.getHealthStatus(),
        trends: await this.getTrendData(timeWindow),
        capacity: await this.getCapacityData(),
        topEndpoints: await this.getTopEndpoints(timeWindow),
        recentEvents: await this.getRecentEvents()
      };

      // Cache the results
      this.dashboardCache.set(cacheKey, {
        data: dashboardData,
        timestamp: Date.now()
      });

      return dashboardData;
    } catch (error) {
      logger.error('Failed to get dashboard data', { error: error.message });
      throw error;
    }
  }

  /**
   * Get system overview
   */
  async getSystemOverview() {
    const systemInfo = systemMonitoring.getSystemInfo();
    const memoryStats = systemMonitoring.getMemoryStats(5 * 60 * 1000); // Last 5 minutes
    const cpuStats = systemMonitoring.getCpuStats(5 * 60 * 1000);
    const healthStatus = await healthCheck.performHealthCheck();

    return {
      uptime: {
        process: Math.floor(systemInfo.currentUptime.process),
        system: Math.floor(systemInfo.currentUptime.system)
      },
      system: {
        platform: systemInfo.platform,
        arch: systemInfo.arch,
        cpus: systemInfo.cpus,
        totalMemory: systemInfo.totalMemory,
        nodeVersion: systemInfo.nodeVersion
      },
      currentLoad: {
        memory: memoryStats ? {
          heapUsed: memoryStats.process.current.heapUsed,
          heapTotal: memoryStats.process.current.heapTotal,
          heapUsagePercent: (memoryStats.process.current.heapUsed / memoryStats.process.current.heapTotal) * 100,
          systemUsagePercent: (memoryStats.system.current.used / memoryStats.system.current.total) * 100
        } : null,
        cpu: cpuStats ? {
          processPercent: cpuStats.process.current.percent,
          loadAvg: cpuStats.system.current.loadAvg1,
          loadPerCpu: cpuStats.system.current.loadAvg1 / cpuStats.system.current.cpuCount
        } : null
      },
      health: {
        status: healthStatus.status,
        services: healthStatus.services?.length || 0,
        healthyServices: healthStatus.services?.filter(s => s.status === 'healthy').length || 0
      }
    };
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(timeWindow) {
    const apiStats = performanceMetrics.getApiStats(timeWindow);
    const errorStats = performanceMetrics.getErrorStats(timeWindow);
    const dbStats = databaseMonitoring.getPerformanceStats(timeWindow);

    // Calculate aggregate metrics
    const endpoints = Object.values(apiStats);
    const totalRequests = endpoints.reduce((sum, stats) => sum + stats.totalRequests, 0);
    const avgResponseTime = endpoints.length > 0 ? 
      endpoints.reduce((sum, stats) => sum + stats.averageResponseTime, 0) / endpoints.length : 0;
    const totalSlowRequests = endpoints.reduce((sum, stats) => sum + stats.slowRequests, 0);

    return {
      api: {
        totalRequests,
        averageResponseTime: Math.round(avgResponseTime),
        slowRequests: totalSlowRequests,
        slowRequestsPercentage: totalRequests > 0 ? ((totalSlowRequests / totalRequests) * 100).toFixed(2) : 0,
        requestsPerMinute: (totalRequests / (timeWindow / 60000)).toFixed(2),
        endpointCount: endpoints.length
      },
      errors: {
        totalErrors: errorStats.totalErrors,
        errorRate: totalRequests > 0 ? ((errorStats.totalErrors / totalRequests) * 100).toFixed(2) : 0,
        errorsByType: Object.keys(errorStats.errorsByType).length,
        topErrors: Object.entries(errorStats.errorsByType)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([error, count]) => ({ error, count }))
      },
      database: {
        slowQueries: dbStats?.slowQueries?.length || 0,
        averageQueryTime: dbStats?.queries?.length > 0 ? 
          Math.round(dbStats.queries.reduce((sum, q) => sum + q.executionTime, 0) / dbStats.queries.length) : 0,
        connectionPool: dbStats?.connectionPool ? {
          utilization: Math.round(dbStats.connectionPool.utilization * 100),
          active: dbStats.connectionPool.active,
          total: dbStats.connectionPool.total,
          waiting: dbStats.connectionPool.waiting
        } : null
      }
    };
  }

  /**
   * Get alerts summary
   */
  async getAlertsSummary() {
    const activeAlerts = alertSystem.getActiveAlerts();
    const alertStats = alertSystem.getAlertStatistics(24 * 60 * 60 * 1000); // Last 24 hours
    const healthSummary = alertSystem.getHealthSummary();

    return {
      active: {
        total: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        warning: activeAlerts.filter(a => a.severity === 'warning').length,
        info: activeAlerts.filter(a => a.severity === 'info').length
      },
      recent: {
        last24Hours: alertStats.total,
        bySeverity: alertStats.bySeverity,
        topTypes: Object.entries(alertStats.byType)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([type, count]) => ({ type, count }))
      },
      health: {
        status: healthSummary.status,
        topAlerts: healthSummary.topAlerts
      }
    };
  }

  /**
   * Get health status
   */
  async getHealthStatus() {
    const healthStatus = await healthCheck.performHealthCheck();
    const systemStatus = await healthCheck.getSystemStatus();

    return {
      overall: {
        status: healthStatus.status,
        timestamp: healthStatus.timestamp,
        uptime: healthStatus.uptime
      },
      services: healthStatus.services?.map(service => ({
        name: service.name,
        status: service.status,
        responseTime: service.responseTime,
        lastCheck: service.lastCheck
      })) || [],
      dependencies: systemStatus?.dependencies?.map(dep => ({
        name: dep.name,
        status: dep.status,
        version: dep.version,
        lastCheck: dep.lastCheck
      })) || []
    };
  }

  /**
   * Get trend data for charts
   */
  async getTrendData(timeWindow) {
    try {
      const trends = await performanceAnalytics.analyzePerformanceTrends(timeWindow);
      
      return {
        api: {
          responseTimeTrend: trends.api.responseTimeTrend,
          throughputTrend: trends.api.throughputTrend,
          errorRateTrend: trends.api.errorRateTrend,
          degradingEndpoints: trends.api.degradingEndpoints.slice(0, 5)
        },
        memory: {
          processTrend: trends.memory.process?.trend || 'stable',
          systemTrend: trends.memory.system?.trend || 'stable',
          recommendation: trends.memory.recommendation
        },
        cpu: {
          processTrend: trends.cpu.process?.trend || 'stable',
          systemTrend: trends.cpu.system?.loadTrend || 'stable',
          recommendation: trends.cpu.recommendation
        },
        overall: {
          trend: trends.overall.trend,
          score: trends.overall.score,
          recommendation: trends.overall.recommendation
        }
      };
    } catch (error) {
      logger.error('Failed to get trend data', { error: error.message });
      return {
        api: { responseTimeTrend: 'stable', throughputTrend: 'stable', errorRateTrend: 'stable' },
        memory: { processTrend: 'stable', systemTrend: 'stable' },
        cpu: { processTrend: 'stable', systemTrend: 'stable' },
        overall: { trend: 'stable', score: 0, recommendation: 'No data available' }
      };
    }
  }

  /**
   * Get capacity data
   */
  async getCapacityData() {
    try {
      const capacity = await performanceAnalytics.generateCapacityMetrics();
      
      return {
        current: capacity.current,
        projections: {
          memory: {
            next30Days: capacity.projections.memory.next30Days,
            recommendation: capacity.projections.memory.recommendation
          },
          cpu: {
            next30Days: capacity.projections.cpu.next30Days,
            recommendation: capacity.projections.cpu.recommendation
          },
          api: {
            next30Days: capacity.projections.api.next30Days,
            recommendation: capacity.projections.api.recommendation
          }
        },
        recommendations: capacity.recommendations.slice(0, 3)
      };
    } catch (error) {
      logger.error('Failed to get capacity data', { error: error.message });
      return {
        current: {},
        projections: {},
        recommendations: ['Capacity data unavailable']
      };
    }
  }

  /**
   * Get top endpoints by various metrics
   */
  async getTopEndpoints(timeWindow) {
    const apiStats = performanceMetrics.getApiStats(timeWindow);
    const endpoints = Object.entries(apiStats);

    return {
      slowest: endpoints
        .sort(([,a], [,b]) => b.averageResponseTime - a.averageResponseTime)
        .slice(0, 10)
        .map(([endpoint, stats]) => ({
          endpoint,
          averageResponseTime: stats.averageResponseTime,
          p95ResponseTime: stats.p95ResponseTime,
          totalRequests: stats.totalRequests
        })),
      mostRequested: endpoints
        .sort(([,a], [,b]) => b.totalRequests - a.totalRequests)
        .slice(0, 10)
        .map(([endpoint, stats]) => ({
          endpoint,
          totalRequests: stats.totalRequests,
          averageResponseTime: stats.averageResponseTime,
          requestsPerMinute: stats.requestsPerMinute
        })),
      highestErrorRate: endpoints
        .filter(([,stats]) => stats.errorRate > 0)
        .sort(([,a], [,b]) => b.errorRate - a.errorRate)
        .slice(0, 10)
        .map(([endpoint, stats]) => ({
          endpoint,
          errorRate: stats.errorRate,
          totalRequests: stats.totalRequests,
          averageResponseTime: stats.averageResponseTime
        }))
    };
  }

  /**
   * Get recent events (alerts, errors, etc.)
   */
  async getRecentEvents() {
    const recentAlerts = alertSystem.getAlertHistory(10);
    const errorStats = performanceMetrics.getErrorStats(60 * 60 * 1000); // Last hour
    const slowRequests = performanceMetrics.getSlowRequests(5, 60 * 60 * 1000);

    const events = [];

    // Add recent alerts
    recentAlerts.forEach(alert => {
      events.push({
        type: 'alert',
        severity: alert.severity,
        timestamp: alert.timestamp,
        description: alert.description,
        action: alert.action,
        details: {
          value: alert.value,
          threshold: alert.threshold
        }
      });
    });

    // Add recent slow requests
    slowRequests.slice(0, 5).forEach(request => {
      events.push({
        type: 'slow_request',
        severity: 'warning',
        timestamp: request.timestamp,
        description: `Slow request: ${request.endpoint}`,
        details: {
          responseTime: request.responseTime,
          endpoint: request.endpoint
        }
      });
    });

    // Sort by timestamp and return recent events
    return events
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);
  }

  /**
   * Get real-time metrics for live updates
   */
  async getRealtimeMetrics() {
    const memoryStats = systemMonitoring.getMemoryStats(60 * 1000); // Last minute
    const cpuStats = systemMonitoring.getCpuStats(60 * 1000);
    const apiStats = performanceMetrics.getApiStats(60 * 1000);
    const activeAlerts = alertSystem.getActiveAlerts();

    return {
      timestamp: new Date().toISOString(),
      memory: memoryStats ? {
        heapUsagePercent: (memoryStats.process.current.heapUsed / memoryStats.process.current.heapTotal) * 100,
        systemUsagePercent: (memoryStats.system.current.used / memoryStats.system.current.total) * 100
      } : null,
      cpu: cpuStats ? {
        processPercent: cpuStats.process.current.percent,
        loadAvg: cpuStats.system.current.loadAvg1
      } : null,
      api: {
        totalRequests: Object.values(apiStats).reduce((sum, stats) => sum + stats.totalRequests, 0),
        averageResponseTime: Object.values(apiStats).length > 0 ? 
          Object.values(apiStats).reduce((sum, stats) => sum + stats.averageResponseTime, 0) / Object.values(apiStats).length : 0
      },
      alerts: {
        total: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        warning: activeAlerts.filter(a => a.severity === 'warning').length
      }
    };
  }

  /**
   * Get dashboard configuration
   */
  getDashboardConfig() {
    return {
      refreshIntervals: {
        dashboard: 30, // seconds
        realtime: 5,   // seconds
        alerts: 10     // seconds
      },
      thresholds: {
        responseTime: {
          warning: 1000,  // ms
          critical: 3000  // ms
        },
        memory: {
          warning: 80,    // %
          critical: 90    // %
        },
        cpu: {
          warning: 80,    // %
          critical: 90    // %
        },
        errorRate: {
          warning: 5,     // %
          critical: 10    // %
        }
      },
      chartOptions: {
        timeWindows: [
          { label: '5 minutes', value: 5 * 60 * 1000 },
          { label: '15 minutes', value: 15 * 60 * 1000 },
          { label: '1 hour', value: 60 * 60 * 1000 },
          { label: '6 hours', value: 6 * 60 * 60 * 1000 },
          { label: '24 hours', value: 24 * 60 * 60 * 1000 },
          { label: '7 days', value: 7 * 24 * 60 * 60 * 1000 }
        ]
      }
    };
  }

  /**
   * Start real-time updates
   */
  startRealtimeUpdates() {
    setInterval(async () => {
      if (this.realtimeClients.size === 0) return;

      try {
        const realtimeData = await this.getRealtimeMetrics();
        
        // In a real implementation, this would broadcast to WebSocket clients
        // For now, we'll just log that real-time data is available
        logger.debug('Real-time metrics updated', {
          clientCount: this.realtimeClients.size,
          timestamp: realtimeData.timestamp
        });
      } catch (error) {
        logger.error('Failed to update real-time metrics', { error: error.message });
      }
    }, this.realtimeUpdateInterval);
  }

  /**
   * Register real-time client
   */
  registerRealtimeClient(clientId) {
    this.realtimeClients.add(clientId);
    logger.debug('Real-time client registered', { clientId, totalClients: this.realtimeClients.size });
  }

  /**
   * Unregister real-time client
   */
  unregisterRealtimeClient(clientId) {
    this.realtimeClients.delete(clientId);
    logger.debug('Real-time client unregistered', { clientId, totalClients: this.realtimeClients.size });
  }

  /**
   * Clear dashboard cache
   */
  clearCache() {
    this.dashboardCache.clear();
    logger.info('Dashboard cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.dashboardCache.size,
      realtimeClients: this.realtimeClients.size,
      cacheTimeout: this.cacheTimeout / 1000,
      updateInterval: this.realtimeUpdateInterval / 1000
    };
  }
}

// Export singleton instance
export const monitoringDashboard = new MonitoringDashboard();