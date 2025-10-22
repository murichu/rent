# Load Balancer Implementation Guide

## Overview

The Haven Property Management System API has been optimized for horizontal scaling with a fully stateless architecture. This implementation enables load balancing across multiple instances without session stickiness.

## ✅ Implementation Status

### Completed Features

- **✅ Stateless Architecture**: All server-side state moved to Redis
- **✅ Redis Session Storage**: JWT tokens with Redis-based session management
- **✅ Shared Cache Layer**: Redis-based caching for all instances
- **✅ Health Check Endpoints**: Comprehensive health monitoring
- **✅ Instance Management**: Unique instance identification and tracking
- **✅ Graceful Shutdown**: Proper connection handling during deployments
- **✅ Load Balancer Middleware**: Headers, tracking, and monitoring
- **✅ Configuration Examples**: Nginx, HAProxy, Docker, Kubernetes

### Key Components

1. **Load Balancer Middleware** (`src/middleware/loadBalancer.js`)
   - Stateless operation validation
   - Sticky session alternatives
   - Request tracking and metrics
   - Graceful shutdown handling

2. **Load Balancer Service** (`src/services/loadBalancerService.js`)
   - Instance registration and discovery
   - Health status management
   - Metrics collection and reporting
   - Dependency monitoring

3. **Session Management** (`src/middleware/session.js`)
   - Redis-based session storage
   - Stateless session operations
   - Cross-instance session sharing

4. **Health Check Endpoints**
   - `/health` - Basic health check
   - `/ready` - Readiness for load balancers
   - `/alive` - Liveness for containers
   - `/api/v1/load-balancer/health` - Detailed LB health

## 🚀 Quick Start

### 1. Single Instance Testing

```bash
# Start the API server
npm run dev

# Test health endpoints
curl http://localhost:4000/health
curl http://localhost:4000/ready
curl http://localhost:4000/api/v1/load-balancer/health
```

### 2. Multiple Instance Testing

```bash
# Start multiple instances
node start-multiple-instances.js 3 4001

# This starts 3 instances on ports 4001, 4002, 4003
```

### 3. Docker Compose Load Balancer

```bash
# Start with Docker Compose
docker-compose -f docker-compose.loadbalancer.yml up

# Test the load balancer
curl http://localhost/health
node test-load-balancer.js http://localhost
```

### 4. Manual Nginx Setup

```bash
# Copy the nginx configuration
cp nginx-lb.conf /etc/nginx/nginx.conf

# Start nginx
nginx -t && nginx -s reload

# Test load balancing
node test-load-balancer.js http://localhost
```

## 📊 Health Check Endpoints

### Basic Health Check
```bash
GET /health
```
Response:
```json
{
  "success": true,
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Readiness Check (for Load Balancers)
```bash
GET /ready
```
Response:
```json
{
  "ready": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "instanceId": "api-1",
  "version": "1.0.0",
  "loadBalancerReady": true
}
```

### Detailed Load Balancer Health
```bash
GET /api/v1/load-balancer/health
```
Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "instanceId": "api-1",
  "responseTime": "45ms",
  "uptime": 3600,
  "loadBalancer": {
    "ready": true,
    "stateless": true,
    "sessionStore": "redis",
    "cacheStore": "redis"
  },
  "dependencies": {
    "redis": "healthy",
    "database": "healthy"
  },
  "resources": {
    "memory": {
      "used": "128.5MB",
      "total": "256.0MB",
      "percentage": "50.2%"
    }
  }
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Instance identification
INSTANCE_ID=api-1

# Session configuration
SESSION_TTL=86400
SESSION_COOKIE_NAME=haven_session

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Load balancer settings
SHUTDOWN_TIMEOUT=30000
TRUST_PROXY=true
```

### Load Balancer Headers

The application automatically adds these headers:

- `X-Instance-Id`: Unique instance identifier
- `X-Served-By`: Instance that served the request
- `X-Session-Shared`: Indicates Redis-based sessions
- `X-Load-Balancer-Ready`: Confirms LB compatibility
- `X-Stateless`: Confirms stateless operation
- `X-Response-Time`: Request processing time

## 🧪 Testing

### Automated Testing

```bash
# Run the load balancer test suite
node test-load-balancer.js http://localhost

# Test specific functionality
node test-load-balancer.js http://localhost --health-only
node test-load-balancer.js http://localhost --load-distribution
```

### Manual Testing

```bash
# Test health endpoints
curl -v http://localhost/health
curl -v http://localhost/ready
curl -v http://localhost/alive

# Test load distribution
for i in {1..10}; do
  curl -s http://localhost/health | jq '.instanceId // "unknown"'
done

# Test session sharing
curl -c cookies.txt -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Make requests with session
for i in {1..5}; do
  curl -b cookies.txt http://localhost/api/v1/dashboard
done
```

### Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost/health

# Using curl for concurrent testing
seq 1 100 | xargs -n1 -P10 -I{} curl -s http://localhost/health
```

## 📈 Monitoring

### Instance Metrics

```bash
GET /api/v1/load-balancer/metrics
```

### Active Instances

```bash
GET /api/v1/load-balancer/instances
```

### Configuration Info

```bash
GET /api/v1/load-balancer/config
```

## 🔄 Deployment Strategies

### Rolling Deployment

1. Start new instances with updated code
2. Health check new instances
3. Add new instances to load balancer
4. Remove old instances from load balancer
5. Gracefully shutdown old instances

### Blue-Green Deployment

1. Deploy to green environment
2. Test green environment
3. Switch load balancer to green
4. Keep blue as backup

### Canary Deployment

1. Deploy to subset of instances
2. Route small percentage of traffic
3. Monitor metrics and errors
4. Gradually increase traffic
5. Complete rollout or rollback

## 🚨 Troubleshooting

### Common Issues

1. **Session Loss**
   - Check Redis connectivity
   - Verify session configuration
   - Check cookie settings

2. **Uneven Load Distribution**
   - Verify load balancer algorithm
   - Check instance health
   - Review connection limits

3. **Health Check Failures**
   - Check endpoint response times
   - Verify dependencies
   - Review resource usage

4. **Memory Issues**
   - Monitor instance memory
   - Check for memory leaks
   - Review garbage collection

### Debug Commands

```bash
# Check Redis connectivity
redis-cli -h localhost -p 6379 ping

# Check instance health
curl http://localhost:4001/api/v1/load-balancer/health
curl http://localhost:4002/api/v1/load-balancer/health
curl http://localhost:4003/api/v1/load-balancer/health

# Check active instances
curl http://localhost/api/v1/load-balancer/instances

# Force health check
curl -X POST http://localhost/api/v1/load-balancer/health-check
```

### Log Analysis

```bash
# Check instance logs
docker-compose logs api1
docker-compose logs api2
docker-compose logs api3

# Check nginx logs
docker-compose logs nginx

# Check Redis logs
docker-compose logs redis
```

## 📚 Load Balancer Configurations

### Nginx Configuration

See `nginx-lb.conf` for complete configuration with:
- Health checks
- Rate limiting
- SSL termination
- Request routing
- Error handling

### HAProxy Configuration

See `load-balancer-config.md` for HAProxy setup with:
- Health monitoring
- Load balancing algorithms
- SSL configuration
- Statistics page

### Docker Compose

See `docker-compose.loadbalancer.yml` for:
- Multi-instance setup
- Nginx load balancer
- Redis and MongoDB
- Health checks

### Kubernetes

See `load-balancer-config.md` for K8s manifests with:
- Deployment configuration
- Service definitions
- Ingress setup
- Health probes

## 🎯 Performance Optimization

### Connection Pooling

- Database: Prisma connection pooling (5-20 connections)
- Redis: Connection pooling for sessions and cache
- HTTP: Keep-alive connections

### Caching Strategy

- Application cache: Redis-based
- Session cache: Redis-based
- Response cache: Nginx/HAProxy level
- Browser cache: Appropriate headers

### Resource Management

- Memory monitoring and alerts
- CPU usage tracking
- Connection limit management
- Graceful degradation

## 🔒 Security Considerations

### Headers

- Security headers via Helmet
- Load balancer identification
- Request tracking
- CORS configuration

### Session Security

- Secure cookies in production
- HttpOnly session cookies
- SameSite cookie policy
- Session timeout management

### Rate Limiting

- Per-user rate limits
- Global rate limits
- Authentication rate limits
- Health check exemptions

## 📋 Checklist

### Pre-Deployment

- [ ] Redis connectivity tested
- [ ] Database connection pooling configured
- [ ] Health check endpoints responding
- [ ] Instance identification working
- [ ] Session sharing tested
- [ ] Load balancer configuration validated

### Post-Deployment

- [ ] All instances healthy
- [ ] Load distribution verified
- [ ] Session persistence working
- [ ] Monitoring alerts configured
- [ ] Backup procedures tested
- [ ] Rollback plan ready

### Monitoring

- [ ] Health check monitoring
- [ ] Response time alerts
- [ ] Error rate monitoring
- [ ] Resource usage tracking
- [ ] Load distribution analysis
- [ ] Session metrics

## 🎉 Success Criteria

The load balancer implementation is successful when:

1. ✅ Multiple instances can serve requests
2. ✅ Sessions work across all instances
3. ✅ Health checks pass consistently
4. ✅ Load is distributed evenly
5. ✅ Failover works automatically
6. ✅ Graceful shutdown works properly
7. ✅ Monitoring provides visibility
8. ✅ Performance meets requirements

## 📞 Support

For issues or questions:

1. Check the troubleshooting section
2. Review the logs for errors
3. Test individual components
4. Verify configuration settings
5. Check network connectivity
6. Monitor resource usage

The load balancer implementation provides a solid foundation for horizontal scaling while maintaining session consistency and system reliability.