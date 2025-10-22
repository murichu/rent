# Load Balancer Configuration Guide

## Overview

This document provides configuration examples and guidelines for setting up load balancers with the Haven Property Management System API. The application has been optimized for horizontal scaling with stateless architecture.

## Application Features for Load Balancing

### ✅ Stateless Architecture
- **Session Storage**: Redis-based sessions (no server-side memory storage)
- **Cache Storage**: Redis-based caching for shared state
- **JWT Authentication**: Stateless token-based authentication
- **Database**: Shared MongoDB database across instances

### ✅ Health Check Endpoints
- `/health` - Basic health check
- `/health/detailed` - Comprehensive health check
- `/ready` - Readiness check for load balancers
- `/alive` - Liveness check for container orchestration
- `/api/v1/load-balancer/health` - Load balancer specific health check

### ✅ Instance Management
- Unique instance identification
- Graceful shutdown handling
- Request tracking and metrics
- Dependency health monitoring

## Nginx Configuration

### Basic Load Balancer Setup

```nginx
upstream haven_api {
    # Load balancing method
    least_conn;
    
    # Backend servers
    server 127.0.0.1:4001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4002 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4003 max_fails=3 fail_timeout=30s;
    
    # Health check (requires nginx-plus or custom module)
    # health_check uri=/ready interval=30s fails=3 passes=2;
}

server {
    listen 80;
    server_name api.haven.example.com;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Load balancer headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-ID $request_id;
    
    # Connection settings
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
    
    # Health check endpoint (public)
    location /health {
        proxy_pass http://haven_api;
        access_log off;
    }
    
    location /ready {
        proxy_pass http://haven_api;
        access_log off;
    }
    
    location /alive {
        proxy_pass http://haven_api;
        access_log off;
    }
    
    # API routes
    location / {
        proxy_pass http://haven_api;
        
        # Handle WebSocket upgrades if needed
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;
    }
}

# Rate limiting zone
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

### Advanced Nginx Configuration with Health Checks

```nginx
upstream haven_api {
    least_conn;
    
    server 127.0.0.1:4001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4002 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4003 max_fails=3 fail_timeout=30s;
    
    # Backup server
    server 127.0.0.1:4004 backup;
    
    keepalive 32;
}

server {
    listen 80;
    server_name api.haven.example.com;
    
    # Custom health check location
    location /lb-health {
        proxy_pass http://haven_api/api/v1/load-balancer/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_connect_timeout 5s;
        proxy_read_timeout 5s;
        access_log off;
    }
    
    # Main application
    location / {
        proxy_pass http://haven_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # Load balancer headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Retry logic
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 30s;
    }
}
```

## HAProxy Configuration

### Basic HAProxy Setup

```haproxy
global
    daemon
    maxconn 4096
    log stdout local0
    
defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog
    option dontlognull
    option redispatch
    retries 3
    
frontend haven_frontend
    bind *:80
    default_backend haven_backend
    
    # Health check ACL
    acl health_check path_beg /health /ready /alive
    
    # Rate limiting (requires stick-table)
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request deny if { sc_http_req_rate(0) gt 20 }
    
backend haven_backend
    balance roundrobin
    option httpchk GET /ready
    http-check expect status 200
    
    # Backend servers
    server api1 127.0.0.1:4001 check inter 30s fall 3 rise 2
    server api2 127.0.0.1:4002 check inter 30s fall 3 rise 2
    server api3 127.0.0.1:4003 check inter 30s fall 3 rise 2
    
    # Backup server
    server api4 127.0.0.1:4004 check inter 30s fall 3 rise 2 backup
    
    # Headers
    http-request set-header X-Forwarded-Proto https if { ssl_fc }
    http-request set-header X-Forwarded-Proto http if !{ ssl_fc }
    
# Statistics page
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s
    stats admin if TRUE
```

### Advanced HAProxy with SSL and Health Monitoring

```haproxy
global
    daemon
    maxconn 4096
    log stdout local0
    
    # SSL Configuration
    ssl-default-bind-ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets
    
defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog
    option dontlognull
    option redispatch
    retries 3
    
frontend haven_frontend
    bind *:80
    bind *:443 ssl crt /path/to/certificate.pem
    
    # Redirect HTTP to HTTPS
    redirect scheme https if !{ ssl_fc }
    
    # Security headers
    http-response set-header Strict-Transport-Security "max-age=31536000; includeSubDomains"
    http-response set-header X-Frame-Options DENY
    http-response set-header X-Content-Type-Options nosniff
    
    default_backend haven_backend
    
backend haven_backend
    balance leastconn
    
    # Advanced health check
    option httpchk GET /api/v1/load-balancer/health
    http-check expect status 200
    http-check expect string "healthy"
    
    # Backend servers with weights
    server api1 127.0.0.1:4001 check inter 30s fall 3 rise 2 weight 100
    server api2 127.0.0.1:4002 check inter 30s fall 3 rise 2 weight 100
    server api3 127.0.0.1:4003 check inter 30s fall 3 rise 2 weight 100
    
    # Headers for backend
    http-request set-header X-Forwarded-Proto https
    http-request set-header X-Forwarded-Port 443
```

## Docker Compose with Load Balancer

```yaml
version: '3.8'

services:
  # Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api1
      - api2
      - api3
    restart: unless-stopped
    
  # API Instances
  api1:
    build: .
    environment:
      - PORT=4000
      - INSTANCE_ID=api-1
      - REDIS_HOST=redis
      - DATABASE_URL=mongodb://mongo:27017/rental_saas
    depends_on:
      - redis
      - mongo
    restart: unless-stopped
    
  api2:
    build: .
    environment:
      - PORT=4000
      - INSTANCE_ID=api-2
      - REDIS_HOST=redis
      - DATABASE_URL=mongodb://mongo:27017/rental_saas
    depends_on:
      - redis
      - mongo
    restart: unless-stopped
    
  api3:
    build: .
    environment:
      - PORT=4000
      - INSTANCE_ID=api-3
      - REDIS_HOST=redis
      - DATABASE_URL=mongodb://mongo:27017/rental_saas
    depends_on:
      - redis
      - mongo
    restart: unless-stopped
    
  # Shared Services
  redis:
    image: redis:alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    
  mongo:
    image: mongo:latest
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  redis_data:
  mongo_data:
```

## Kubernetes Configuration

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: haven-api
  labels:
    app: haven-api
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
        env:
        - name: INSTANCE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: REDIS_HOST
          value: "redis-service"
        - name: DATABASE_URL
          value: "mongodb://mongo-service:27017/rental_saas"
        livenessProbe:
          httpGet:
            path: /alive
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: haven-api-service
spec:
  selector:
    app: haven-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 4000
  type: LoadBalancer
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: haven-api-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.haven.example.com
    secretName: haven-tls-secret
  rules:
  - host: api.haven.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: haven-api-service
            port:
              number: 80
```

## Environment Variables for Load Balancing

```bash
# Instance Identification
INSTANCE_ID=api-1

# Session Configuration
SESSION_TTL=86400
SESSION_COOKIE_NAME=haven_session
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Graceful Shutdown
SHUTDOWN_TIMEOUT=30000

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000

# Load Balancer Headers
TRUST_PROXY=true
```

## Monitoring and Alerting

### Health Check Endpoints

1. **Basic Health**: `GET /health`
   - Quick health status
   - Response time: <100ms
   - Use for basic monitoring

2. **Detailed Health**: `GET /health/detailed`
   - Comprehensive health check
   - Response time: <500ms
   - Use for detailed monitoring

3. **Readiness**: `GET /ready`
   - Load balancer readiness
   - Response time: <200ms
   - Use for load balancer health checks

4. **Load Balancer Health**: `GET /api/v1/load-balancer/health`
   - Detailed load balancer status
   - Instance metrics
   - Dependency status

### Monitoring Metrics

- Response time per endpoint
- Request count per instance
- Error rate per instance
- Memory usage per instance
- CPU usage per instance
- Active connections
- Session count
- Cache hit rate

### Alerting Thresholds

- Response time > 3 seconds
- Error rate > 5%
- Memory usage > 80%
- CPU usage > 80%
- Instance down for > 1 minute
- Cache hit rate < 70%

## Testing Load Balancer Setup

### Health Check Test

```bash
# Test basic health
curl -f http://localhost/health

# Test readiness
curl -f http://localhost/ready

# Test load balancer health
curl -f http://localhost/api/v1/load-balancer/health
```

### Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost/api/v1/dashboard

# Using curl with multiple requests
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code} %{time_total}\n" http://localhost/health
done
```

### Session Persistence Test

```bash
# Login and get session
SESSION=$(curl -s -c cookies.txt -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' | jq -r '.token')

# Make multiple requests with session
for i in {1..10}; do
  curl -s -b cookies.txt -H "Authorization: Bearer $SESSION" \
    http://localhost/api/v1/dashboard | jq '.success'
done
```

## Troubleshooting

### Common Issues

1. **Session Loss**: Check Redis connectivity and configuration
2. **Uneven Load Distribution**: Verify load balancer algorithm
3. **Health Check Failures**: Check endpoint response times
4. **Memory Leaks**: Monitor instance memory usage
5. **Database Connection Issues**: Check connection pool settings

### Debug Commands

```bash
# Check instance status
curl http://localhost/api/v1/load-balancer/instances

# Check instance metrics
curl http://localhost/api/v1/load-balancer/metrics

# Force health check
curl -X POST http://localhost/api/v1/load-balancer/health-check
```

## Best Practices

1. **Always use health checks** in load balancer configuration
2. **Set appropriate timeouts** for connections and requests
3. **Monitor instance metrics** continuously
4. **Use graceful shutdown** for deployments
5. **Test failover scenarios** regularly
6. **Keep session data minimal** for performance
7. **Use connection pooling** for databases
8. **Implement circuit breakers** for external services
9. **Log request distribution** for analysis
10. **Regular load testing** to validate performance