# Circuit Breaker Implementation

## Overview

This document describes the comprehensive circuit breaker implementation for external services in the Haven Property Management System. The implementation follows the Circuit Breaker pattern to provide resilience and fault tolerance when calling external APIs.

## Features Implemented

### ✅ Core Circuit Breaker Functionality
- **30-second timeout** for all external service calls
- **Configurable failure thresholds** (3-5 failures before opening)
- **Three states**: CLOSED, OPEN, HALF_OPEN
- **Automatic recovery** with configurable reset timeouts
- **Fail-fast behavior** when circuit is open

### ✅ External Services Protected
1. **M-Pesa API** - Payment processing
2. **Pesapal API** - Card payments
3. **KCB Buni API** - Banking services
4. **SMS Service** - Africa's Talking
5. **Email Service** - SMTP
6. **WhatsApp API** - Messaging

### ✅ Monitoring and Management
- **Real-time statistics** for all circuit breakers
- **Health monitoring** endpoints
- **Performance metrics** tracking
- **Manual reset** capabilities
- **Admin dashboard** integration

## Implementation Details

### Circuit Breaker Configuration

Each service has optimized configuration:

```javascript
// Payment services (higher tolerance)
mpesa: { failureThreshold: 3, timeout: 30000, resetTimeout: 120000 }
pesapal: { failureThreshold: 3, timeout: 30000, resetTimeout: 120000 }
kcb: { failureThreshold: 3, timeout: 30000, resetTimeout: 120000 }

// Communication services (lower tolerance)
email: { failureThreshold: 5, timeout: 15000, resetTimeout: 60000 }
sms: { failureThreshold: 5, timeout: 10000, resetTimeout: 60000 }
whatsapp: { failureThreshold: 5, timeout: 15000, resetTimeout: 60000 }
```

### API Endpoints

#### Circuit Breaker Management
- `GET /api/v1/circuit-breakers` - Get all circuit breaker statistics
- `GET /api/v1/circuit-breakers/:serviceName` - Get specific service stats
- `POST /api/v1/circuit-breakers/:serviceName/reset` - Reset specific circuit breaker
- `POST /api/v1/circuit-breakers/reset-all` - Reset all circuit breakers

#### Health Monitoring
- `GET /api/v1/circuit-breakers/health` - Overall health summary
- `GET /api/v1/circuit-breakers/metrics` - Detailed performance metrics

#### Testing (Admin Only)
- `POST /api/v1/test-circuit-breaker/simulate-failure` - Test failure scenarios
- `POST /api/v1/test-circuit-breaker/simulate-timeout` - Test timeout handling
- `POST /api/v1/test-circuit-breaker/test-external-services` - Check all services

### Usage Examples

#### Protected Service Call
```javascript
import { mpesaCircuitBreaker } from './circuitBreaker.js';

export async function getMpesaAccessToken() {
  return await mpesaCircuitBreaker.execute(async () => {
    const response = await axios.get(tokenUrl, {
      timeout: 25000 // Within circuit breaker's 30s limit
    });
    return response.data.access_token;
  });
}
```

#### Circuit Breaker Statistics
```javascript
const stats = circuitBreakerManager.getAllStats();
// Returns:
{
  "mpesa": {
    "state": "CLOSED",
    "failureCount": 0,
    "successCount": 15,
    "uptime": 100
  },
  "pesapal": {
    "state": "OPEN",
    "failureCount": 5,
    "nextAttempt": "2024-01-15T10:30:00Z"
  }
}
```

## Error Handling

### Circuit Breaker Errors
When a circuit is open, calls fail immediately with:
```javascript
{
  message: "Circuit breaker mpesa is OPEN",
  circuitBreakerOpen: true
}
```

### Timeout Errors
When operations exceed the timeout:
```javascript
{
  message: "Circuit breaker mpesa timeout after 30000ms",
  timeout: true
}
```

## Monitoring Integration

### Performance Tracking
- All external service calls are tracked with response times
- Slow requests (>1 second) are logged automatically
- Circuit breaker state changes are logged with context

### Health Checks
- Circuit breaker health is included in system health checks
- Alerts are triggered when circuits open
- Dashboard shows real-time circuit breaker status

## Testing

### Manual Testing
Use the admin test endpoints to verify functionality:

```bash
# Test failure scenarios
POST /api/v1/test-circuit-breaker/simulate-failure
{
  "serviceName": "test-service",
  "shouldFail": true,
  "iterations": 5
}

# Test timeout handling
POST /api/v1/test-circuit-breaker/simulate-timeout
{
  "serviceName": "timeout-test",
  "delay": 6000
}
```

### Production Monitoring
Monitor circuit breaker health in production:

```bash
# Check overall health
GET /api/v1/circuit-breakers/health

# Get detailed metrics
GET /api/v1/circuit-breakers/metrics
```

## Benefits Achieved

1. **Improved Resilience** - System continues operating when external services fail
2. **Faster Failure Detection** - Immediate failure response when circuits are open
3. **Reduced Resource Usage** - No wasted resources on failing services
4. **Better User Experience** - Predictable error responses instead of timeouts
5. **Operational Visibility** - Clear monitoring of external service health

## Configuration Recommendations

### Production Settings
- Monitor circuit breaker metrics daily
- Set up alerts for circuit breaker state changes
- Review failure thresholds based on service SLAs
- Adjust timeouts based on service performance patterns

### Development Settings
- Use shorter timeouts for faster feedback
- Lower failure thresholds for easier testing
- Enable detailed logging for debugging

## Troubleshooting

### Common Issues

1. **Circuit Stuck Open**
   - Check external service availability
   - Verify network connectivity
   - Consider manual reset if service is restored

2. **Frequent Timeouts**
   - Review timeout configuration
   - Check network latency
   - Consider increasing timeout for slow services

3. **High Failure Rate**
   - Investigate external service issues
   - Review API credentials and configuration
   - Check for rate limiting by external services

### Recovery Procedures

1. **Manual Reset**: Use admin endpoints to reset circuits
2. **Service Restart**: Restart application to reset all circuits
3. **Configuration Update**: Adjust thresholds based on service behavior

## Future Enhancements

- [ ] Circuit breaker metrics dashboard
- [ ] Automated alerting integration
- [ ] Historical failure analysis
- [ ] Predictive circuit opening based on trends
- [ ] Integration with external monitoring tools

## Compliance

This implementation satisfies:
- **Requirement 5.5**: 30-second timeout for external calls
- **Performance monitoring**: Response time tracking
- **Failure threshold configuration**: Configurable failure limits
- **Recovery mechanisms**: Automatic and manual reset capabilities