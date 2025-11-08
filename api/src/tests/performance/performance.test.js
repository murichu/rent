import PerformanceTestSuite from './runPerformanceTests.js';
import LoadTester from './loadTest.js';
import PerformanceBenchmark from './benchmark.js';
import RegressionDetector from './regressionDetector.js';

describe('Performance Test Suite', () => {
  let testSuite;
  const baseUrl = global.testConfig?.baseUrl || 'http://localhost:3000';

  beforeAll(() => {
    testSuite = new PerformanceTestSuite(baseUrl);
  });

  describe('Load Testing', () => {
    let loadTester;

    beforeAll(() => {
      loadTester = new LoadTester(baseUrl);
    });

    test('should handle dashboard load with acceptable performance', async () => {
      const result = await loadTester.testDashboardPerformance();
      
      expect(result.latency.average).toBeLessThan(3000); // Less than 3 seconds
      expect(result.errors).toBeLessThan(result.requests.total * 0.05); // Less than 5% error rate
      expect(result.throughput.average).toBeGreaterThan(10); // At least 10 req/sec
    }, 60000);

    test('should handle concurrent API requests', async () => {
      const result = await loadTester.testApiEndpoints();
      
      // Verify all endpoints performed within acceptable limits
      expect(loadTester.results.length).toBeGreaterThan(0);
      
      const avgLatency = loadTester.results.reduce((sum, r) => sum + r.avgLatency, 0) / loadTester.results.length;
      expect(avgLatency).toBeLessThan(2000); // Average less than 2 seconds
    }, 120000);
  });

  describe('Performance Benchmarking', () => {
    let benchmark;

    beforeAll(() => {
      benchmark = new PerformanceBenchmark(baseUrl);
    });

    test('should establish baseline performance metrics', async () => {
      await benchmark.loadBaselines();
      await benchmark.runCoreBenchmarks();
      
      expect(benchmark.benchmarks.length).toBeGreaterThan(0);
      
      // Verify core endpoints meet performance criteria
      const dashboardBenchmark = benchmark.benchmarks.find(b => b.name === 'Dashboard Stats');
      if (dashboardBenchmark) {
        expect(dashboardBenchmark.avgTime).toBeLessThan(2000);
        expect(dashboardBenchmark.successRate).toBeGreaterThan(95);
      }
    }, 180000);

    test('should detect performance regressions', async () => {
      const comparisons = benchmark.compareWithBaselines();
      
      // If we have baseline data, check for regressions
      if (comparisons.length > 0) {
        const criticalRegressions = comparisons.filter(c => c.regression && c.change > 50);
        expect(criticalRegressions.length).toBe(0); // No critical regressions
      }
    });
  });

  describe('Regression Detection', () => {
    let regressionDetector;

    beforeAll(() => {
      regressionDetector = new RegressionDetector();
    });

    test('should analyze performance trends', async () => {
      const regressions = await regressionDetector.detectRegressions('benchmark');
      
      // Should not have critical regressions (>50% degradation)
      const criticalRegressions = regressions.filter(r => Math.abs(r.changePercent) > 50);
      expect(criticalRegressions.length).toBe(0);
    });

    test('should generate regression reports', async () => {
      const report = await regressionDetector.generateRegressionReport('benchmark');
      
      expect(report).toHaveProperty('testType');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('regressions');
      expect(report).toHaveProperty('summary');
    });
  });

  describe('Integration Tests', () => {
    test('should run quick performance test suite', async () => {
      const results = await testSuite.runQuickTest();
      
      expect(results).toHaveProperty('timestamp');
      expect(results).toHaveProperty('tests');
      expect(results).toHaveProperty('summary');
      
      // Verify overall status is not FAIL
      expect(results.summary.overallStatus).not.toBe('FAIL');
    }, 300000); // 5 minutes timeout

    test('should generate comprehensive performance report', async () => {
      const results = await testSuite.runAllTests({
        runLoad: true,
        runBenchmark: true,
        runStress: false, // Skip stress test in unit tests
        runRegression: true,
        generateSummary: true
      });
      
      expect(results.summary).toHaveProperty('overallStatus');
      expect(results.summary).toHaveProperty('recommendations');
      
      // Should have run multiple test types
      expect(Object.keys(results.tests).length).toBeGreaterThan(1);
    }, 400000); // 6+ minutes timeout
  });

  describe('Performance Validation', () => {
    test('should validate system meets performance requirements', async () => {
      // Run a subset of benchmarks to validate requirements
      const benchmark = new PerformanceBenchmark(baseUrl);
      
      // Test dashboard performance (Requirement 1.1)
      const dashboardResult = await benchmark.benchmarkEndpoint(
        'Dashboard Load Time',
        'GET',
        '/api/dashboard/stats',
        null,
        10
      );
      
      expect(dashboardResult.avgTime).toBeLessThan(2000); // <2 seconds per requirement
      
      // Test API response times (Requirement 6.1)
      const apiResult = await benchmark.benchmarkEndpoint(
        'API Response Time',
        'GET',
        '/api/properties',
        null,
        10
      );
      
      expect(apiResult.avgTime).toBeLessThan(500); // <500ms for API responses
    }, 120000);

    test('should validate concurrent user handling', async () => {
      const loadTester = new LoadTester(baseUrl);
      
      // Test with reduced load for unit test environment
      const result = await loadTester.testDashboardPerformance();
      
      // Should handle concurrent users without excessive errors
      const errorRate = (result.errors / result.requests.total) * 100;
      expect(errorRate).toBeLessThan(10); // Less than 10% error rate
      
      // Should maintain reasonable response times
      expect(result.latency.p95).toBeLessThan(5000); // 95th percentile < 5 seconds
    }, 120000);
  });
});