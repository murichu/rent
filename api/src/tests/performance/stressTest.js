import autocannon from 'autocannon';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

class StressTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = [];
    this.systemMetrics = [];
    this.breakingPoints = {};
  }

  async testSystemLimits() {
    console.log('🔥 Testing system beyond normal capacity limits...');
    
    const phases = [
      { connections: 100, duration: 30, name: 'Baseline Load' },
      { connections: 200, duration: 30, name: 'Double Load' },
      { connections: 500, duration: 30, name: 'High Stress' },
      { connections: 1000, duration: 30, name: 'Extreme Stress' },
      { connections: 2000, duration: 30, name: 'Breaking Point' }
    ];
    
    for (const phase of phases) {
      console.log(`🚀 Phase: ${phase.name} (${phase.connections} connections)`);
      
      const startTime = performance.now();
      
      try {
        const result = await autocannon({
          url: `${this.baseUrl}/api/dashboard/stats`,
          connections: phase.connections,
          duration: phase.duration,
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        });
        
        const endTime = performance.now();
        
        const phaseResult = {
          phase: phase.name,
          connections: phase.connections,
          duration: phase.duration,
          avgLatency: result.latency.average,
          maxLatency: result.latency.max,
          p99Latency: result.latency.p99,
          throughput: result.throughput.average,
          totalRequests: result.requests.total,
          errors: result.errors,
          errorRate: (result.errors / result.requests.total) * 100,
          testDuration: endTime - startTime,
          timestamp: new Date().toISOString()
        };
        
        this.results.push(phaseResult);
        
        // Check if this is a breaking point
        if (phaseResult.errorRate > 10 || phaseResult.avgLatency > 10000) {
          this.breakingPoints.errorThreshold = {
            connections: phase.connections,
            errorRate: phaseResult.errorRate,
            avgLatency: phaseResult.avgLatency
          };
          console.log(`⚠️  Breaking point detected at ${phase.connections} connections`);
        }
        
        // Wait between phases to let system recover
        await this.sleep(10000);
        
      } catch (error) {
        console.error(`❌ Phase ${phase.name} failed:`, error.message);
        this.breakingPoints.systemFailure = {
          connections: phase.connections,
          error: error.message
        };
        break;
      }
    }
  }

  async testGracefulDegradation() {
    console.log('🔄 Testing graceful degradation under stress...');
    
    const endpoints = [
      { path: '/api/dashboard/stats', critical: true },
      { path: '/api/properties', critical: true },
      { path: '/api/tenants', critical: false },
      { path: '/api/reports/financial', critical: false },
      { path: '/api/health', critical: true }
    ];
    
    // Apply extreme load
    const stressTest = autocannon({
      url: `${this.baseUrl}/api/dashboard/stats`,
      connections: 1000,
      duration: 60,
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    // Test endpoint availability during stress
    const degradationResults = [];
    
    for (let i = 0; i < 12; i++) { // Test every 5 seconds for 1 minute
      await this.sleep(5000);
      
      for (const endpoint of endpoints) {
        const start = performance.now();
        
        try {
          await axios.get(`${this.baseUrl}${endpoint.path}`, {
            headers: { 'Authorization': 'Bearer test-token' },
            timeout: 5000
          });
          
          const responseTime = performance.now() - start;
          
          degradationResults.push({
            endpoint: endpoint.path,
            critical: endpoint.critical,
            responseTime,
            available: true,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          degradationResults.push({
            endpoint: endpoint.path,
            critical: endpoint.critical,
            responseTime: null,
            available: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    await stressTest;
    
    return degradationResults;
  }

  async testRecoveryAfterStress() {
    console.log('🔄 Testing system recovery after stress conditions...');
    
    // Apply stress
    console.log('Applying stress load...');
    await autocannon({
      url: `${this.baseUrl}/api/dashboard/stats`,
      connections: 1000,
      duration: 30,
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    // Monitor recovery
    const recoveryMetrics = [];
    const recoveryPeriod = 120; // 2 minutes
    const interval = 10; // 10 seconds
    
    console.log('Monitoring recovery...');
    
    for (let i = 0; i < recoveryPeriod / interval; i++) {
      await this.sleep(interval * 1000);
      
      const start = performance.now();
      
      try {
        await axios.get(`${this.baseUrl}/api/health`, {
          headers: { 'Authorization': 'Bearer test-token' },
          timeout: 5000
        });
        
        const responseTime = performance.now() - start;
        
        recoveryMetrics.push({
          timeAfterStress: (i + 1) * interval,
          responseTime,
          recovered: responseTime < 1000, // Consider recovered if < 1s
          timestamp: new Date().toISOString()
        });
        
        console.log(`Recovery check ${i + 1}: ${responseTime.toFixed(2)}ms`);
        
      } catch (error) {
        recoveryMetrics.push({
          timeAfterStress: (i + 1) * interval,
          responseTime: null,
          recovered: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return recoveryMetrics;
  }

  async testMemoryStress() {
    console.log('💾 Testing memory stress conditions...');
    
    // Create memory-intensive operations
    const memoryStressResults = [];
    
    const operations = [
      {
        name: 'Large Property Export',
        endpoint: '/api/properties/export',
        method: 'POST',
        data: { format: 'csv', includeAll: true }
      },
      {
        name: 'Bulk Property Import',
        endpoint: '/api/properties/bulk-import',
        method: 'POST',
        data: { properties: this.generateLargeDataset(1000) }
      },
      {
        name: 'Complex Financial Report',
        endpoint: '/api/reports/financial',
        method: 'GET',
        params: '?period=yearly&detailed=true'
      }
    ];
    
    for (const operation of operations) {
      console.log(`Testing ${operation.name}...`);
      
      const start = performance.now();
      
      try {
        const config = {
          method: operation.method,
          url: `${this.baseUrl}${operation.endpoint}${operation.params || ''}`,
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        };
        
        if (operation.data) {
          config.data = operation.data;
        }
        
        const response = await axios(config);
        const responseTime = performance.now() - start;
        
        memoryStressResults.push({
          operation: operation.name,
          responseTime,
          success: true,
          memoryImpact: this.estimateMemoryImpact(operation.data),
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        const responseTime = performance.now() - start;
        
        memoryStressResults.push({
          operation: operation.name,
          responseTime,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      // Wait between operations
      await this.sleep(5000);
    }
    
    return memoryStressResults;
  }

  generateLargeDataset(count) {
    const properties = [];
    for (let i = 0; i < count; i++) {
      properties.push({
        name: `Stress Test Property ${i}`,
        location: `Location ${i}`,
        type: 'apartment',
        status: 'available',
        description: 'A'.repeat(1000), // Large description
        amenities: Array(50).fill(`Amenity ${i}`),
        metadata: {
          createdAt: new Date().toISOString(),
          tags: Array(20).fill(`tag-${i}`),
          notes: 'B'.repeat(500)
        }
      });
    }
    return properties;
  }

  estimateMemoryImpact(data) {
    if (!data) return 0;
    return JSON.stringify(data).length; // Rough estimate in bytes
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateStressReport() {
    const degradationResults = await this.testGracefulDegradation();
    const recoveryResults = await this.testRecoveryAfterStress();
    const memoryResults = await this.testMemoryStress();
    
    const report = {
      testSuite: 'Stress Testing',
      timestamp: new Date().toISOString(),
      systemLimits: this.results,
      breakingPoints: this.breakingPoints,
      gracefulDegradation: {
        results: degradationResults,
        criticalEndpointsAvailable: degradationResults
          .filter(r => r.critical && r.available).length,
        totalCriticalEndpoints: degradationResults
          .filter(r => r.critical).length
      },
      recovery: {
        results: recoveryResults,
        recoveryTime: this.calculateRecoveryTime(recoveryResults),
        fullyRecovered: recoveryResults[recoveryResults.length - 1]?.recovered || false
      },
      memoryStress: {
        results: memoryResults,
        successfulOperations: memoryResults.filter(r => r.success).length,
        totalOperations: memoryResults.length
      },
      summary: this.generateStressSummary(degradationResults, recoveryResults, memoryResults)
    };
    
    const reportPath = path.join(process.cwd(), 'src/tests/performance/reports', `stress-test-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Stress test report saved to: ${reportPath}`);
    return report;
  }

  calculateRecoveryTime(recoveryResults) {
    const firstRecovered = recoveryResults.find(r => r.recovered);
    return firstRecovered ? firstRecovered.timeAfterStress : null;
  }

  generateStressSummary(degradationResults, recoveryResults, memoryResults) {
    return {
      maxConnectionsHandled: Math.max(...this.results.map(r => r.connections)),
      systemBreakingPoint: this.breakingPoints.errorThreshold?.connections || 'Not reached',
      gracefulDegradationScore: (degradationResults.filter(r => r.available).length / degradationResults.length) * 100,
      recoveryTime: this.calculateRecoveryTime(recoveryResults),
      memoryStressHandled: memoryResults.filter(r => r.success).length > 0,
      overallStressResilience: this.calculateOverallResilience(degradationResults, recoveryResults, memoryResults)
    };
  }

  calculateOverallResilience(degradationResults, recoveryResults, memoryResults) {
    const degradationScore = (degradationResults.filter(r => r.available).length / degradationResults.length) * 100;
    const recoveryScore = recoveryResults[recoveryResults.length - 1]?.recovered ? 100 : 0;
    const memoryScore = (memoryResults.filter(r => r.success).length / memoryResults.length) * 100;
    
    return (degradationScore + recoveryScore + memoryScore) / 3;
  }

  async runFullStressTest() {
    console.log('🔥 Starting Comprehensive Stress Testing Suite...\n');
    
    try {
      await this.testSystemLimits();
      const report = await this.generateStressReport();
      
      console.log('\n🔥 Stress Testing Complete!');
      console.log(`🏗️  Max Connections Handled: ${report.summary.maxConnectionsHandled}`);
      console.log(`💥 Breaking Point: ${report.summary.systemBreakingPoint} connections`);
      console.log(`🔄 Graceful Degradation Score: ${report.summary.gracefulDegradationScore.toFixed(2)}%`);
      console.log(`⏱️  Recovery Time: ${report.summary.recoveryTime || 'Not recovered'} seconds`);
      console.log(`🎯 Overall Resilience Score: ${report.summary.overallStressResilience.toFixed(2)}%`);
      
      return report;
    } catch (error) {
      console.error('❌ Stress testing failed:', error);
      throw error;
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const stressTester = new StressTester();
  stressTester.runFullStressTest().catch(console.error);
}

export default StressTester;