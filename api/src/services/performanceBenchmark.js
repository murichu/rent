import { performanceMetrics } from './performanceMetrics.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * Performance Benchmark Service
 * Establishes baseline metrics and tracks performance regression
 */
class PerformanceBenchmark {
  constructor() {
    this.benchmarkFile = path.join(process.cwd(), 'performance-benchmarks.json');
    this.benchmarks = this.loadBenchmarks();
    this.regressionThreshold = 0.2; // 20% performance degradation threshold
  }

  /**
   * Load existing benchmarks from file
   */
  loadBenchmarks() {
    try {
      if (fs.existsSync(this.benchmarkFile)) {
        const data = fs.readFileSync(this.benchmarkFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      logger.error('Failed to load benchmarks:', error);
    }
    
    return {
      endpoints: {},
      system: {},
      lastUpdated: null,
      version: '1.0.0'
    };
  }

  /**
   * Save benchmarks to file
   */
  saveBenchmarks() {
    try {
      this.benchmarks.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.benchmarkFile, JSON.stringify(this.benchmarks, null, 2));
      logger.info('Performance benchmarks saved');
    } catch (error) {
      logger.error('Failed to save benchmarks:', error);
    }
  }

  /**
   * Establish baseline performance metrics
   */
  async establishBaseline(duration = 3600000) { // 1 hour default
    logger.info('Establishing performance baseline...');
    
    try {
      // Get current performance data
      const apiStats = performanceMetrics.getApiStats(duration);
      const memoryStats = performanceMetrics.getMemoryStats(duration);
      const errorStats = performanceMetrics.getErrorStats(duration);
      
      // Calculate baseline metrics for each endpoint
      const endpointBaselines = {};
      for (const [endpoint, stats] of Object.entries(apiStats)) {
        endpointBaselines[endpoint] = {
          averageResponseTime: stats.averageResponseTime,
          medianResponseTime: stats.medianResponseTime,
          p95ResponseTime: stats.p95ResponseTime,
          p99ResponseTime: stats.p99ResponseTime,
          requestsPerMinute: parseFloat(stats.requestsPerMinute),
          errorRate: stats.errorRate,
          establishedAt: new Date().toISOString(),
          sampleSize: stats.totalRequests
        };
      }

      // System baseline metrics
      const systemBaseline = {
        memoryUsage: memoryStats ? {
          averageHeapUsed: memoryStats.heapUsed.average,
          maxHeapUsed: memoryStats.heapUsed.max,
          averageRss: memoryStats.rss.average,
          maxRss: memoryStats.rss.max
        } : null,
        errorRate: errorStats.totalErrors > 0 ? 
          (errorStats.totalErrors / Object.values(apiStats).reduce((sum, s) => sum + s.totalRequests, 0)) * 100 : 0,
        establishedAt: new Date().toISOString()
      };

      // Update benchmarks
      this.benchmarks.endpoints = { ...this.benchmarks.endpoints, ...endpointBaselines };
      this.benchmarks.system = systemBaseline;
      
      // Save to file
      this.saveBenchmarks();
      
      logger.info('Performance baseline established', {
        endpointsCount: Object.keys(endpointBaselines).length,
        totalRequests: Object.values(apiStats).reduce((sum, s) => sum + s.totalRequests, 0)
      });

      return {
        endpoints: endpointBaselines,
        system: systemBaseline,
        summary: {
          endpointsAnalyzed: Object.keys(endpointBaselines).length,
          averageResponseTime: Object.values(endpointBaselines).reduce((sum, b) => sum + b.averageResponseTime, 0) / Object.keys(endpointBaselines).length,
          totalRequests: Object.values(apiStats).reduce((sum, s) => sum + s.totalRequests, 0)
        }
      };

    } catch (error) {
      logger.error('Failed to establish baseline:', error);
      throw error;
    }
  }

  /**
   * Compare current performance against baseline
   */
  async compareAgainstBaseline(duration = 3600000) {
    if (!this.benchmarks.endpoints || Object.keys(this.benchmarks.endpoints).length === 0) {
      throw new Error('No baseline established. Run establishBaseline() first.');
    }

    logger.info('Comparing current performance against baseline...');

    try {
      const currentStats = performanceMetrics.getApiStats(duration);
      const currentMemory = performanceMetrics.getMemoryStats(duration);
      const comparisons = {};
      const regressions = [];
      const improvements = [];

      // Compare each endpoint
      for (const [endpoint, baseline] of Object.entries(this.benchmarks.endpoints)) {
        const current = currentStats[endpoint];
        
        if (!current) {
          comparisons[endpoint] = {
            status: 'no_data',
            message: 'No current data available for comparison'
          };
          continue;
        }

        const comparison = this.compareEndpointMetrics(baseline, current);
        comparisons[endpoint] = comparison;

        // Check for regressions
        if (comparison.hasRegression) {
          regressions.push({
            endpoint,
            ...comparison
          });
        }

        // Check for improvements
        if (comparison.hasImprovement) {
          improvements.push({
            endpoint,
            ...comparison
          });
        }
      }

      // System-level comparison
      const systemComparison = this.compareSystemMetrics(this.benchmarks.system, currentMemory);

      const report = {
        timestamp: new Date().toISOString(),
        baselineDate: this.benchmarks.lastUpdated,
        summary: {
          endpointsCompared: Object.keys(comparisons).length,
          regressions: regressions.length,
          improvements: improvements.length,
          overallStatus: regressions.length > 0 ? 'degraded' : 
                        improvements.length > 0 ? 'improved' : 'stable'
        },
        endpoints: comparisons,
        system: systemComparison,
        regressions,
        improvements,
        recommendations: this.generateRegressionRecommendations(regressions)
      };

      logger.info('Performance comparison completed', report.summary);
      return report;

    } catch (error) {
      logger.error('Failed to compare against baseline:', error);
      throw error;
    }
  }

  /**
   * Compare endpoint metrics
   */
  compareEndpointMetrics(baseline, current) {
    const responseTimeChange = ((current.averageResponseTime - baseline.averageResponseTime) / baseline.averageResponseTime) * 100;
    const throughputChange = ((parseFloat(current.requestsPerMinute) - baseline.requestsPerMinute) / baseline.requestsPerMinute) * 100;
    const errorRateChange = current.errorRate - baseline.errorRate;

    const hasRegression = responseTimeChange > (this.regressionThreshold * 100) || 
                         throughputChange < -(this.regressionThreshold * 100) ||
                         errorRateChange > 2; // 2% error rate increase

    const hasImprovement = responseTimeChange < -(this.regressionThreshold * 100) || 
                          throughputChange > (this.regressionThreshold * 100) ||
                          errorRateChange < -1; // 1% error rate decrease

    return {
      baseline: {
        responseTime: baseline.averageResponseTime,
        throughput: baseline.requestsPerMinute,
        errorRate: baseline.errorRate
      },
      current: {
        responseTime: current.averageResponseTime,
        throughput: parseFloat(current.requestsPerMinute),
        errorRate: current.errorRate
      },
      changes: {
        responseTime: {
          absolute: current.averageResponseTime - baseline.averageResponseTime,
          percentage: Math.round(responseTimeChange * 100) / 100
        },
        throughput: {
          absolute: parseFloat(current.requestsPerMinute) - baseline.requestsPerMinute,
          percentage: Math.round(throughputChange * 100) / 100
        },
        errorRate: {
          absolute: errorRateChange,
          percentage: baseline.errorRate > 0 ? Math.round((errorRateChange / baseline.errorRate) * 100 * 100) / 100 : 0
        }
      },
      hasRegression,
      hasImprovement,
      status: hasRegression ? 'degraded' : hasImprovement ? 'improved' : 'stable',
      severity: this.calculateSeverity(responseTimeChange, throughputChange, errorRateChange)
    };
  }

  /**
   * Compare system metrics
   */
  compareSystemMetrics(baseline, current) {
    if (!baseline || !current) {
      return {
        status: 'no_data',
        message: 'Insufficient data for system comparison'
      };
    }

    const memoryChange = ((current.heapUsed.average - baseline.memoryUsage.averageHeapUsed) / baseline.memoryUsage.averageHeapUsed) * 100;
    const rssChange = ((current.rss.average - baseline.memoryUsage.averageRss) / baseline.memoryUsage.averageRss) * 100;

    const hasRegression = memoryChange > (this.regressionThreshold * 100) || 
                         rssChange > (this.regressionThreshold * 100);

    return {
      baseline: {
        heapUsed: baseline.memoryUsage.averageHeapUsed,
        rss: baseline.memoryUsage.averageRss
      },
      current: {
        heapUsed: current.heapUsed.average,
        rss: current.rss.average
      },
      changes: {
        heapUsed: {
          absolute: current.heapUsed.average - baseline.memoryUsage.averageHeapUsed,
          percentage: Math.round(memoryChange * 100) / 100
        },
        rss: {
          absolute: current.rss.average - baseline.memoryUsage.averageRss,
          percentage: Math.round(rssChange * 100) / 100
        }
      },
      hasRegression,
      status: hasRegression ? 'degraded' : 'stable'
    };
  }

  /**
   * Calculate severity of performance changes
   */
  calculateSeverity(responseTimeChange, throughputChange, errorRateChange) {
    if (responseTimeChange > 50 || throughputChange < -50 || errorRateChange > 5) {
      return 'critical';
    } else if (responseTimeChange > 30 || throughputChange < -30 || errorRateChange > 3) {
      return 'high';
    } else if (responseTimeChange > 20 || throughputChange < -20 || errorRateChange > 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate recommendations for performance regressions
   */
  generateRegressionRecommendations(regressions) {
    const recommendations = [];

    const criticalRegressions = regressions.filter(r => r.severity === 'critical');
    if (criticalRegressions.length > 0) {
      recommendations.push({
        priority: 'critical',
        action: 'Immediate investigation required',
        description: `${criticalRegressions.length} endpoints showing critical performance degradation`,
        endpoints: criticalRegressions.map(r => r.endpoint)
      });
    }

    const highResponseTimeRegressions = regressions.filter(r => r.changes.responseTime.percentage > 30);
    if (highResponseTimeRegressions.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Optimize response times',
        description: 'Consider database query optimization, caching, or code profiling',
        endpoints: highResponseTimeRegressions.map(r => r.endpoint)
      });
    }

    const lowThroughputRegressions = regressions.filter(r => r.changes.throughput.percentage < -30);
    if (lowThroughputRegressions.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Improve throughput',
        description: 'Consider connection pooling, load balancing, or horizontal scaling',
        endpoints: lowThroughputRegressions.map(r => r.endpoint)
      });
    }

    const errorRateRegressions = regressions.filter(r => r.changes.errorRate.absolute > 2);
    if (errorRateRegressions.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Investigate error increases',
        description: 'Review error logs and implement better error handling',
        endpoints: errorRateRegressions.map(r => r.endpoint)
      });
    }

    return recommendations;
  }

  /**
   * Run automated performance regression test
   */
  async runRegressionTest() {
    try {
      logger.info('Starting automated performance regression test...');
      
      // Compare against baseline
      const comparison = await this.compareAgainstBaseline();
      
      // Generate report
      const report = {
        testType: 'regression',
        timestamp: new Date().toISOString(),
        passed: comparison.summary.overallStatus !== 'degraded',
        ...comparison
      };

      // Log results
      if (report.passed) {
        logger.info('Performance regression test PASSED', {
          status: comparison.summary.overallStatus,
          improvements: comparison.summary.improvements
        });
      } else {
        logger.warn('Performance regression test FAILED', {
          regressions: comparison.summary.regressions,
          criticalIssues: comparison.regressions.filter(r => r.severity === 'critical').length
        });
      }

      return report;

    } catch (error) {
      logger.error('Performance regression test failed:', error);
      return {
        testType: 'regression',
        timestamp: new Date().toISOString(),
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * Get current benchmarks
   */
  getBenchmarks() {
    return this.benchmarks;
  }

  /**
   * Update specific endpoint benchmark
   */
  updateEndpointBenchmark(endpoint, metrics) {
    this.benchmarks.endpoints[endpoint] = {
      ...metrics,
      establishedAt: new Date().toISOString()
    };
    this.saveBenchmarks();
    
    logger.info('Endpoint benchmark updated', { endpoint });
  }

  /**
   * Reset all benchmarks
   */
  resetBenchmarks() {
    this.benchmarks = {
      endpoints: {},
      system: {},
      lastUpdated: null,
      version: '1.0.0'
    };
    this.saveBenchmarks();
    
    logger.info('All benchmarks reset');
  }
}

// Export singleton instance
export const performanceBenchmark = new PerformanceBenchmark();
export default performanceBenchmark;