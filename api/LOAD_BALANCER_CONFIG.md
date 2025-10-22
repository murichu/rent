# Load Balancer Configuration Guide

This document provides configuration guidelines for setting up load balancers with the Haven Property Management API.

## Application Stateless Design

The application has been designed to be stateless for horizontal scaling:

### Session Management
- **Redis-based sessions**: All session data is stored in Redis instead of server memory
- **Stateless authentication**: JWT tokens are used for authentication
- **No server-side state**: No application state is stored in server memory

### Health Check Endpoints

The API provides multiple health check endpoints for load balancer configuration:

#### 1. Liveness Check - `/alive`
- **Purpose**: Basic liveness probe for container orchestration
- **Response**: Always returns 200 if the process is running
- **Use case**: Kubernetes liveness probe, Docker health checks

```bash
curl http://api-server:4000/alive
```

#### 2. Readiness Check - `/ready`
- **Purpose**: Comprehensive readiness check for load balancers
- **Response**: 200 if ready to serve traffic, 503 if not ready
- **Checks**: Database connectivity, cache availability, critical services
- **Use case**: Load balancer health checks, Kubernetes readiness probe

```bash
curl http://api-server:4000/ready
```

#### 3. Detailed Health Check - `/health/detailed`
- **Purpose**: Comprehensive health status with detailed metrics
- **Response**: Detailed health information for all services
- **Use case**: Monitoring dashboards, detailed health analysis

```bash
curl http://api-server:4000/health/detailed
```

## Load Balancer Configuration Examples

### NGINX Configuration

```nginx
upstream haven_api {
    # Health check configuration
    server api-server-1:4000 max_fails=3 fail_timeout=30s;
    server api-server-2:4000 max_fails=3 fail_timeout=30s;
    server api-server-3:4000 max_fails=3 fail_timeout=30s;
    
    # Load balancing method
    least_conn;
    
    # Keep alive connections
    keepalive 32;
}

server {
    listen 80;
    server_name api.haven.com;
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://haven_api/ready;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Health check specific settings
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
    }
    
    # API endpoints
    location / {
        proxy_pass http://haven_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Connection settings
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Keep alive
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }
}

# Rate limiting zone
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
}
```

### HAProxy Configuration

```haproxy
global
    daemon
    maxconn 4096

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog
    option dontlognull
    option redispatch
    retries 3

# Health check backend
backend haven_api_health
    balance roundrobin
    option httpchk GET /ready
    http-check expect status 200
    server api1 api-server-1:4000 check inter 10s fall 3 rise 2
    server api2 api-server-2:4000 check inter 10s fall 3 rise 2
    server api3 api-server-3:4000 check inter 10s fall 3 rise 2

# Main API backend
backend haven_api
    balance leastconn
    option httpchk GET /ready
    http-check expect status 200
    server api1 api-server-1:4000 check inter 30s fall 3 rise 2
    server api2 api-server-2:4000 check inter 30s fall 3 rise 2
    server api3 api-server-3:4000 check inter 30s fall 3 rise 2

# Frontend
frontend haven_api_frontend
    bind *:80
    default_backend haven_api
    
    # Health check endpoint
    acl is_health_check path_beg /health
    use_backend haven_api_health if is_health_check
    
    # Rate limiting
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request deny if { sc_http_req_rate(0) gt 100 }
```

### AWS Application Load Balancer (ALB)

```yaml
# ALB Target Group Configuration
TargetGroup:
  Type: AWS::ElasticLoadBalancingV2::TargetGroup
  Properties:
    Name: haven-api-targets
    Port: 4000
    Protocol: HTTP
    VpcId: !Ref VPC
    
    # Health check configuration
    HealthCheckEnabled: true
    HealthCheckPath: /ready
    HealthCheckProtocol: HTTP
    HealthCheckIntervalSeconds: 30
    HealthCheckTimeoutSeconds: 5
    HealthyThresholdCount: 2
    UnhealthyThresholdCount: 3
    
    # Target group attributes
    TargetGroupAttributes:
      - Key: deregistration_delay.timeout_seconds
        Value: 30
      - Key: stickiness.enabled
        Value: false
      - Key: load_balancing.algorithm.type
        Value: least_outstanding_requests

LoadBalancer:
  Type: AWS::ElasticLoadBalancingV2::LoadBalancer
  Properties:
    Name: haven-api-alb
    Scheme: internet-facing
    Type: application
    Subnets:
      - !Ref PublicSubnet1
      - !Ref PublicSubnet2
    SecurityGroups:
      - !Ref ALBSecurityGroup
```

### Kubernetes Configuration

```yaml
# Service
apiVersion: v1
kind: Service
metadata:
  name: haven-api-service
spec:
  selector:
    app: haven-api
  ports:
    - port: 80
      targetPort: 4000
  type: LoadBalancer

---
# Deployment with health checks
apiVersion: apps/v1
kind: Deployment
metadata:
  name: haven-api-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: haven-api
  template:
    metadata:
      labels:
        app: haven-api
    spec:
      containers:
      - name: haven-api
        image: haven-api:latest
        ports:
        - containerPort: 4000
        
        # Environment variables for instance identification
        env:
        - name: INSTANCE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        
        # Liveness probe
        livenessProbe:
          httpGet:
            path: /alive
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        # Readiness probe
        readinessProbe:
          httpGet:
            path: /ready
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
          successThreshold: 1
        
        # Resource limits
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: haven-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: haven-api-deployment
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Environment Variables for Load Balancing

Set these environment variables for proper load balancer integration:

```bash
# Instance identification
INSTANCE_ID=api-server-1

# Redis configuration for session storage
REDIS_HOST=redis-cluster.internal
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Session configuration
SESSION_TTL=86400  # 24 hours
SESSION_COOKIE_NAME=haven_session

# Health check configuration
HEALTH_CHECK_TIMEOUT=5000  # 5 seconds
```

## Monitoring and Alerting

### Health Check Monitoring

Monitor these endpoints for load balancer health:

1. **Response Time**: Health checks should respond within 5 seconds
2. **Success Rate**: Health checks should have >99% success rate
3. **Instance Health**: Monitor individual instance health status

### Load Balancer Metrics

Track these metrics:

- **Request Distribution**: Ensure even distribution across instances
- **Response Times**: Monitor P95 and P99 response times
- **Error Rates**: Track 4xx and 5xx error rates
- **Connection Counts**: Monitor active connections per instance

### Alerting Rules

Set up alerts for:

- Health check failures (>3 consecutive failures)
- High response times (>3 seconds for health checks)
- Uneven load distribution (>20% variance between instances)
- Circuit breaker activations

## Best Practices

1. **Health Check Frequency**: Use 30-second intervals for production
2. **Failure Thresholds**: Use 3 consecutive failures before marking unhealthy
3. **Recovery Thresholds**: Use 2 consecutive successes before marking healthy
4. **Connection Pooling**: Enable keep-alive connections
5. **Session Affinity**: Disable sticky sessions (application is stateless)
6. **Graceful Shutdown**: Implement proper shutdown handling
7. **Circuit Breakers**: Monitor circuit breaker status in health checks

## Troubleshooting

### Common Issues

1. **Health Check Failures**
   - Check database connectivity
   - Verify Redis availability
   - Monitor memory and CPU usage

2. **Uneven Load Distribution**
   - Verify load balancing algorithm
   - Check instance health status
   - Monitor response times

3. **Session Issues**
   - Verify Redis connectivity
   - Check session configuration
   - Monitor session storage

### Debug Commands

```bash
# Check health status
curl -v http://api-server:4000/ready

# Check detailed health
curl -s http://api-server:4000/health/detailed | jq

# Check circuit breaker status
curl -s http://api-server:4000/api/v1/circuit-breakers | jq

# Monitor instance metrics
curl -s http://api-server:4000/alive | jq
```