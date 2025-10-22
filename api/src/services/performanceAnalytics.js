import logger from '../utils/logger.js';
import { performanceMetrics } from './performanceMetrics.js';
import { systemMonitoring } from './systemMonitoring.js';
import { databaseMonitoring } from './databaseMonitoring.js';
import cacheManager from './cacheManager.js';

/**
 * Performance Analytics Service
 * Implements trend analysis, bottleneck identification, capacity planning, and reporting
 */
class PerformanceAnalytics {
  constructor() {
    this.trendAnalysisCache = new Map();
    this.bottleneckCache = new Map();
    this.capacityMetrics = [];
    this.dailyReports = [];
    
    // Configuration
    this.trendAnalysisWindow = 24 * 60 * 60 * 1000; // 24 hours
    this.capacityPlanningWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.bottleneckThresholds = {
      responseTime: 3000, // 3 seconds
      memoryUsage: 0.8, // 80%
      cpuUsage: 0.8, // 80%
      errorRate: 0.05, // 5%
      cacheHitRate: 0.7 // 70%
    };
    
    // Start daily report generation
    this.scheduleDailyReports();
  }

  /**
   * Analyze performance trends over time
   */
  async analyzePerformanceTrends(timeWindow = this.trendAnalysisWindow) {
    const cacheKey = `trends_${timeWindow}`;
    const cached = this.trendAnalysisCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minute cache
      return cached.data;
    }

    try {
      const apiStats = performanceMetrics.getApiStats(timeWindow);
      const memoryStats = systemMonitoring.getMemoryStats(timeWindow);
      const cpuStats = systemMonitoring.getCpuStats(timeWindow);
      const dbStats = databaseMonitoring.getPerformanceStats(timeWindow);

      const trends = {
        timestamp: new Date().toISOString(),
        timeWindow: timeWindow / 1000,
        api: this.analyzeApiTrends(apiStats, timeWindow),
        memory: this.analyzeMemoryTrends(memoryStats),
        cpu: this.analyzeCpuTrends(cpuStats),
        database: this.analyzeDatabaseTrends(dbStats),
        overall: {}
      };

      // Calculate overall system health trend
      trends.overall = this.calculateOverallTrend(trends);

      // Cache the results
      this.trendAnalysisCache.set(cacheKey, {
        data: trends,
        timestamp: Date.now()
      });

      return trends;
    } catch (error) {
      logger.error('Failed to analyze performance trends', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze API performance trends
   */
  analyzeApiTrends(apiStats, timeWindow) {
    const endpoints = Object.entries(apiStats);
    const trends = {
      totalEndpoints: endpoints.length,
      responseTimeTrend: 'stable',
      throughputTrend: 'stable',
      errorRateTrend: 'stable',
      slowestEndpoints: [],
      fastestImproving: [],
      degradingEndpoints: []
    };

    if (endpoints.length === 0) return trends;

    // Calculate aggregate metrics
    const totalRequests = endpoints.reduce((sum, [, stats]) => sum + stats.totalRequests, 0);
    const avgResponseTime = endpoints.reduce((sum, [, stats]) => sum + stats.averageResponseTime, 0) / endpoints.length;
    const avgErrorRate = endpoints.reduce((sum, [, stats]) => sum + stats.errorRate, 0) / endpoints.length;

    // Analyze each endpoint for trends
    endpoints.forEach(([endpoint, stats]) => {
      const endpointTrend = this.calculateEndpointTrend(endpoint, stats, timeWindow);
      
      if (endpointTrend.responseTimeTrend === 'degrading') {
        trends.degradingEndpoints.push({
          endpoint,
          currentResponseTime: stats.averageResponseTime,
          trend: endpointTrend.responseTimeChange
        });
      }

      if (endpointTrend.responseTimeTrend === 'improving') {
        trends.fastestImproving.push({
          endpoint,
          currentResponseTime: stats.averageResponseTime,
          improvement: endpointTrend.responseTimeChange
        });
      }

      if (stats.averageResponseTime > this.bottleneckThresholds.responseTime) {
        trends.slowestEndpoints.push({
          endpoint,
          averageResponseTime: stats.averageResponseTime,
          p95ResponseTime: stats.p95ResponseTime,
          slowRequests: stats.slowRequests
        });
      }
    });

    // Sort arrays
    trends.slowestEndpoints.sort((a, b) => b.averageResponseTime - a.averageResponseTime);
    trends.degradingEndpoints.sort((a, b) => b.trend - a.trend);
    trends.fastestImproving.sort((a, b) => a.improvement - b.improvement);

    // Determine overall trends
    trends.responseTimeTrend = this.determineTrend(avgResponseTime, 'responseTime');
    trends.errorRateTrend = this.determineTrend(avgErrorRate, 'errorRate');
    trends.throughputTrend = this.determineTrend(totalRequests, 'throughput');

    return trends;
  }

  /**
   * Analyze memory usage trends
   */
  analyzeMemoryTrends(memoryStats) {
    if (!memoryStats) {
      return { trend: 'no_data', message: 'No memory data available' };
    }

    const heapTrend = memoryStats.process.heapUsed.trend;
    const systemTrend = memoryStats.system.used.trend;

    return {
      process: {
        current: memoryStats.process.current,
        trend: this.categorizeTrend(heapTrend),
        trendValue: heapTrend,
        average: memoryStats.process.heapUsed.average,
        peak: memoryStats.process.heapUsed.max
      },
      system: {
        current: memoryStats.system.current,
        trend: this.categorizeTrend(systemTrend),
        trendValue: systemTrend,
        average: memoryStats.system.used.average,
        peak: memoryStats.system.used.max
      },
      recommendation: this.getMemoryRecommendation(memoryStats)
    };
  }

  /**
   * Analyze CPU usage trends
   */
  analyzeCpuTrends(cpuStats) {
    if (!cpuStats) {
      return { trend: 'no_data', message: 'No CPU data available' };
    }

    const cpuTrend = cpuStats.process.percent.trend;
    const loadTrend = cpuStats.system.loadAvg1.trend;

    return {
      process: {
        current: cpuStats.process.current,
        trend: this.categorizeTrend(cpuTrend),
        trendValue: cpuTrend,
        average: cpuStats.process.percent.average,
        peak: cpuStats.process.percent.max
      },
      system: {
        current: cpuStats.system.current,
        loadTrend: this.categorizeTrend(loadTrend),
        loadTrendValue: loadTrend,
        averageLoad: cpuStats.system.loadAvg1.average,
        peakLoad: cpuStats.system.loadAvg1.max
      },
      recommendation: this.getCpuRecommendation(cpuStats)
    };
  }

  /**
   * Analyze database performance trends
   */
  analyzeDatabaseTrends(dbStats) {
    if (!dbStats) {
      return { trend: 'no_data', message: 'No database data available' };
    }

    const queryTimes = dbStats.queries?.map(q => q.executionTime) || [];
    const avgQueryTime = queryTimes.length > 0 ? 
      queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length : 0;

    return {
      queryPerformance: {
        averageQueryTime: avgQueryTime,
        slowQueries: dbStats.slowQueries?.length || 0,
        trend: avgQueryTime > 1000 ? 'degrading' : 'stable'
      },
      connectionPool: {
        utilization: dbStats.connectionPool?.utilization || 0,
        waitTime: dbStats.connectionPool?.averageWaitTime || 0,
        trend: dbStats.connectionPool?.utilization > 0.8 ? 'high_utilization' : 'normal'
      },
      recommendation: this.getDatabaseRecommendation(dbStats)
    };
  }

  /**
   * Calculate overall system health trend
   */
  calculateOverallTrend(trends) {
    const factors = [];

    // API performance factor
    if (trends.api.responseTimeTrend === 'degrading') factors.push(-2);
    else if (trends.api.responseTimeTrend === 'improving') factors.push(1);
    else factors.push(0);

    // Memory factor
    if (trends.memory.process?.trend === 'increasing') factors.push(-1);
    if (trends.memory.system?.trend === 'increasing') factors.push(-1);

    // CPU factor
    if (trends.cpu.process?.trend === 'increasing') factors.push(-1);
    if (trends.cpu.system?.loadTrend === 'increasing') factors.push(-1);

    // Database factor
    if (trends.database.queryPerformance?.trend === 'degrading') factors.push(-2);

    const overallScore = factors.reduce((sum, factor) => sum + factor, 0);
    
    let healthTrend = 'stable';
    let recommendation = 'System performance is stable';

    if (overallScore <= -3) {
      healthTrend = 'critical';
      recommendation = 'Immediate attention required - multiple performance issues detected';
    } else if (overallScore <= -1) {
      healthTrend = 'degrading';
      recommendation = 'Performance degradation detected - investigation recommended';
    } else if (overallScore >= 1) {
      healthTrend = 'improving';
      recommendation = 'System performance is improving';
    }

    return {
      trend: healthTrend,
      score: overallScore,
      recommendation,
      factors: factors.length
    };
  }

  /**
   * Identify performance bottlenecks
   */
  async identifyBottlenecks(timeWindow = this.trendAnalysisWindow) {
    const cacheKey = `bottlenecks_${timeWindow}`;
    const cached = this.bottleneckCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minute cache
      return cached.data;
    }

    try {
      const bottlenecks = {
        timestamp: new Date().toISOString(),
        timeWindow: timeWindow / 1000,
        critical: [],
        warning: [],
        recommendations: []
      };

      // Check API bottlenecks
      const apiBottlenecks = await this.identifyApiBottlenecks(timeWindow);
      bottlenecks.critical.push(...apiBottlenecks.critical);
      bottlenecks.warning.push(...apiBottlenecks.warning);

      // Check memory bottlenecks
      const memoryBottlenecks = await this.identifyMemoryBottlenecks(timeWindow);
      bottlenecks.critical.push(...memoryBottlenecks.critical);
      bottlenecks.warning.push(...memoryBottlenecks.warning);

      // Check CPU bottlenecks
      const cpuBottlenecks = await this.identifyCpuBottlenecks(timeWindow);
      bottlenecks.critical.push(...cpuBottlenecks.critical);
      bottlenecks.warning.push(...cpuBottlenecks.warning);

      // Check database bottlenecks
      const dbBottlenecks = await this.identifyDatabaseBottlenecks(timeWindow);
      bottlenecks.critical.push(...dbBottlenecks.critical);
      bottlenecks.warning.push(...dbBottlenecks.warning);

      // Generate recommendations
      bottlenecks.recommendations = this.generateBottleneckRecommendations(bottlenecks);

      // Cache the results
      this.bottleneckCache.set(cacheKey, {
        data: bottlenecks,
        timestamp: Date.now()
      });

      return bottlenecks;
    } catch (error) {
      logger.error('Failed to identify bottlenecks', { error: error.message });
      throw error;
    }
  }

  /**
   * Identify API bottlenecks
   */
  async identifyApiBottlenecks(timeWindow) {
    const apiStats = performanceMetrics.getApiStats(timeWindow);
    const bottlenecks = { critical: [], warning: [] };

    Object.entries(apiStats).forEach(([endpoint, stats]) => {
      // Critical: Response time > 3 seconds
      if (stats.averageResponseTime > this.bottleneckThresholds.responseTime) {
        bottlenecks.critical.push({
          type: 'api_response_time',
          severity: 'critical',
          endpoint,
          metric: 'Average Response Time',
          value: stats.averageResponseTime,
          threshold: this.bottleneckThresholds.responseTime,
          impact: 'High',
          description: `Endpoint ${endpoint} has average response time of ${stats.averageResponseTime}ms`
        });
      }
      // Warning: Response time > 1 second
      else if (stats.averageResponseTime > 1000) {
        bottlenecks.warning.push({
          type: 'api_response_time',
          severity: 'warning',
          endpoint,
          metric: 'Average Response Time',
          value: stats.averageResponseTime,
          threshold: 1000,
          impact: 'Medium',
          description: `Endpoint ${endpoint} has elevated response time of ${stats.averageResponseTime}ms`
        });
      }

      // Critical: Error rate > 5%
      if (stats.errorRate > this.bottleneckThresholds.errorRate * 100) {
        bottlenecks.critical.push({
          type: 'api_error_rate',
          severity: 'critical',
          endpoint,
          metric: 'Error Rate',
          value: stats.errorRate,
          threshold: this.bottleneckThresholds.errorRate * 100,
          impact: 'High',
          description: `Endpoint ${endpoint} has high error rate of ${stats.errorRate.toFixed(2)}%`
        });
      }
    });

    return bottlenecks;
  }

  /**
   * Identify memory bottlenecks
   */
  async identifyMemoryBottlenecks(timeWindow) {
    const memoryStats = systemMonitoring.getMemoryStats(timeWindow);
    const bottlenecks = { critical: [], warning: [] };

    if (!memoryStats) return bottlenecks;

    const heapUsagePercent = (memoryStats.process.current.heapUsed / memoryStats.process.current.heapTotal) * 100;
    const systemUsagePercent = (memoryStats.system.current.used / memoryStats.system.current.total) * 100;

    // Critical: Memory usage > 90%
    if (heapUsagePercent > 90) {
      bottlenecks.critical.push({
        type: 'memory_usage',
        severity: 'critical',
        metric: 'Heap Memory Usage',
        value: heapUsagePercent,
        threshold: 90,
        impact: 'High',
        description: `Process heap memory usage is critically high at ${heapUsagePercent.toFixed(2)}%`
      });
    }
    // Warning: Memory usage > 80%
    else if (heapUsagePercent > 80) {
      bottlenecks.warning.push({
        type: 'memory_usage',
        severity: 'warning',
        metric: 'Heap Memory Usage',
        value: heapUsagePercent,
        threshold: 80,
        impact: 'Medium',
        description: `Process heap memory usage is elevated at ${heapUsagePercent.toFixed(2)}%`
      });
    }

    // System memory warnings
    if (systemUsagePercent > 90) {
      bottlenecks.critical.push({
        type: 'system_memory',
        severity: 'critical',
        metric: 'System Memory Usage',
        value: systemUsagePercent,
        threshold: 90,
        impact: 'High',
        description: `System memory usage is critically high at ${systemUsagePercent.toFixed(2)}%`
      });
    }

    return bottlenecks;
  }

  /**
   * Identify CPU bottlenecks
   */
  async identifyCpuBottlenecks(timeWindow) {
    const cpuStats = systemMonitoring.getCpuStats(timeWindow);
    const bottlenecks = { critical: [], warning: [] };

    if (!cpuStats) return bottlenecks;

    const cpuPercent = cpuStats.process.current.percent;
    const loadAvg = cpuStats.system.current.loadAvg1;
    const cpuCount = cpuStats.system.current.cpuCount;

    // Critical: CPU usage > 90%
    if (cpuPercent > 90) {
      bottlenecks.critical.push({
        type: 'cpu_usage',
        severity: 'critical',
        metric: 'CPU Usage',
        value: cpuPercent,
        threshold: 90,
        impact: 'High',
        description: `Process CPU usage is critically high at ${cpuPercent.toFixed(2)}%`
      });
    }
    // Warning: CPU usage > 80%
    else if (cpuPercent > 80) {
      bottlenecks.warning.push({
        type: 'cpu_usage',
        severity: 'warning',
        metric: 'CPU Usage',
        value: cpuPercent,
        threshold: 80,
        impact: 'Medium',
        description: `Process CPU usage is elevated at ${cpuPercent.toFixed(2)}%`
      });
    }

    // Load average warnings
    const loadPerCpu = loadAvg / cpuCount;
    if (loadPerCpu > 1.5) {
      bottlenecks.critical.push({
        type: 'system_load',
        severity: 'critical',
        metric: 'Load Average per CPU',
        value: loadPerCpu,
        threshold: 1.5,
        impact: 'High',
        description: `System load average is critically high at ${loadPerCpu.toFixed(2)} per CPU`
      });
    }

    return bottlenecks;
  }

  /**
   * Identify database bottlenecks
   */
  async identifyDatabaseBottlenecks(timeWindow) {
    const dbStats = databaseMonitoring.getPerformanceStats(timeWindow);
    const bottlenecks = { critical: [], warning: [] };

    if (!dbStats) return bottlenecks;

    // Check slow queries
    if (dbStats.slowQueries && dbStats.slowQueries.length > 0) {
      const avgSlowQueryTime = dbStats.slowQueries.reduce((sum, q) => sum + q.executionTime, 0) / dbStats.slowQueries.length;
      
      if (avgSlowQueryTime > 5000) { // 5 seconds
        bottlenecks.critical.push({
          type: 'database_query',
          severity: 'critical',
          metric: 'Average Slow Query Time',
          value: avgSlowQueryTime,
          threshold: 5000,
          impact: 'High',
          description: `Database has ${dbStats.slowQueries.length} slow queries with average time ${avgSlowQueryTime.toFixed(0)}ms`
        });
      }
    }

    // Check connection pool utilization
    if (dbStats.connectionPool && dbStats.connectionPool.utilization > 0.9) {
      bottlenecks.critical.push({
        type: 'database_connections',
        severity: 'critical',
        metric: 'Connection Pool Utilization',
        value: dbStats.connectionPool.utilization * 100,
        threshold: 90,
        impact: 'High',
        description: `Database connection pool utilization is critically high at ${(dbStats.connectionPool.utilization * 100).toFixed(2)}%`
      });
    }

    return bottlenecks;
  }

  /**
   * Generate capacity planning metrics
   */
  async generateCapacityMetrics(timeWindow = this.capacityPlanningWindow) {
    try {
      const trends = await this.analyzePerformanceTrends(timeWindow);
      const currentLoad = await this.getCurrentSystemLoad();
      
      const capacityMetrics = {
        timestamp: new Date().toISOString(),
        timeWindow: timeWindow / 1000,
        current: currentLoad,
        projections: {},
        recommendations: []
      };

      // Project future capacity needs based on trends
      capacityMetrics.projections = {
        memory: this.projectMemoryNeeds(trends.memory, currentLoad.memory),
        cpu: this.projectCpuNeeds(trends.cpu, currentLoad.cpu),
        api: this.projectApiCapacity(trends.api, currentLoad.api),
        database: this.projectDatabaseCapacity(trends.database, currentLoad.database)
      };

      // Generate capacity recommendations
      capacityMetrics.recommendations = this.generateCapacityRecommendations(capacityMetrics);

      // Store for historical analysis
      this.capacityMetrics.push(capacityMetrics);
      
      // Keep only last 30 days of capacity metrics
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      this.capacityMetrics = this.capacityMetrics.filter(m => 
        new Date(m.timestamp).getTime() > thirtyDaysAgo
      );

      return capacityMetrics;
    } catch (error) {
      logger.error('Failed to generate capacity metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get current system load
   */
  async getCurrentSystemLoad() {
    const memoryStats = systemMonitoring.getMemoryStats(60000); // Last minute
    const cpuStats = systemMonitoring.getCpuStats(60000);
    const apiStats = performanceMetrics.getApiStats(60000);
    const dbStats = databaseMonitoring.getPerformanceStats(60000);

    return {
      memory: {
        heapUsagePercent: memoryStats ? (memoryStats.process.current.heapUsed / memoryStats.process.current.heapTotal) * 100 : 0,
        systemUsagePercent: memoryStats ? (memoryStats.system.current.used / memoryStats.system.current.total) * 100 : 0
      },
      cpu: {
        processPercent: cpuStats ? cpuStats.process.current.percent : 0,
        loadAvgPerCpu: cpuStats ? cpuStats.system.current.loadAvg1 / cpuStats.system.current.cpuCount : 0
      },
      api: {
        requestsPerMinute: Object.values(apiStats).reduce((sum, stats) => sum + parseFloat(stats.requestsPerMinute), 0),
        averageResponseTime: Object.values(apiStats).reduce((sum, stats) => sum + stats.averageResponseTime, 0) / Object.keys(apiStats).length || 0
      },
      database: {
        connectionUtilization: dbStats?.connectionPool?.utilization || 0,
        averageQueryTime: dbStats?.queries?.reduce((sum, q) => sum + q.executionTime, 0) / (dbStats?.queries?.length || 1) || 0
      }
    };
  }

  /**
   * Generate daily performance report
   */
  async generateDailyReport() {
    try {
      const reportDate = new Date();
      const timeWindow = 24 * 60 * 60 * 1000; // 24 hours
      
      const report = {
        date: reportDate.toISOString().split('T')[0],
        timestamp: reportDate.toISOString(),
        timeWindow: timeWindow / 1000,
        summary: {},
        trends: await this.analyzePerformanceTrends(timeWindow),
        bottlenecks: await this.identifyBottlenecks(timeWindow),
        capacity: await this.generateCapacityMetrics(timeWindow),
        recommendations: []
      };

      // Generate executive summary
      report.summary = this.generateExecutiveSummary(report);
      
      // Generate actionable recommendations
      report.recommendations = this.generateDailyRecommendations(report);

      // Store the report
      this.dailyReports.push(report);
      
      // Keep only last 30 days of reports
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      this.dailyReports = this.dailyReports.filter(r => 
        new Date(r.timestamp).getTime() > thirtyDaysAgo
      );

      logger.info('Daily performance report generated', {
        date: report.date,
        criticalBottlenecks: report.bottlenecks.critical.length,
        recommendations: report.recommendations.length
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate daily report', { error: error.message });
      throw error;
    }
  }

  /**
   * Schedule daily report generation
   */
  scheduleDailyReports() {
    // Generate report at 2 AM every day
    const scheduleNextReport = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0);
      
      const timeUntilReport = tomorrow.getTime() - now.getTime();
      
      setTimeout(async () => {
        try {
          await this.generateDailyReport();
        } catch (error) {
          logger.error('Failed to generate scheduled daily report', { error: error.message });
        }
        scheduleNextReport(); // Schedule next report
      }, timeUntilReport);
    };

    scheduleNextReport();
    logger.info('Daily performance reports scheduled');
  }

  // Helper methods for trend analysis and recommendations
  calculateEndpointTrend(endpoint, stats, timeWindow) {
    // This would ideally compare with historical data
    // For now, we'll use current metrics to determine trends
    return {
      responseTimeTrend: stats.averageResponseTime > 2000 ? 'degrading' : 'stable',
      responseTimeChange: 0 // Would calculate actual change with historical data
    };
  }

  determineTrend(value, metric) {
    // Simplified trend determination - would use historical data in production
    return 'stable';
  }

  categorizeTrend(trendValue) {
    if (trendValue > 10) return 'increasing';
    if (trendValue < -10) return 'decreasing';
    return 'stable';
  }

  getMemoryRecommendation(memoryStats) {
    const heapUsagePercent = (memoryStats.process.current.heapUsed / memoryStats.process.current.heapTotal) * 100;
    
    if (heapUsagePercent > 80) {
      return 'Consider increasing heap size or optimizing memory usage';
    }
    return 'Memory usage is within acceptable limits';
  }

  getCpuRecommendation(cpuStats) {
    const cpuPercent = cpuStats.process.current.percent;
    
    if (cpuPercent > 80) {
      return 'Consider optimizing CPU-intensive operations or scaling horizontally';
    }
    return 'CPU usage is within acceptable limits';
  }

  getDatabaseRecommendation(dbStats) {
    if (dbStats.slowQueries && dbStats.slowQueries.length > 10) {
      return 'Multiple slow queries detected - consider query optimization or indexing';
    }
    return 'Database performance is acceptable';
  }

  generateBottleneckRecommendations(bottlenecks) {
    const recommendations = [];
    
    bottlenecks.critical.forEach(bottleneck => {
      switch (bottleneck.type) {
        case 'api_response_time':
          recommendations.push(`Optimize ${bottleneck.endpoint} - consider caching, query optimization, or code profiling`);
          break;
        case 'memory_usage':
          recommendations.push('Investigate memory leaks and optimize memory usage patterns');
          break;
        case 'cpu_usage':
          recommendations.push('Profile CPU-intensive operations and consider horizontal scaling');
          break;
        case 'database_query':
          recommendations.push('Optimize slow database queries and consider adding indexes');
          break;
      }
    });

    return recommendations;
  }

  projectMemoryNeeds(memoryTrends, currentMemory) {
    // Simplified projection - would use more sophisticated modeling in production
    return {
      next30Days: currentMemory.heapUsagePercent * 1.1, // 10% growth assumption
      next90Days: currentMemory.heapUsagePercent * 1.3,
      recommendation: currentMemory.heapUsagePercent > 70 ? 'Consider memory optimization' : 'Memory capacity adequate'
    };
  }

  projectCpuNeeds(cpuTrends, currentCpu) {
    return {
      next30Days: currentCpu.processPercent * 1.1,
      next90Days: currentCpu.processPercent * 1.3,
      recommendation: currentCpu.processPercent > 70 ? 'Consider CPU optimization or scaling' : 'CPU capacity adequate'
    };
  }

  projectApiCapacity(apiTrends, currentApi) {
    return {
      next30Days: currentApi.requestsPerMinute * 1.2, // 20% growth assumption
      next90Days: currentApi.requestsPerMinute * 1.5,
      recommendation: currentApi.averageResponseTime > 1000 ? 'API optimization needed' : 'API performance adequate'
    };
  }

  projectDatabaseCapacity(dbTrends, currentDb) {
    return {
      next30Days: currentDb.connectionUtilization * 1.1,
      next90Days: currentDb.connectionUtilization * 1.3,
      recommendation: currentDb.connectionUtilization > 0.8 ? 'Consider connection pool optimization' : 'Database capacity adequate'
    };
  }

  generateCapacityRecommendations(capacityMetrics) {
    const recommendations = [];
    
    Object.entries(capacityMetrics.projections).forEach(([component, projection]) => {
      if (projection.recommendation && projection.recommendation.includes('Consider')) {
        recommendations.push(`${component.toUpperCase()}: ${projection.recommendation}`);
      }
    });

    return recommendations;
  }

  generateExecutiveSummary(report) {
    return {
      overallHealth: report.trends.overall.trend,
      criticalIssues: report.bottlenecks.critical.length,
      warningIssues: report.bottlenecks.warning.length,
      keyMetrics: {
        averageResponseTime: report.trends.api.responseTimeTrend,
        memoryTrend: report.trends.memory.process?.trend || 'stable',
        cpuTrend: report.trends.cpu.process?.trend || 'stable'
      },
      topRecommendation: report.recommendations[0] || 'System performance is stable'
    };
  }

  generateDailyRecommendations(report) {
    const recommendations = [];
    
    // Add bottleneck recommendations
    recommendations.push(...this.generateBottleneckRecommendations(report.bottlenecks));
    
    // Add capacity recommendations
    recommendations.push(...report.capacity.recommendations);
    
    // Add trend-based recommendations
    if (report.trends.overall.trend === 'degrading') {
      recommendations.push('System performance is degrading - immediate investigation recommended');
    }

    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  /**
   * Get historical daily reports
   */
  getDailyReports(limit = 30) {
    return this.dailyReports
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Get capacity planning history
   */
  getCapacityHistory(limit = 30) {
    return this.capacityMetrics
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Reset analytics data
   */
  reset() {
    this.trendAnalysisCache.clear();
    this.bottleneckCache.clear();
    this.capacityMetrics = [];
    this.dailyReports = [];
    logger.info('Performance analytics data reset');
  }
}

// Export singleton instance
export const performanceAnalytics = new PerformanceAnalytics();