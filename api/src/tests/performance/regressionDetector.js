import fs from 'fs/promises';
import path from 'path';

class RegressionDetector {
  constructor() {
    this.thresholds = {
      responseTime: 20, // 20% increase is considered regression
      errorRate: 5, // 5% increase in error rate
      throughput: 15, // 15% decrease in throughput
      memoryUsage: 25 // 25% increase in memory usage
    };
  }

  async loadHistoricalData(testType = 'benchmark') {
    try {
      const reportsDir = path.join(process.cwd(), 'src/tests/performance/reports');
      const files = await fs.readdir(reportsDir);
      const reportFiles = files.filter(f => f.startsWith(testType) && f.endsWith('.json'));
      
      const reports = [];
      for (const file of reportFiles.slice(-10)) { // Last 10 reports
        const data = await fs.readFile(path.join(reportsDir, file), 'utf8');
        reports.push(JSON.parse(data));
      }
      
      return reports.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      console.log('No historical data found');
      return [];
    }
  }

  analyzePerformanceTrend(reports, metric) {
    if (reports.length < 2) return null;
    
    const values = reports.map(r => this.extractMetricValue(r, metric));
    const recent = values.slice(-3); // Last 3 runs
    const baseline = values.slice(0, Math.max(1, values.length - 3)); // Earlier runs
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
    
    const changePercent = ((recentAvg - baselineAvg) / baselineAvg) * 100;
    
    return {
      metric,
      recentAvg,
      baselineAvg,
      changePercent,
      trend: changePercent > 0 ? 'increasing' : 'decreasing',
      isRegression: this.isRegression(metric, changePercent)
    };
  }

  extractMetricValue(report, metric) {
    switch (metric) {
      case 'responseTime':
        return report.summary?.avgResponseTime || report.summary?.averageLatency || 0;
      case 'errorRate':
        return report.summary?.errorRate || 0;
      case 'throughput':
        return report.summary?.avgThroughput || report.summary?.totalRequests || 0;
      case 'memoryUsage':
        return report.summary?.memoryUsage || 0;
      default:
        return 0;
    }
  }

  isRegression(metric, changePercent) {
    const threshold = this.thresholds[metric];
    
    switch (metric) {
      case 'responseTime':
      case 'errorRate':
      case 'memoryUsage':
        return changePercent > threshold;
      case 'throughput':
        return changePercent < -threshold; // Negative change is bad for throughput
      default:
        return false;
    }
  }

  async detectRegressions(testType = 'benchmark') {
    console.log(`🔍 Analyzing performance trends for ${testType} tests...`);
    
    const reports = await this.loadHistoricalData(testType);
    
    if (reports.length < 2) {
      console.log('Insufficient historical data for regression analysis');
      return [];
    }
    
    const metrics = ['responseTime', 'errorRate', 'throughput', 'memoryUsage'];
    const regressions = [];
    
    for (const metric of metrics) {
      const trend = this.analyzePerformanceTrend(reports, metric);
      
      if (trend && trend.isRegression) {
        regressions.push(trend);
        console.log(`⚠️  Regression detected in ${metric}:`);
        console.log(`   Change: ${trend.changePercent.toFixed(2)}%`);
        console.log(`   Recent: ${trend.recentAvg.toFixed(2)}, Baseline: ${trend.baselineAvg.toFixed(2)}`);
      }
    }
    
    if (regressions.length === 0) {
      console.log('✅ No performance regressions detected');
    }
    
    return regressions;
  }

  async generateRegressionReport(testType = 'benchmark') {
    const reports = await this.loadHistoricalData(testType);
    const regressions = await this.detectRegressions(testType);
    
    const report = {
      testType,
      timestamp: new Date().toISOString(),
      historicalDataPoints: reports.length,
      regressions,
      summary: {
        totalRegressions: regressions.length,
        criticalRegressions: regressions.filter(r => Math.abs(r.changePercent) > 50).length,
        affectedMetrics: regressions.map(r => r.metric)
      }
    };
    
    const reportPath = path.join(
      process.cwd(), 
      'src/tests/performance/reports', 
      `regression-analysis-${Date.now()}.json`
    );
    
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Regression analysis saved to: ${reportPath}`);
    return report;
  }

  async runContinuousMonitoring() {
    console.log('🔄 Starting continuous performance monitoring...');
    
    const testTypes = ['benchmark', 'load-test', 'stress-test'];
    const allRegressions = [];
    
    for (const testType of testTypes) {
      const regressions = await this.detectRegressions(testType);
      allRegressions.push(...regressions);
    }
    
    if (allRegressions.length > 0) {
      console.log(`\n🚨 Total regressions found: ${allRegressions.length}`);
      
      // Group by severity
      const critical = allRegressions.filter(r => Math.abs(r.changePercent) > 50);
      const moderate = allRegressions.filter(r => Math.abs(r.changePercent) > 25 && Math.abs(r.changePercent) <= 50);
      const minor = allRegressions.filter(r => Math.abs(r.changePercent) <= 25);
      
      if (critical.length > 0) {
        console.log(`🔴 Critical regressions: ${critical.length}`);
      }
      if (moderate.length > 0) {
        console.log(`🟡 Moderate regressions: ${moderate.length}`);
      }
      if (minor.length > 0) {
        console.log(`🟢 Minor regressions: ${minor.length}`);
      }
      
      return allRegressions;
    }
    
    console.log('✅ No regressions detected across all test types');
    return [];
  }
}

export default RegressionDetector;