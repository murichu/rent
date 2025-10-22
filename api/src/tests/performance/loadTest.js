import autocannon from 'autocannon';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';

class LoadTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async testDashboardPerformance() {
    console.log('🚀 Testing Dashboard Performance with 100 concurrent users...');
    
    const result = await autocannon({
      url: `${this.baseUrl}/api/dashboard/stats`,
      connections: 100,
      duration: 30, // 30 seconds
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });

    this.results.push({
      test: 'Dashboard Performance',
      ...this.formatResults(result)
    });

    return result;
  }

  async testPaymentProcessing() {
    console.log('💳 Testing Payment Processing under load...');
    
    const result = await autocannon({
      url: `${this.baseUrl}/api/payments/mpesa/stk-push`,
      method: 'POST',
      connections: 50,
      duration: 20,
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: '254700000000',
        amount: 1000,
        leaseId: 'test-lease-id'
      })
    });

    this.results.push({
      test: 'Payment Processing',
      ...this.formatResults(result)
    });

    return result;
  }

  async testBulkOperations() {
    console.log('📊 Testing Bulk Operations with large datasets...');
    
    const result = await autocannon({
      url: `${this.baseUrl}/api/properties/bulk-import`,
      method: 'POST',
      connections: 20,
      duration: 30,
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: this.generateBulkData(100)
      })
    });

    this.results.push({
      test: 'Bulk Operations',
      ...this.formatResults(result)
    });

    return result;
  }

  async testApiEndpoints() {
    console.log('🔗 Testing various API endpoints under load...');
    
    const endpoints = [
      { path: '/api/properties', method: 'GET' },
      { path: '/api/tenants', method: 'GET' },
      { path: '/api/invoices', method: 'GET' },
      { path: '/api/leases', method: 'GET' },
      { path: '/api/units', method: 'GET' }
    ];

    for (const endpoint of endpoints) {
      const result = await autocannon({
        url: `${this.baseUrl}${endpoint.path}`,
        method: endpoint.method,
        connections: 50,
        duration: 15,
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });

      this.results.push({
        test: `${endpoint.method} ${endpoint.path}`,
        ...this.formatResults(result)
      });
    }
  }

  formatResults(result) {
    return {
      avgLatency: result.latency.average,
      maxLatency: result.latency.max,
      minLatency: result.latency.min,
      p95Latency: result.latency.p95,
      p99Latency: result.latency.p99,
      avgThroughput: result.throughput.average,
      totalRequests: result.requests.total,
      totalErrors: result.errors,
      duration: result.duration,
      timestamp: new Date().toISOString()
    };
  }

  generateBulkData(count) {
    const properties = [];
    for (let i = 0; i < count; i++) {
      properties.push({
        name: `Test Property ${i}`,
        location: `Test Location ${i}`,
        type: 'apartment',
        status: 'available'
      });
    }
    return properties;
  }

  async generateReport() {
    const report = {
      testSuite: 'Load Testing',
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: this.generateSummary()
    };

    const reportPath = path.join(process.cwd(), 'src/tests/performance/reports', `load-test-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Load test report saved to: ${reportPath}`);
    return report;
  }

  generateSummary() {
    const avgLatency = this.results.reduce((sum, r) => sum + r.avgLatency, 0) / this.results.length;
    const totalRequests = this.results.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalErrors = this.results.reduce((sum, r) => sum + r.totalErrors, 0);
    
    return {
      averageLatency: avgLatency,
      totalRequests,
      totalErrors,
      errorRate: (totalErrors / totalRequests) * 100,
      testsRun: this.results.length
    };
  }

  async runAllTests() {
    console.log('🎯 Starting Load Testing Suite...\n');
    
    try {
      await this.testDashboardPerformance();
      await this.testPaymentProcessing();
      await this.testBulkOperations();
      await this.testApiEndpoints();
      
      const report = await this.generateReport();
      
      console.log('\n✅ Load Testing Complete!');
      console.log(`📈 Average Latency: ${report.summary.averageLatency.toFixed(2)}ms`);
      console.log(`📊 Total Requests: ${report.summary.totalRequests}`);
      console.log(`❌ Error Rate: ${report.summary.errorRate.toFixed(2)}%`);
      
      return report;
    } catch (error) {
      console.error('❌ Load testing failed:', error);
      throw error;
    }
  }
}

export default LoadTester;