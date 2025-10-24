import autocannon from 'autocannon';
import logger from '../../utils/logger.js';

/**
 * Load Testing Framework
 * Tests API endpoints under various load conditions
 */
class LoadTester {
  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    this.defaultOptions = {
      connections: 10,
      pipelining: 1,
      duration: 30, // 30 seconds
      timeout: 30, // 30 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Test dashboard endpoint performance
   */
  async testDashboardPerformance(authToken, options = {}) {
    const testOptions = {
      ...this.defaultOptions,
      ...options,
      url: `${this.baseUrl}/api/v1/dashboard`,
      headers: {
        ...this.defaultOptions.headers,
        'Authorization': `Bearer ${authToken}`
      }
    };

    logger.info('Starting dashboard load test', testOptions);

    try {
      const result = await autocannon(testOptions);
      
      const analysis = this.analyzeResults(result, 'Dashboard');
      logger.info('Dashboard load test completed', analysis);
      
      return {
        endpoint: 'dashboard',
        ...analysis,
        rawResults: result
      };
    } catch (error) {
      logger.error('Dashboard load test failed:', error);
      throw error;
    }
  }

  /**
   * Test property listing performance
   */
  async testPropertyListingPerformance(authToken, options = {}) {
    const testOptions = {
      ...this.defaultOptions,
      ...options,
      url: `${this.baseUrl}/api/v1/properties?page=1&limit=50`,
      headers: {
        ...this.defaultOptions.headers,
        'Authorization': `Bearer ${authToken}`
      }
    };

    logger.info('Starting property listing load test', testOptions);

    try {
      const result = await autocannon(testOptions);
      
      const analysis = this.analyzeResults(result, 'Property Listing');
      logger.info('Property listing load test completed', analysis);
      
      return {
        endpoint: 'properties',
        ...analysis,
        rawResults: result
      };
    } catch (error) {
      logger.error('Property listing load test failed:', error);
      throw error;
    }
  }

  /**
   * Test payment processing performance
   */
  async testPaymentProcessingPerformance(authToken, paymentData, options = {}) {
    const testOptions = {
      ...this.defaultOptions,
      ...options,
      url: `${this.baseUrl}/api/v1/payments`,
      method: 'POST',
      headers: {
        ...this.defaultOptions.headers,
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(paymentData)
    };

    logger.info('Starting payment processing load test', testOptions);

    try {
      const result = await autocannon(testOptions);
      
      const analysis = this.analyzeResults(result, 'Payment Processing');
      logger.info('Payment processing load test completed', analysis);
      
      return {
        endpoint: 'payments',
        ...analysis,
        rawResults: result
      };
    } catch (error) {
      logger.error('Payment processing load test failed:', error);
      throw error;
    }
  }

  /**
   * Test bulk operations performance
   */
  async testBulkOperationsPerformance(authToken, bulkData, options = {}) {
    const testOptions = {
      ...this.defaultOptions,
      ...options,
      connections: 5, // Lower connections for bulk operations
      url: `${this.baseUrl}/api/v1/bulk/properties`,
      method: 'POST',
      headers: {
        ...this.defaultOptions.headers,
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(bulkData)
    };

    logger.info('Starting bulk operations load test', testOptions);

    try {
      const result = await autocannon(testOptions);
      
      const analysis = this.analyzeResults(result, 'Bulk Operations');
      logger.info('Bulk operations load test completed', analysis);
      
      return {
        endpoint: 'bulk',
        ...analysis,
        rawResults: result
      };
    } catch (error) {
      logger.error('Bulk operations load test failed:', error);
      throw error;
    }
  }

  /**
   * Run comprehensive load test suite
   */
  async runComprehensiveLoadTest(authToken, testData = {}) {
    const results = [];
    
    try {
      // Test 1: Dashboard with 100 concurrent users
      logger.info('Running dashboard load test...');
      const dashboardResult = await this.testDashboardPerformance(authToken, {
        connections: 100,
        duration: 60
      });
      results.push(dashboardResult);

      // Wait between tests
      await this.wait(5000);

      // Test 2: Property listing with pagination
      logger.info('Running property listing load test...');
      const propertyResult = await this.testPropertyListingPerformance(authToken, {
        connections: 50,
        duration: 45
      });
      results.push(propertyResult);

      // Wait between tests
      await this.wait(5000);

      // Test 3: Payment processing (if test data provided)
      if (testData.payment) {
        logger.info('Running payment processing load test...');
        const paymentResult = await this.testPaymentProcessingPerformance(
          authToken, 
          testData.payment,
          {
            connections: 20,
            duration: 30
          }
        );
        results.push(paymentResult);
        
        await this.wait(5000);
      }

      // Test 4: Bulk operations (if test data provided)
      if (testData.bulk) {
        logger.info('Running bulk operations load test...');
        const bulkResult = await this.testBulkOperationsPerformance(
          authToken,
          testData.bulk,
          {
            connections: 5,
            duration: 60
          }
        );
        results.push(bulkResult);
      }

      // Generate comprehensive report
      const report = this.generateComprehensiveReport(results);
      logger.info('Comprehensive load test completed', report.summary);
      
      return report;

    } catch (error) {
      logger.error('Comprehensive load test failed:', error);
      throw error;
    }
  }

  /**
   * Analyze test results
   */
  analyzeResults(result, testName) {
    const {
      requests,
      throughput,
      latency,
      errors,
      timeouts,
      duration
    } = result;

    const avgLatency = latency.average;
    const p95Latency = latency.p95;
    const p99Latency = latency.p99;
    const requestsPerSecond = throughput.average;
    const errorRate = (errors / requests.total) * 100;
    const timeoutRate = (timeouts / requests.total) * 100;

    // Performance benchmarks
    const benchmarks = {
      dashboard: { maxLatency: 2000, minRPS: 50 },
      properties: { maxLatency: 1000, minRPS: 100 },
      payments: { maxLatency: 10000, minRPS: 10 },
      bulk: { maxLatency: 30000, minRPS: 1 }
    };

    const testKey = testName.toLowerCase().replace(' ', '');
    const benchmark = benchmarks[testKey] || benchmarks.dashboard;

    const passed = avgLatency <= benchmark.maxLatency && 
                   requestsPerSecond >= benchmark.minRPS &&
                   errorRate < 5;

    return {
      testName,
      duration: duration,
      totalRequests: requests.total,
      requestsPerSecond: Math.round(requestsPerSecond),
      averageLatency: Math.round(avgLatency),
      p95Latency: Math.round(p95Latency),
      p99Latency: Math.round(p99Latency),
      errorRate: Math.round(errorRate * 100) / 100,
      timeoutRate: Math.round(timeoutRate * 100) / 100,
      throughputMB: Math.round(throughput.average / 1024 / 1024 * 100) / 100,
      benchmark: benchmark,
      passed: passed,
      issues: this.identifyIssues(avgLatency, requestsPerSecond, errorRate, benchmark)
    };
  }

  /**
   * Identify performance issues
   */
  identifyIssues(avgLatency, rps, errorRate, benchmark) {
    const issues = [];

    if (avgLatency > benchmark.maxLatency) {
      issues.push({
        type: 'latency',
        severity: avgLatency > benchmark.maxLatency * 2 ? 'critical' : 'warning',
        message: `Average latency (${avgLatency}ms) exceeds benchmark (${benchmark.maxLatency}ms)`
      });
    }

    if (rps < benchmark.minRPS) {
      issues.push({
        type: 'throughput',
        severity: rps < benchmark.minRPS * 0.5 ? 'critical' : 'warning',
        message: `Requests per second (${rps}) below benchmark (${benchmark.minRPS})`
      });
    }

    if (errorRate > 5) {
      issues.push({
        type: 'errors',
        severity: errorRate > 10 ? 'critical' : 'warning',
        message: `Error rate (${errorRate}%) exceeds acceptable threshold (5%)`
      });
    }

    return issues;
  }

  /**
   * Generate comprehensive report
   */
  generateComprehensiveReport(results) {
    const summary = {
      totalTests: results.length,
      passedTests: results.filter(r => r.passed).length,
      failedTests: results.filter(r => !r.passed).length,
      overallLatency: Math.round(results.reduce((sum, r) => sum + r.averageLatency, 0) / results.length),
      overallThroughput: Math.round(results.reduce((sum, r) => sum + r.requestsPerSecond, 0)),
      overallErrorRate: Math.round(results.reduce((sum, r) => sum + r.errorRate, 0) / results.length * 100) / 100,
      criticalIssues: results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'critical').length, 0),
      warnings: results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'warning').length, 0)
    };

    const recommendations = this.generateRecommendations(results);

    return {
      timestamp: new Date().toISOString(),
      summary,
      results,
      recommendations,
      passed: summary.failedTests === 0 && summary.criticalIssues === 0
    };
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Check for high latency issues
    const highLatencyTests = results.filter(r => r.averageLatency > 3000);
    if (highLatencyTests.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'latency',
        issue: 'High response times detected',
        recommendation: 'Consider implementing caching, database query optimization, or horizontal scaling',
        affectedEndpoints: highLatencyTests.map(t => t.endpoint)
      });
    }

    // Check for low throughput
    const lowThroughputTests = results.filter(r => r.requestsPerSecond < 10);
    if (lowThroughputTests.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'throughput',
        issue: 'Low throughput detected',
        recommendation: 'Optimize database queries, implement connection pooling, or add load balancing',
        affectedEndpoints: lowThroughputTests.map(t => t.endpoint)
      });
    }

    // Check for high error rates
    const highErrorTests = results.filter(r => r.errorRate > 5);
    if (highErrorTests.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'reliability',
        issue: 'High error rates detected',
        recommendation: 'Investigate error logs, implement better error handling, and add circuit breakers',
        affectedEndpoints: highErrorTests.map(t => t.endpoint)
      });
    }

    return recommendations;
  }

  /**
   * Wait utility function
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate test data for load testing
   */
  generateTestData() {
    return {
      payment: {
        amount: 50000,
        method: 'MPESA',
        leaseId: 'test-lease-id',
        reference: `TEST-${Date.now()}`
      },
      bulk: {
        properties: Array.from({ length: 10 }, (_, i) => ({
          name: `Test Property ${i + 1}`,
          address: `Test Address ${i + 1}`,
          type: 'APARTMENT',
          monthlyRent: 25000 + (i * 5000)
        }))
      }
    };
  }
}

export default LoadTester;