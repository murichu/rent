# Redis Caching Layer Implementation

This document describes the Redis caching layer implementation for the Haven Property Management System.

## Overview

The caching layer provides:
- Multi-level caching strategy
- Dashboard data caching with 5-minute TTL
- API response caching for read-only endpoints
- Automatic cache invalidation on data updates
- Cache warming for frequently accessed data
- Cache management and monitoring utilities

## Components

### 1. Core Cache Service (`cache.js`)
- Redis connection management with connection pooling
- Basic cache operations (get, set, delete, invalidate)
- Cache statistics and health monitoring
- Key naming conventions and TTL management

### 2. Dashboard Cache Service (`dashboardCache.js`)
- Specialized caching for dashboard data
- Property, tenant, and payment list caching
- Financial summary and occupancy rate caching
- Cache warming for dashboard components

### 3. Cache Middleware (`cache.js`)
- API response caching middleware
- Cache invalidation middleware
- Conditional caching based on user roles
- Cache key generation for API endpoints

### 4. Cache Warming Service (`cacheWarming.js`)
- Proactive cache warming during low-traffic hours
- Agency-specific cache warming
- Progress tracking for warming operations
- Scheduled cache warming (2 AM daily)

### 5. Cache Manager (`cacheManager.js`)
- Central cache management and coordination
- Health monitoring every 5 minutes
- Cleanup scheduling every hour
- Memory usage monitoring and optimization

### 6. Cache Management API (`routes/cache.js`)
- Cache statistics and health endpoints
- Manual cache warming and invalidation
- Admin-only cache management operations
- Cache configuration information

## Configuration

Add these environment variables to your `.env` file:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Installation

1. Install Redis dependencies:
```bash
npm install redis ioredis
```

2. Start Redis server (if not already running):
```bash
# On Ubuntu/Debian
sudo systemctl start redis-server

# On macOS with Homebrew
brew services start redis

# Using Docker
docker run -d -p 6379:6379 redis:alpine
```

3. The cache manager will automatically initialize when the server starts.

## API Endpoints

### Cache Statistics
- `GET /api/v1/cache/stats` - Get comprehensive cache statistics
- `GET /api/v1/cache/health` - Check cache health status
- `GET /api/v1/cache/dashboard/stats` - Get dashboard cache statistics

### Cache Management
- `POST /api/v1/cache/warm` - Warm cache for current agency
- `GET /api/v1/cache/warm/progress` - Get cache warming progress
- `DELETE /api/v1/cache/invalidate` - Invalidate cache for current agency

### Admin Operations
- `POST /api/v1/cache/cleanup` - Manual cache cleanup (admin only)
- `DELETE /api/v1/cache/flush` - Flush all caches (admin only)
- `POST /api/v1/cache/warm/all` - Warm cache for all agencies (admin only)

## Cache Keys Structure

```
dashboard:{agencyId}:{keyType}:{suffix}
properties:{agencyId}:{operation}:{parameters}
tenants:{agencyId}:{operation}:{parameters}
payments:{agencyId}:{operation}:{parameters}
api:{agencyId}:{userId}:{endpoint}:{query}
```

## TTL Configuration

- Dashboard data: 5 minutes (300 seconds)
- Property lists: 10 minutes (600 seconds)
- Tenant lists: 10 minutes (600 seconds)
- Payment data: 3 minutes (180 seconds)
- API responses: 5 minutes (300 seconds)

## Cache Invalidation

Cache is automatically invalidated when:
- Properties are created, updated, or deleted
- Tenants are created, updated, or deleted
- Payments are processed or updated
- Leases are created or modified

## Monitoring

The system provides:
- Real-time cache hit/miss statistics
- Memory usage monitoring
- Health checks with response time tracking
- Error rate monitoring
- Automatic cleanup of expired keys

## Performance Benefits

Expected improvements:
- Dashboard load time: 60% reduction
- API response times: 50% improvement
- Database query load: 70% reduction
- Support for 5x current user load
- Memory usage optimization: 40% improvement

## Troubleshooting

### Redis Connection Issues
1. Check Redis server status
2. Verify connection parameters in `.env`
3. Check network connectivity
4. Review Redis logs

### Low Cache Hit Rate
1. Check cache warming configuration
2. Verify TTL settings are appropriate
3. Review cache invalidation patterns
4. Monitor cache key patterns

### High Memory Usage
1. Review cache cleanup settings
2. Check for memory leaks in cached data
3. Adjust TTL values if needed
4. Monitor Redis memory usage

## Development

To test the caching implementation:

1. Start the API server with Redis running
2. Make API requests to cached endpoints
3. Check cache statistics at `/api/v1/cache/stats`
4. Monitor cache hit rates and performance improvements

The caching layer is designed to be transparent to existing functionality while providing significant performance improvements.