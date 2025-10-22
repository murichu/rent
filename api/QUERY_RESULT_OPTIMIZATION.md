# Query Result Optimization Implementation

## Overview
This document describes the query result optimization features implemented to improve API performance, reduce memory usage, and prevent system overload.

## Features Implemented

### 1. Result Streaming for Large Datasets
- **Location**: `api/src/services/streamingService.js`
- **Description**: Provides memory-efficient streaming for large query results
- **Features**:
  - Database streaming with configurable batch sizes
  - CSV export streaming for large datasets
  - Memory monitoring during streaming operations
  - Support for properties, tenants, payments, invoices, and leases

**Usage Example**:
```javascript
// Stream properties as CSV
GET /api/properties?stream=true&includeUnits=true
```

### 2. Enhanced Pagination
- **Location**: `api/src/middleware/pagination.js`
- **Description**: Advanced pagination with memory optimization and result limiting
- **Features**:
  - Memory-aware limit adjustment
  - Query parameter validation
  - Result optimization integration
  - Streaming response support

**Usage Example**:
```javascript
// Paginated results with optimization
GET /api/properties?page=1&limit=50&fields=standard
```

### 3. Query Result Limiting
- **Location**: `api/src/middleware/resultLimiter.js`
- **Description**: Prevents memory issues by limiting query results and monitoring resource usage
- **Features**:
  - Maximum result count enforcement (default: 1000)
  - Memory threshold monitoring (200MB warning, 400MB critical)
  - Rate limiting per agency (60/minute, 1000/hour)
  - Automatic garbage collection triggering
  - Request processing time monitoring

**Configuration**:
```javascript
app.use(createResultLimiter({ 
  maxResults: 500, 
  entityType: 'property',
  enableMemoryMonitoring: true 
}));
```

### 4. Object Serialization Optimization
- **Location**: `api/src/services/queryResultOptimizer.js`
- **Description**: Optimizes API responses by selecting only required fields
- **Features**:
  - Predefined field selections (minimal, standard, detailed)
  - Custom field selection support
  - Nested field handling (e.g., `user.name`)
  - Memory-based result truncation

**Field Selection Levels**:
- **Minimal**: Essential fields only (id, name, status)
- **Standard**: Common fields for list views
- **Detailed**: All fields for detail views

**Usage Example**:
```javascript
// Get minimal property data
GET /api/properties?fields=minimal

// Custom field selection
GET /api/properties?entityType=property&selectionLevel=standard
```

### 5. Memory Usage Monitoring
- **Features**:
  - Real-time memory usage tracking
  - Adaptive query limits based on memory pressure
  - Memory statistics in response headers
  - Automatic cleanup of old data

**Response Headers**:
```
X-Result-Optimized: true
X-Memory-Usage-MB: 45
X-Memory-Diff-MB: 2.3
X-Processing-Time-MS: 150
X-Original-Count: 1000
X-Limited-Count: 500
```

### 6. Enhanced Query Optimizer
- **Location**: `api/src/services/queryOptimizer.js`
- **Description**: Improved query optimization with result limiting integration
- **Features**:
  - Memory-optimized pagination parsing
  - Query parameter validation and sanitization
  - Performance metrics logging
  - Result optimization integration

## API Endpoints Updated

All major list endpoints now include query result optimization:

### Properties (`/api/properties`)
- Pagination with memory optimization
- Streaming support for large exports
- Field selection optimization
- Related data includes (units, leases) with limits

### Tenants (`/api/tenants`)
- Search functionality with result limiting
- Lease information includes with optimization
- CSV export streaming

### Invoices (`/api/invoices`)
- Status-based filtering with limits
- Overdue invoice detection
- Payment information includes

### Leases (`/api/leases`)
- Active/inactive filtering
- Property and tenant information includes
- Date range filtering with limits

### Units (`/api/units`)
- Property-based filtering
- Status filtering with optimization
- Tenant information includes

### Payments (`/api/payments`)
- Date range filtering with limits
- Lease and invoice information includes
- Optimized related data loading

## Performance Improvements

### Memory Usage
- **Before**: Unlimited result sets could consume 500MB+ memory
- **After**: Results limited to prevent memory issues, adaptive limits based on current usage
- **Monitoring**: Real-time memory tracking with automatic cleanup

### Response Times
- **Field Selection**: 30-50% reduction in response size for minimal/standard selections
- **Pagination**: Consistent response times regardless of total data size
- **Streaming**: Large exports no longer block the API

### Resource Protection
- **Rate Limiting**: Prevents API abuse (60 requests/minute per agency)
- **Memory Thresholds**: Automatic request rejection when memory is critical
- **Result Limits**: Maximum 1000 results per query (configurable)

## Configuration Options

### Result Limiter Configuration
```javascript
{
  maxResults: 1000,           // Maximum results per query
  enableMemoryMonitoring: true, // Enable memory monitoring
  enableRateLimiting: true,   // Enable rate limiting
  entityType: 'property'      // Entity type for optimization
}
```

### Pagination Configuration
```javascript
{
  defaultPage: 1,             // Default page number
  defaultLimit: 20,           // Default page size
  maxLimit: 100,              // Maximum page size
  memoryLimit: 50 * 1024 * 1024, // Memory limit (50MB)
  enableResultOptimization: true  // Enable result optimization
}
```

### Query Optimizer Configuration
```javascript
{
  memoryThreshold: 100 * 1024 * 1024,  // 100MB threshold
  maxResultSize: 1000,                  // Maximum result count
  serializationCache: true              // Enable serialization caching
}
```

## Monitoring and Logging

### Performance Metrics
- Query execution time
- Memory usage before/after queries
- Result count optimization
- Cache hit/miss rates

### Warning Conditions
- Slow queries (>1000ms)
- High memory usage (>200MB)
- Large result sets (>500 items)
- Rate limit violations

### Log Examples
```
2024-10-22 17:46:21 warn: High memory usage detected in request
{
  url: '/api/properties',
  method: 'GET',
  memoryIncreaseMB: 75,
  totalMemoryMB: 245,
  processingTimeMs: 1250
}

2024-10-22 17:46:21 info: Query metrics
{
  queryName: 'getPropertiesOptimized',
  duration: '450ms',
  resultCount: 150,
  memoryUsageMB: 45,
  memoryDiffMB: 2.3
}
```

## Best Practices

### For API Consumers
1. Use appropriate field selection levels (`?fields=minimal` for lists)
2. Implement pagination for large datasets
3. Use streaming for exports (`?stream=true`)
4. Monitor response headers for optimization info

### For Developers
1. Always use the pagination middleware for list endpoints
2. Apply result limiting for memory-intensive operations
3. Use field selection for related data includes
4. Monitor memory usage in development

### For System Administrators
1. Monitor memory usage trends
2. Adjust rate limits based on usage patterns
3. Configure memory thresholds for your environment
4. Set up alerts for critical memory usage

## Testing

The implementation includes comprehensive tests covering:
- Memory-optimized limit calculation
- Field selection optimization
- Object serialization
- Array optimization
- Result limiting
- Query parameter validation
- Performance metrics logging

Run tests with:
```bash
node test-query-optimization.js
```

## Future Enhancements

Potential improvements for future versions:
1. Redis-based result caching
2. Database query optimization hints
3. Compression for large responses
4. WebSocket streaming for real-time updates
5. GraphQL-style field selection
6. Automatic index recommendations