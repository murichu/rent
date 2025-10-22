#!/usr/bin/env node

/**
 * Start Multiple API Instances for Load Balancer Testing
 * This script starts multiple instances of the API server on different ports
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MultiInstanceManager {
  constructor() {
    this.instances = [];
    this.basePort = 4001;
    this.instanceCount = 3;
  }

  /**
   * Start a single API instance
   */
  startInstance(instanceId, port) {
    console.log(`🚀 Starting instance ${instanceId} on port ${port}...`);
    
    const env = {
      ...process.env,
      PORT: port.toString(),
      INSTANCE_ID: `api-${instanceId}`,
      NODE_ENV: 'development'
    };

    const instance = spawn('node', ['src/server.js'], {
      cwd: __dirname,
      env,
      stdio: ['inherit', 'pipe', 'pipe']
    });

    // Handle stdout
    instance.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.log(`[${instanceId}] ${message}`);
      }
    });

    // Handle stderr
    instance.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.error(`[${instanceId}] ERROR: ${message}`);
      }
    });

    // Handle process exit
    instance.on('close', (code) => {
      console.log(`[${instanceId}] Process exited with code ${code}`);
      this.instances = this.instances.filter(i => i.instanceId !== instanceId);
    });

    // Handle process error
    instance.on('error', (error) => {
      console.error(`[${instanceId}] Failed to start: ${error.message}`);
    });

    this.instances.push({
      instanceId,
      port,
      process: instance
    });

    return instance;
  }

  /**
   * Start all instances
   */
  async startAllInstances() {
    console.log(`🏗️  Starting ${this.instanceCount} API instances...\n`);

    for (let i = 1; i <= this.instanceCount; i++) {
      const port = this.basePort + i - 1;
      this.startInstance(i, port);
      
      // Small delay between starts
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n✅ All instances started!');
    console.log('\nInstance URLs:');
    this.instances.forEach(instance => {
      console.log(`  - Instance ${instance.instanceId}: http://localhost:${instance.port}`);
    });

    console.log('\nHealth Check URLs:');
    this.instances.forEach(instance => {
      console.log(`  - http://localhost:${instance.port}/health`);
    });

    console.log('\nLoad Balancer Endpoints:');
    this.instances.forEach(instance => {
      console.log(`  - http://localhost:${instance.port}/api/v1/load-balancer/health`);
    });

    console.log('\n💡 Tips:');
    console.log('  - Configure your load balancer to point to these instances');
    console.log('  - Use the test-load-balancer.js script to test the setup');
    console.log('  - Press Ctrl+C to stop all instances');
  }

  /**
   * Stop all instances
   */
  stopAllInstances() {
    console.log('\n🛑 Stopping all instances...');
    
    this.instances.forEach(instance => {
      console.log(`  Stopping instance ${instance.instanceId}...`);
      instance.process.kill('SIGTERM');
    });

    // Force kill after timeout
    setTimeout(() => {
      this.instances.forEach(instance => {
        if (!instance.process.killed) {
          console.log(`  Force killing instance ${instance.instanceId}...`);
          instance.process.kill('SIGKILL');
        }
      });
    }, 10000); // 10 seconds timeout
  }

  /**
   * Handle graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = (signal) => {
      console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
      this.stopAllInstances();
      
      setTimeout(() => {
        console.log('👋 Goodbye!');
        process.exit(0);
      }, 12000); // 12 seconds total timeout
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  /**
   * Display status
   */
  displayStatus() {
    setInterval(() => {
      const runningInstances = this.instances.filter(i => !i.process.killed);
      if (runningInstances.length > 0) {
        console.log(`\n📊 Status: ${runningInstances.length}/${this.instanceCount} instances running`);
        runningInstances.forEach(instance => {
          console.log(`  ✅ Instance ${instance.instanceId} (PID: ${instance.process.pid}) - Port ${instance.port}`);
        });
      }
    }, 30000); // Every 30 seconds
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const instanceCount = parseInt(args[0]) || 3;
const basePort = parseInt(args[1]) || 4001;

// Create and start manager
const manager = new MultiInstanceManager();
manager.instanceCount = instanceCount;
manager.basePort = basePort;

console.log('🎯 Multi-Instance API Manager');
console.log('============================');
console.log(`Instances: ${instanceCount}`);
console.log(`Base Port: ${basePort}`);
console.log(`Port Range: ${basePort} - ${basePort + instanceCount - 1}\n`);

// Setup graceful shutdown
manager.setupGracefulShutdown();

// Start status display
manager.displayStatus();

// Start all instances
manager.startAllInstances().catch(error => {
  console.error('Failed to start instances:', error);
  process.exit(1);
});

export default MultiInstanceManager;