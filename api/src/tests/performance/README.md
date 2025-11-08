# Performance Testing Framework

This directory contains a comprehensive performance testing framework for the Haven Property Management System API. The framework includes load testing, benchmarking, stress testing, and regression detection capabilities.

## Overview

The performance testing framework consists of several components:

- **Load Testing**: Tests system performance under expected load conditions
- **Benchmarking**: Establishes baseline performance metrics and detects regressions
- **Stress Testing**: Tests system behavior beyond normal capacity limits
- **Regression Detection**: Monitors performance trends and identifies degradations

## Components

### 1. LoadTester (`loadTest.js`)
Tests system performance under various load conditions:
- Dashboard performance with 100 concurrent users
- Payment processing under load
- Bulk operations with large datasets
- API endpoint performance testing

### 2. PerformanceBenchmark (`benchmark.js`)
Establishes baseline metrics and detects regressions:
- Core endpoint benchmarking
- Baseline comparison
- Regression detection
- Performance trend analysis

### 3. StressTester (`stressTest.js`)
Tests system behavior under extreme conditions:
- System capacity limits testing
- Graceful degradation validation
- Recovery time measurement
- Memory stress testing

### 4. RegressionDetector (`regressionDetector.js`)
Monitors performance trends over time:
- Historical data analysis
- Trend detection
- Regression identification
- Continuous monitoring

### 5. PerformanceTestSuite (`runPerformanceTests.js`)
Main orchestrator that runs all test types:
- Comprehensive test execution
- Report generation
- Summary analysis
- CLI interface

## Usage

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Ensure the API server is running:
```bash
npm run dev
```

### Running Tests

#### Full Test Suite
```bash
npm run test:performance
```

#### Individual Test Types
```bash
# Load testing only
npm run test:performance load

# Benchmarking only
npm run test:performance benchmark

# Stress testing only
npm run test:performance stress

# Regression analysis only
npm run test:performance regression

# Quick test (excludes stress testing)
npm run test:performance quick
```

#### Using Artillery for Load Testing
```bash
npm run test:load
```

#### Running Jest Performance Tests
```bash
npm test -- --testPathPattern=performance
```

### Command Line Options

The performance test suite accepts the following commands:

- `full` (default): Run all test types
- `quick`: Run load, benchmark, and regression tests (skip stress)
- `load`: Run only load tests
- `benchmark`: Run only benchmarks
- `stress`: Run only stress tests
- `regression`: Run only regression analysis

You can also specify a custom base URL:
```bash
node src/tests/performance/runPerformanceTests.js full http://localhost:4000
```

## Configuration

### Performance Thresholds

The framework uses the following default thresholds:

- **Response Time**: <2 seconds for dashboard, <500ms for API endpoints
- **Error Rate**: <5% for load tests, <10% for stress tests
- **Regression Threshold**: 20% increase in response time
- **Memory Usage**: <80% of available memory
- **Concurrent Users**: Support for 100+ concurrent users

### Customizing Thresholds

You can modify thresholds in the respective test files:

```javascript
// In benchmark.js
const thresholds = {
  responseTime: 20, // 20% increase is regression
  errorRate: 5,     // 5% increase in error rate
  throughput: 15,   // 15% decrease in throughput
  memoryUsage: 25   // 25% increase in memory usage
};
```

## Reports

All test results are saved in the `src/tests/performance/reports/` directory:

- `load-test-{timestamp}.json`: Load test results
- `benchmark-{timestamp}.json`: Benchmark results
- `stress-test-{timestamp}.json`: Stress test results
- `regression-analysis-{timestamp}.json`: Regression analysis
- `performance-suite-{timestamp}.json`: Complete test suite results

### Report Structure

Each report contains:
- Test metadata (timestamp, configuration)
- Detailed results for each test
- Performance metrics (latency, throughput, error rates)
- Summary and recommendations

## Performance Requirements Validation

The framework validates the following requirements from the specification:

### Requirement 1.1 - Dashboard Performance
- Dashboard loads within 2 seconds
- Supports 100+ concurrent users
- Maintains <3 second response times under load

### Requirement 2.1-2.5 - Database Optimization
- Query execution times <100ms average
- Bulk operations process 100 records per batch
- Connection pooling efficiency

### Requirement 3.1-3.5 - Payment Processing
- M-Pesa STK push completes within 10 seconds
- Concurrent payment handling without conflicts
- Payment callback processing optimization

### Requirement 6.1-6.5 - Performance Monitoring
- API response time tracking
- Database query performance monitoring
- System resource monitoring
- Performance trend analysis

## Continuous Integration

### GitHub Actions Integration

Add to your `.github/workflows/performance.yml`:

```yaml
name: Performance Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:performance quick
      - name: Upload Performance Reports
        uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: api/src/tests/performance/reports/
```

### Regression Detection in CI

The framework automatically fails CI builds when:
- Critical performance regressions are detected (>50% degradation)
- Error rates exceed 10%
- System fails to handle minimum load requirements

## Troubleshooting

### Common Issues

1. **Connection Refused Errors**
   - Ensure API server is running on the correct port
   - Check firewall settings
   - Verify base URL configuration

2. **High Error Rates**
   - Check database connectivity
   - Verify Redis cache availability
   - Review API server logs

3. **Memory Issues**
   - Increase Node.js memory limit: `node --max-old-space-size=4096`
   - Monitor system resources during tests
   - Reduce test concurrency if needed

4. **Timeout Errors**
   - Increase test timeouts in Jest configuration
   - Check network latency
   - Verify external service availability

### Performance Optimization Tips

1. **Database Optimization**
   - Ensure proper indexes are in place
   - Monitor slow query logs
   - Optimize N+1 query patterns

2. **Caching Strategy**
   - Implement Redis caching for frequently accessed data
   - Use appropriate cache TTL values
   - Monitor cache hit rates

3. **API Optimization**
   - Implement response compression
   - Use pagination for large datasets
   - Optimize JSON serialization

4. **System Resources**
   - Monitor memory usage patterns
   - Implement connection pooling
   - Use clustering for CPU-intensive operations

## Contributing

When adding new performance tests:

1. Follow the existing naming conventions
2. Include appropriate test timeouts
3. Add validation for performance requirements
4. Update this README with new test descriptions
5. Ensure tests are deterministic and repeatable

## Support

For issues or questions about the performance testing framework:

1. Check the troubleshooting section above
2. Review test logs in the reports directory
3. Consult the API server logs for errors
4. Create an issue with detailed error information