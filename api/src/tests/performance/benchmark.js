import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

class PerformanceBenchmark {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.benchmarks = [];
    this.baselines = {};
  }

  async loadBaselines() {
    try {
      const baselinePath = path.join(process.cwd(), 'src/tests/performance/baselines.json');
      const data = await fs.readFile(baselinePath, 'utf8');
      this.baselines = JSON.parse(data);
      console.log('📊 Loaded performance baselines');
    } catch (error) {
      console.log('📊 No existing baselines found, will create new ones');
      this.baselines = {};
    }
  }

  async saveBaselines() {
    const baselinePath = path.join(process.cwd(), 'src/tests/performance/baselines.json');
    await fs.mkdir(path.dirname(baselinePath), { recursive: true });
    await fs.writeFile(baselinePath, JSON.stringify(this.baselines, null, 2));
    console.log('💾 Saved performance baselines');
  }

  async benchmarkEndpoint(name, method, url, data = null, iterations = 100) {
    console.log(`🔍 Benchmarking ${name}...`);
    
    const times = [];
    const errors = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        const config = {
          method,
          url: `${this.baseUrl}${url}`,
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        };
        
        if (data) {
          config.data = data;
        }
        
        await axios(config);
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        errors.push(error.message);
        times.push(null);
      }
    }
    
    const validTimes = times.filter(t => t !== null);
    const benchmark = {
      name,
      method,
      url,
      iterations,
      avgTime: validTimes.reduce((a, b) => a + b, 0) / validTimes.length,
      minTime: Math.min(...validTimes),
      maxTime: Math.max(...validTimes),
      p95Time: this.percentile(validTimes, 95),
      p99Time: this.percentile(validTimes, 99),
      successRate: (validTimes.length / iterations) * 100,
      errorCount: errors.length,
      timestamp: new Date().toISOString()
    };
    
    this.benchmarks.push(benchmark);
    return benchmark;
  }

  percentile(arr, p) {
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  async runCoreBenchmarks() {
    console.log('🎯 Running Core Performance Benchmarks...\n');
    
    // Dashboard benchmarks
    await this.benchmarkEndpoint('Dashboard Stats', 'GET', '/api/dashboard/stats');
    await this.benchmarkEndpoint('Property List', 'GET', '/api/properties?page=1&limit=50');
    await this.benchmarkEndpoint('Tenant List', 'GET', '/api/tenants?page=1&limit=50');
    
    // CRUD operations
    await this.benchmarkEndpoint('Create Property', 'POST', '/api/properties', {
      name: 'Benchmark Property',
      location: 'Test Location',
      type: 'apartment',
      status: 'available'
    });
    
    await this.benchmarkEndpoint('Update Property', 'PUT', '/api/properties/test-id', {
      name: 'Updated Property',
      status: 'occupied'
    });
    
    // Payment processing
    await this.benchmarkEndpoint('STK Push', 'POST', '/api/payments/mpesa/stk-push', {
      phoneNumber: '254700000000',
      amount: 1000,
      leaseId: 'test-lease-id'
    });
    
    // Search operations
    await this.benchmarkEndpoint('Property Search', 'GET', '/api/properties/search?q=apartment&location=nairobi');
    await this.benchmarkEndpoint('Tenant Search', 'GET', '/api/tenants/search?q=john');
    
    // Report generation
    await this.benchmarkEndpoint('Financial Report', 'GET', '/api/reports/financial?period=monthly');
    await this.benchmarkEndpoint('Property Report', 'GET', '/api/reports/properties');
  }

  compareWithBaselines() {
    const comparisons = [];
    
    for (const benchmark of this.benchmarks) {
      const baseline = this.baselines[benchmark.name];
      
      if (baseline) {
        const comparison = {
          name: benchmark.name,
          current: benchmark.avgTime,
          baseline: baseline.avgTime,
          change: ((benchmark.avgTime - baseline.avgTime) / baseline.avgTime) * 100,
          regression: benchmark.avgTime > baseline.avgTime * 1.2, // 20% threshold
          improvement: benchmark.avgTime < baseline.avgTime * 0.8 // 20% improvement
        };
        
        comparisons.push(comparison);
      } else {
        // First time running, set as baseline
        this.baselines[benchmark.name] = benchmark;
      }
    }
    
    return comparisons;
  }

  async generateBenchmarkReport() {
    const comparisons = this.compareWithBaselines();
    
    const report = {
      testSuite: 'Performance Benchmarks',
      timestamp: new Date().toISOString(),
      benchmarks: this.benchmarks,
      comparisons,
      summary: {
        totalBenchmarks: this.benchmarks.length,
        avgResponseTime: this.benchmarks.reduce((sum, b) => sum + b.avgTime, 0) / this.benchmarks.length,
        regressions: comparisons.filter(c => c.regression).length,
        improvements: comparisons.filter(c => c.improvement).length,
        successRate: this.benchmarks.reduce((sum, b) => sum + b.successRate, 0) / this.benchmarks.length
      }
    };
    
    const reportPath = path.join(process.cwd(), 'src/tests/performance/reports', `benchmark-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Benchmark report saved to: ${reportPath}`);
    return report;
  }

  async detectRegressions() {
    const comparisons = this.compareWithBaselines();
    const regressions = comparisons.filter(c => c.regression);
    
    if (regressions.length > 0) {
      console.log('\n⚠️  Performance Regressions Detected:');
      for (const regression of regressions) {
        console.log(`  - ${regression.name}: ${regression.change.toFixed(2)}% slower`);
        console.log(`    Current: ${regression.current.toFixed(2)}ms, Baseline: ${regression.baseline.toFixed(2)}ms`);
      }
      return regressions;
    } else {
      console.log('\n✅ No performance regressions detected');
      return [];
    }
  }

  async runAutomatedSuite() {
    console.log('🚀 Starting Automated Performance Benchmark Suite...\n');
    
    try {
      await this.loadBaselines();
      await this.runCoreBenchmarks();
      
      const report = await this.generateBenchmarkReport();
      const regressions = await this.detectRegressions();
      
      await this.saveBaselines();
      
      console.log('\n📈 Benchmark Summary:');
      console.log(`  Total Benchmarks: ${report.summary.totalBenchmarks}`);
      console.log(`  Average Response Time: ${report.summary.avgResponseTime.toFixed(2)}ms`);
      console.log(`  Success Rate: ${report.summary.successRate.toFixed(2)}%`);
      console.log(`  Regressions: ${report.summary.regressions}`);
      console.log(`  Improvements: ${report.summary.improvements}`);
      
      if (regressions.length > 0) {
        process.exit(1); // Exit with error code for CI/CD
      }
      
      return report;
    } catch (error) {
      console.error('❌ Benchmark suite failed:', error);
      throw error;
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runAutomatedSuite().catch(console.error);
}

export default PerformanceBenchmark;