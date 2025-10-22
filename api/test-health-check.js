#!/usr/bin/env node

/**
 * Health Check Test Script
 * Tests the health check endpoints to ensure they're working correctly
 */

import { healthCheck } from './src/services/healthCheck.js';
import logger from './src/utils/logger.js';

async function testHealthCheck() {
  console.log('🏥 Testing Health Check System...\n');
  
  try {
    // Test basic liveness check
    console.log('1. Testing liveness check...');
    const liveness = healthCheck.isAlive();
    console.log('✅ Liveness check:', liveness.alive ? 'PASSED' : 'FAILED');
    console.log(`   Uptime: ${liveness.uptime.toFixed(2)}s, PID: ${liveness.pid}\n`);
    
    // Test readiness check
    console.log('2. Testing readiness check...');
    const readiness = await healthCheck.isReady();
    console.log('✅ Readiness check:', readiness.ready ? 'PASSED' : 'FAILED');
    if (!readiness.ready) {
      console.log('   Issues:', readiness.issues);
    }
    console.log();
    
    // Test comprehensive health check
    console.log('3. Testing comprehensive health check...');
    const health = await healthCheck.performHealthCheck();
    console.log(`✅ Health check completed in ${health.responseTime}ms`);
    console.log(`   Overall status: ${health.status.toUpperCase()}`);
    console.log(`   Summary: ${health.summary.healthy} healthy, ${health.summary.warning} warnings, ${health.summary.critical} critical\n`);
    
    // Display individual service statuses
    console.log('4. Individual service statuses:');
    Object.entries(health.checks).forEach(([name, check]) => {
      const statusIcon = check.status === 'healthy' ? '✅' : 
                        check.status === 'warning' ? '⚠️' : '❌';
      console.log(`   ${statusIcon} ${name}: ${check.status.toUpperCase()}`);
      
      if (check.responseTime) {
        console.log(`      Response time: ${check.responseTime}`);
      }
      
      if (check.error) {
        console.log(`      Error: ${check.error}`);
      }
      
      if (check.message) {
        console.log(`      Message: ${check.message}`);
      }
    });
    console.log();
    
    // Test health summary
    console.log('5. Testing health summary...');
    const summary = await healthCheck.getHealthSummary();
    console.log(`✅ Health summary: ${summary.status.toUpperCase()}`);
    
    if (summary.criticalIssues.length > 0) {
      console.log('   Critical issues:');
      summary.criticalIssues.forEach(issue => {
        console.log(`   ❌ ${issue.service}: ${issue.error}`);
      });
    }
    
    if (summary.warnings.length > 0) {
      console.log('   Warnings:');
      summary.warnings.forEach(warning => {
        console.log(`   ⚠️ ${warning.service}: ${warning.message}`);
      });
    }
    console.log();
    
    // Test request handling capability
    console.log('6. Testing request handling capability...');
    const canHandle = await healthCheck.canHandleRequests();
    console.log(`✅ Can handle requests: ${canHandle.canHandle ? 'YES' : 'NO'}`);
    
    if (!canHandle.canHandle) {
      console.log('   Reasons:');
      canHandle.reasons.forEach(reason => {
        console.log(`   - ${reason}`);
      });
    }
    console.log();
    
    // Test service-specific health check
    console.log('7. Testing service-specific health checks...');
    const services = ['database', 'cache', 'memory', 'cpu'];
    
    for (const service of services) {
      const serviceHealth = await healthCheck.getServiceHealth(service);
      const statusIcon = serviceHealth.status === 'healthy' ? '✅' : 
                        serviceHealth.status === 'warning' ? '⚠️' : '❌';
      console.log(`   ${statusIcon} ${service}: ${serviceHealth.status.toUpperCase()}`);
    }
    console.log();
    
    console.log('🎉 Health check system test completed successfully!');
    
    // Return overall status
    return {
      success: true,
      overallStatus: health.status,
      canHandleRequests: canHandle.canHandle,
      criticalIssues: summary.criticalIssues.length,
      warnings: summary.warnings.length
    };
    
  } catch (error) {
    console.error('❌ Health check test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testHealthCheck()
    .then(result => {
      if (result.success) {
        console.log('\n📊 Test Results:');
        console.log(`   Overall Status: ${result.overallStatus.toUpperCase()}`);
        console.log(`   Can Handle Requests: ${result.canHandleRequests ? 'YES' : 'NO'}`);
        console.log(`   Critical Issues: ${result.criticalIssues}`);
        console.log(`   Warnings: ${result.warnings}`);
        
        process.exit(result.overallStatus === 'critical' ? 1 : 0);
      } else {
        console.error('\n❌ Test failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

export { testHealthCheck };