import LoadTester from './loadTest.js';
import PerformanceBenchmark from './benchmark.js';
import StressTester from './stressTest.js';
import RegressionDetector from './regressionDetector.js';
import fs from 'fs/promises';
import path from 'path';

class PerformanceTestSuite {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.loadTester = new LoadTester(baseUrl);
    this.benchmark = new PerformanceBenchmark(baseUrl);
    this.stressTester = new StressTester(baseUrl);
    this.regressionDetector = new RegressionDetector();
  }

  async runAllTests(options = {}) {
    const {
      runLoad = true,
      runBenchmark = true,
      runStress = true,
      runRegression = true,
      generateSummary = true
    } = options;

    console.log('🚀 Starting Comprehensive Performance Testing Suite...\n');
    console.log(`Target URL: ${this.baseUrl}`);
    console.log(`Tests to run: Load(${runLoad}), Benchmark(${runBenchmark}), Stress(${runStress}), Regression(${runRegression})\n`);

    const results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      tests: {}
    };

    try {
      // Run Load Tests
      if (runLoad) {
        console.log('📊 Running Load Tests...');
        results.tests.loadTest = await this.loadTester.runAllTests();
        console.log('✅ Load tests completed\n');
      }

      // Run Benchmarks
      if (runBenchmark) {
        console.log('🎯 Running Performance Benchmarks...');
        results.tests.benchmark = await this.benchmark.runAutomatedSuite();
        console.log('✅ Benchmarks completed\n');
      }

      // Run Stress Tests
      if (runStress) {
        console.log('🔥 Running Stress Tests...');
        results.tests.stressTest = await this.stressTester.runFullStressTest();
        console.log('✅ Stress tests completed\n');
      }

      // Run Regression Analysis
      if (runRegression) {
        console.log('🔍 Running Regression Analysis...');
        results.tests.regressionAnalysis = await this.regressionDetector.runContinuousMonitoring();
        console.log('✅ Regression analysis completed\n');
      }

      // Generate Summary Report
      if (generateSummary) {
        results.summary = await this.generateOverallSummary(results.tests);
        await this.saveSummaryReport(results);
      }

      console.log('🎉 All performance tests completed successfully!');
      this.printSummary(results.summary);

      return results;

    } catch (error) {
      console.error('❌ Performance test suite failed:', error);
      throw error;
    }
  }

  async generateOverallSummary(tests) {
    const summary = {
      timestamp: new Date().toISOString(),
      overallStatus: 'PASS',
      criticalIssues: [],
      recommendations: []
    };

    // Analyze Load Test Results
    if (tests.loadTest) {
      const loadSummary = tests.loadTest.summary;
      summary.loadTest = {
        averageLatency: loadSummary.averageLatency,
        totalRequests: loadSummary.totalRequests,
        errorRate: loadSummary.errorRate,
        status: loadSummary.errorRate < 5 ? 'PASS' : 'FAIL'
      };

      if (loadSummary.errorRate > 5) {
        summary.criticalIssues.push(`High error rate in load tests: ${loadSummary.errorRate.toFixed(2)}%`);
        summary.overallStatus = 'FAIL';
      }

      if (loadSummary.averageLatency > 3000) {
        summary.criticalIssues.push(`High average latency: ${loadSummary.averageLatency.toFixed(2)}ms`);
        summary.recommendations.push('Consider implementing caching or query optimization');
      }
    }

    // Analyze Benchmark Results
    if (tests.benchmark) {
      const benchmarkSummary = tests.benchmark.summary;
      summary.benchmark = {
        averageResponseTime: benchmarkSummary.avgResponseTime,
        regressions: benchmarkSummary.regressions,
        improvements: benchmarkSummary.improvements,
        status: benchmarkSummary.regressions === 0 ? 'PASS' : 'WARN'
      };

      if (benchmarkSummary.regressions > 0) {
        summary.criticalIssues.push(`${benchmarkSummary.regressions} performance regressions detected`);
        summary.recommendations.push('Review recent changes that may have impacted performance');
      }
    }

    // Analyze Stress Test Results
    if (tests.stressTest) {
      const stressSummary = tests.stressTest.summary;
      summary.stressTest = {
        maxConnectionsHandled: stressSummary.maxConnectionsHandled,
        breakingPoint: stressSummary.systemBreakingPoint,
        resilienceScore: stressSummary.overallStressResilience,
        status: stressSummary.overallStressResilience > 70 ? 'PASS' : 'WARN'
      };

      if (stressSummary.overallStressResilience < 50) {
        summary.criticalIssues.push(`Low stress resilience: ${stressSummary.overallStressResilience.toFixed(2)}%`);
        summary.recommendations.push('Implement circuit breakers and improve error handling');
      }

      if (stressSummary.systemBreakingPoint !== 'Not reached' && stressSummary.systemBreakingPoint < 500) {
        summary.recommendations.push('Consider horizontal scaling to handle higher loads');
      }
    }

    // Analyze Regression Results
    if (tests.regressionAnalysis && tests.regressionAnalysis.length > 0) {
      summary.regressionAnalysis = {
        totalRegressions: tests.regressionAnalysis.length,
        criticalRegressions: tests.regressionAnalysis.filter(r => Math.abs(r.changePercent) > 50).length,
        status: tests.regressionAnalysis.length === 0 ? 'PASS' : 'WARN'
      };

      if (tests.regressionAnalysis.length > 0) {
        summary.overallStatus = 'WARN';
        summary.recommendations.push('Monitor performance trends and investigate regression causes');
      }
    }

    // Generate overall recommendations
    if (summary.criticalIssues.length === 0) {
      summary.recommendations.push('System performance is within acceptable limits');
      summary.recommendations.push('Continue regular performance monitoring');
    }

    return summary;
  }

  async saveSummaryReport(results) {
    const reportPath = path.join(
      process.cwd(), 
      'src/tests/performance/reports', 
      `performance-suite-${Date.now()}.json`
    );
    
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    
    console.log(`📊 Complete performance report saved to: ${reportPath}`);
    return reportPath;
  }

  printSummary(summary) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE TEST SUITE SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n🎯 Overall Status: ${summary.overallStatus}`);
    console.log(`📅 Test Date: ${summary.timestamp}`);
    
    if (summary.loadTest) {
      console.log(`\n📈 Load Test Results:`);
      console.log(`   Average Latency: ${summary.loadTest.averageLatency.toFixed(2)}ms`);
      console.log(`   Total Requests: ${summary.loadTest.totalRequests}`);
      console.log(`   Error Rate: ${summary.loadTest.errorRate.toFixed(2)}%`);
      console.log(`   Status: ${summary.loadTest.status}`);
    }
    
    if (summary.benchmark) {
      console.log(`\n🎯 Benchmark Results:`);
      console.log(`   Average Response Time: ${summary.benchmark.averageResponseTime.toFixed(2)}ms`);
      console.log(`   Regressions: ${summary.benchmark.regressions}`);
      console.log(`   Improvements: ${summary.benchmark.improvements}`);
      console.log(`   Status: ${summary.benchmark.status}`);
    }
    
    if (summary.stressTest) {
      console.log(`\n🔥 Stress Test Results:`);
      console.log(`   Max Connections: ${summary.stressTest.maxConnectionsHandled}`);
      console.log(`   Breaking Point: ${summary.stressTest.breakingPoint}`);
      console.log(`   Resilience Score: ${summary.stressTest.resilienceScore.toFixed(2)}%`);
      console.log(`   Status: ${summary.stressTest.status}`);
    }
    
    if (summary.criticalIssues.length > 0) {
      console.log(`\n⚠️  Critical Issues:`);
      summary.criticalIssues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    if (summary.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      summary.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
    
    console.log('\n' + '='.repeat(60));
  }

  async runQuickTest() {
    console.log('⚡ Running Quick Performance Test...\n');
    
    return await this.runAllTests({
      runLoad: true,
      runBenchmark: true,
      runStress: false, // Skip stress test for quick run
      runRegression: true,
      generateSummary: true
    });
  }

  async runFullTest() {
    console.log('🔥 Running Full Performance Test Suite...\n');
    
    return await this.runAllTests({
      runLoad: true,
      runBenchmark: true,
      runStress: true,
      runRegression: true,
      generateSummary: true
    });
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0] || 'full';
const baseUrl = args[1] || 'http://localhost:3000';

if (import.meta.url === `file://${process.argv[1]}`) {
  const suite = new PerformanceTestSuite(baseUrl);
  
  switch (command) {
    case 'quick':
      suite.runQuickTest().catch(console.error);
      break;
    case 'load':
      suite.loadTester.runAllTests().catch(console.error);
      break;
    case 'benchmark':
      suite.benchmark.runAutomatedSuite().catch(console.error);
      break;
    case 'stress':
      suite.stressTester.runFullStressTest().catch(console.error);
      break;
    case 'regression':
      suite.regressionDetector.runContinuousMonitoring().catch(console.error);
      break;
    case 'full':
    default:
      suite.runFullTest().catch(console.error);
      break;
  }
}

export default PerformanceTestSuite;