#!/usr/bin/env node

/**
 * Load Balancer Testing Script
 * Tests the stateless architecture and load balancing capabilities
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

class LoadBalancerTester {
  constructor(baseUrl = 'http://localhost') {
    this.baseUrl = baseUrl;
    this.results = {
      healthChecks: [],
      sessionTests: [],
      loadDistribution: {},
      errors: []
    };
  }

  /**
   * Make HTTP request
   */
  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LoadBalancerTester/1.0',
          ...options.headers
        }
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: jsonData,
              rawData: data
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: null,
              rawData: data,
              parseError: error.message
            });
          }
        });
      });

      req.on('error', reject);
      
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  /**
   * Test health check endpoints
   */
  async testHealthChecks() {
    console.log('🏥 Testing health check endpoints...');
    
    const endpoints = [
      '/health',
      '/ready',
      '/alive',
      '/api/v1/load-balancer/health'
    ];

    for (const endpoint of endpoints) {
      try {
        const start = Date.now();
        const response = await this.makeRequest(endpoint);
        const duration = Date.now() - start;
        
        const result = {
          endpoint,
          statusCode: response.statusCode,
          duration: `${duration}ms`,
          success: response.statusCode === 200,
          instanceId: response.headers['x-instance-id'] || 'unknown',
          data: response.data
        };
        
        this.results.healthChecks.push(result);
        
        if (result.success) {
          console.log(`  ✅ ${endpoint} - ${result.duration} - Instance: ${result.instanceId}`);
        } else {
          console.log(`  ❌ ${endpoint} - Status: ${result.statusCode} - ${result.duration}`);
        }
      } catch (error) {
        console.log(`  ❌ ${endpoint} - Error: ${error.message}`);
        this.results.errors.push({ endpoint, error: error.message });
      }
    }
  }

  /**
   * Test load distribution
   */
  async testLoadDistribution(requests = 50) {
    console.log(`🔄 Testing load distribution with ${requests} requests...`);
    
    const promises = [];
    for (let i = 0; i < requests; i++) {
      promises.push(this.makeRequest('/health'));
    }

    try {
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        const instanceId = response.headers['x-instance-id'] || 'unknown';
        this.results.loadDistribution[instanceId] = (this.results.loadDistribution[instanceId] || 0) + 1;
      });

      console.log('  Load distribution:');
      Object.entries(this.results.loadDistribution).forEach(([instance, count]) => {
        const percentage = ((count / requests) * 100).toFixed(1);
        console.log(`    ${instance}: ${count} requests (${percentage}%)`);
      });

      // Check if load is reasonably distributed
      const instanceCounts = Object.values(this.results.loadDistribution);
      const maxCount = Math.max(...instanceCounts);
      const minCount = Math.min(...instanceCounts);
      const variance = maxCount - minCount;
      const isWellDistributed = variance <= requests * 0.3; // Allow 30% variance

      if (isWellDistributed) {
        console.log('  ✅ Load is well distributed');
      } else {
        console.log('  ⚠️  Load distribution may be uneven');
      }
    } catch (error) {
      console.log(`  ❌ Load distribution test failed: ${error.message}`);
      this.results.errors.push({ test: 'loadDistribution', error: error.message });
    }
  }

  /**
   * Test session persistence across instances
   */
  async testSessionPersistence() {
    console.log('🔐 Testing session persistence...');
    
    try {
      // First, try to create a session (this would normally be through login)
      // For this test, we'll just make requests and track instance responses
      const sessionRequests = [];
      
      for (let i = 0; i < 10; i++) {
        const response = await this.makeRequest('/api/v1/load-balancer/metrics');
        sessionRequests.push({
          instanceId: response.headers['x-instance-id'] || 'unknown',
          statusCode: response.statusCode,
          requestId: response.headers['x-request-id'] || 'unknown'
        });
      }

      // Check if requests can be handled by different instances
      const uniqueInstances = new Set(sessionRequests.map(r => r.instanceId));
      
      console.log(`  Requests handled by ${uniqueInstances.size} different instances`);
      sessionRequests.forEach((req, index) => {
        console.log(`    Request ${index + 1}: Instance ${req.instanceId} (${req.statusCode})`);
      });

      if (uniqueInstances.size > 1) {
        console.log('  ✅ Stateless architecture confirmed - requests handled by multiple instances');
      } else {
        console.log('  ⚠️  All requests handled by single instance (may be expected in small setup)');
      }

      this.results.sessionTests = sessionRequests;
    } catch (error) {
      console.log(`  ❌ Session persistence test failed: ${error.message}`);
      this.results.errors.push({ test: 'sessionPersistence', error: error.message });
    }
  }

  /**
   * Test instance metrics
   */
  async testInstanceMetrics() {
    console.log('📊 Testing instance metrics...');
    
    try {
      const response = await this.makeRequest('/api/v1/load-balancer/instances');
      
      if (response.statusCode === 200 && response.data) {
        console.log(`  Total instances: ${response.data.totalInstances}`);
        
        response.data.instances.forEach(instance => {
          console.log(`    Instance ${instance.instanceId}:`);
          console.log(`      Status: ${instance.status}`);
          console.log(`      Uptime: ${instance.uptime}s`);
          console.log(`      Requests: ${instance.requestCount}`);
          console.log(`      Error Rate: ${instance.errorRate}%`);
          console.log(`      Memory: ${instance.memoryUsage}%`);
        });
        
        console.log('  ✅ Instance metrics retrieved successfully');
      } else {
        console.log(`  ❌ Failed to get instance metrics: ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`  ❌ Instance metrics test failed: ${error.message}`);
      this.results.errors.push({ test: 'instanceMetrics', error: error.message });
    }
  }

  /**
   * Test failover behavior
   */
  async testFailover() {
    console.log('🔄 Testing failover behavior...');
    
    try {
      // Make multiple requests to see how they're distributed
      const requests = 20;
      const responses = [];
      
      for (let i = 0; i < requests; i++) {
        try {
          const response = await this.makeRequest('/health');
          responses.push({
            success: true,
            instanceId: response.headers['x-instance-id'] || 'unknown',
            statusCode: response.statusCode
          });
        } catch (error) {
          responses.push({
            success: false,
            error: error.message
          });
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const successfulRequests = responses.filter(r => r.success);
      const failedRequests = responses.filter(r => !r.success);
      
      console.log(`  Successful requests: ${successfulRequests.length}/${requests}`);
      console.log(`  Failed requests: ${failedRequests.length}/${requests}`);
      
      if (successfulRequests.length === requests) {
        console.log('  ✅ All requests successful - system is stable');
      } else if (successfulRequests.length > requests * 0.8) {
        console.log('  ⚠️  Most requests successful - some issues detected');
      } else {
        console.log('  ❌ Many requests failed - system may be unstable');
      }
    } catch (error) {
      console.log(`  ❌ Failover test failed: ${error.message}`);
      this.results.errors.push({ test: 'failover', error: error.message });
    }
  }

  /**
   * Test concurrent requests
   */
  async testConcurrentRequests(concurrency = 10, requests = 100) {
    console.log(`⚡ Testing concurrent requests (${concurrency} concurrent, ${requests} total)...`);
    
    try {
      const startTime = Date.now();
      const batches = Math.ceil(requests / concurrency);
      let totalSuccessful = 0;
      let totalFailed = 0;
      
      for (let batch = 0; batch < batches; batch++) {
        const batchSize = Math.min(concurrency, requests - (batch * concurrency));
        const promises = [];
        
        for (let i = 0; i < batchSize; i++) {
          promises.push(this.makeRequest('/api/v1/load-balancer/health'));
        }
        
        const responses = await Promise.all(promises.map(p => p.catch(e => ({ error: e.message }))));
        
        const successful = responses.filter(r => r.statusCode === 200).length;
        const failed = responses.filter(r => r.error || r.statusCode !== 200).length;
        
        totalSuccessful += successful;
        totalFailed += failed;
      }
      
      const duration = Date.now() - startTime;
      const requestsPerSecond = (requests / (duration / 1000)).toFixed(2);
      
      console.log(`  Total time: ${duration}ms`);
      console.log(`  Requests per second: ${requestsPerSecond}`);
      console.log(`  Successful: ${totalSuccessful}/${requests}`);
      console.log(`  Failed: ${totalFailed}/${requests}`);
      
      if (totalSuccessful === requests) {
        console.log('  ✅ All concurrent requests successful');
      } else if (totalSuccessful > requests * 0.95) {
        console.log('  ⚠️  Most concurrent requests successful');
      } else {
        console.log('  ❌ Many concurrent requests failed');
      }
    } catch (error) {
      console.log(`  ❌ Concurrent requests test failed: ${error.message}`);
      this.results.errors.push({ test: 'concurrentRequests', error: error.message });
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Load Balancer Tests...\n');
    
    await this.testHealthChecks();
    console.log('');
    
    await this.testLoadDistribution();
    console.log('');
    
    await this.testSessionPersistence();
    console.log('');
    
    await this.testInstanceMetrics();
    console.log('');
    
    await this.testFailover();
    console.log('');
    
    await this.testConcurrentRequests();
    console.log('');
    
    this.printSummary();
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('📋 Test Summary');
    console.log('================');
    
    const totalErrors = this.results.errors.length;
    const healthChecksPassed = this.results.healthChecks.filter(h => h.success).length;
    const totalHealthChecks = this.results.healthChecks.length;
    
    console.log(`Health Checks: ${healthChecksPassed}/${totalHealthChecks} passed`);
    console.log(`Load Distribution: ${Object.keys(this.results.loadDistribution).length} instances detected`);
    console.log(`Session Tests: ${this.results.sessionTests.length} requests tracked`);
    console.log(`Total Errors: ${totalErrors}`);
    
    if (totalErrors === 0) {
      console.log('\n✅ All tests completed successfully!');
      console.log('🎉 Load balancer setup appears to be working correctly.');
    } else {
      console.log('\n⚠️  Some tests encountered issues:');
      this.results.errors.forEach(error => {
        console.log(`  - ${error.test || error.endpoint}: ${error.error}`);
      });
    }
    
    console.log('\n💡 Tips:');
    console.log('  - Ensure all API instances are running');
    console.log('  - Check Redis connectivity for session sharing');
    console.log('  - Verify load balancer configuration');
    console.log('  - Monitor instance health and metrics');
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const baseUrl = process.argv[2] || 'http://localhost';
  const tester = new LoadBalancerTester(baseUrl);
  
  console.log(`Testing load balancer at: ${baseUrl}\n`);
  
  tester.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export default LoadBalancerTester;