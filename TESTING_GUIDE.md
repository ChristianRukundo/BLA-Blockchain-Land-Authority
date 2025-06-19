# 🧪 RwaLandChain Backend Testing & Running Guide

This comprehensive guide will help you test and run the complete RwaLandChain backend application.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- PostgreSQL 14+ with PostGIS extension
- Redis 6+
- Docker and Docker Compose (recommended)

### 1. Environment Setup

```bash
# Navigate to backend directory
cd packages/backend

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=rwalandchain
DB_LOGGING=true

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=30d

# Application Configuration
NODE_ENV=development
PORT=3001
API_PREFIX=api
API_VERSION=v1
LOG_LEVEL=debug

# Features
ENABLE_SWAGGER=true
ENABLE_METRICS=true
ENABLE_HEALTH_CHECK=true
HELMET_ENABLED=false
COMPRESSION_ENABLED=true

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx

# IPFS Configuration
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@rwalandchain.com

# Blockchain Configuration (Optional)
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_ONE_RPC_URL=https://arb1.arbitrum.io/rpc
PRIVATE_KEY=your_private_key_for_testing
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 2. Database Setup with Docker (Recommended)

```bash
# Create docker-compose.yml for development
cat > docker-compose.dev.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.3
    container_name: rwalandchain-postgres
    environment:
      POSTGRES_DB: rwalandchain
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: rwalandchain-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  ipfs:
    image: ipfs/kubo:latest
    container_name: rwalandchain-ipfs
    ports:
      - "4001:4001"
      - "5001:5001"
      - "8080:8080"
    volumes:
      - ipfs_data:/data/ipfs
    environment:
      - IPFS_PROFILE=server
    healthcheck:
      test: ["CMD", "ipfs", "id"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  redis_data:
  ipfs_data:
EOF

# Create database initialization script
cat > init-db.sql << 'EOF'
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create additional databases for testing
CREATE DATABASE rwalandchain_test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE rwalandchain TO postgres;
GRANT ALL PRIVILEGES ON DATABASE rwalandchain_test TO postgres;
EOF

# Start services
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Check service health
docker-compose -f docker-compose.dev.yml ps
```

### 3. Install Dependencies and Setup

```bash
# Install dependencies
pnpm install

# Verify TypeScript compilation
pnpm run type-check

# Run linting
pnpm run lint

# Format code
pnpm run format
```

### 4. Database Migration and Seeding

```bash
# Run database migrations
pnpm run migration:run

# Verify migration status
pnpm run migration:show

# Seed database with test data
pnpm run seed

# Verify database setup
psql -h localhost -U postgres -d rwalandchain -c "\dt"
```

## 🧪 Testing the Application

### 1. Start the Development Server

```bash
# Start in development mode with hot reload
pnpm run start:dev

# Or start in debug mode
pnpm run start:debug
```

**Expected Output:**
```
🚀 RwaLandChain Backend Server Started!

📍 Server URL: http://localhost:3001
📚 API Documentation: http://localhost:3001/api
🔧 Environment: development
📊 Health Check: http://localhost:3001/api/health

🌟 Ready to serve requests!
```

### 2. Health Check Verification

```bash
# Test simple health check
curl http://localhost:3001/api/health/simple

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345,
  "version": "2.0.0",
  "environment": "development"
}

# Test comprehensive health check
curl http://localhost:3001/api/health

# Test detailed health information
curl http://localhost:3001/api/health/detailed
```

### 3. API Documentation Testing

Open your browser and navigate to:
- **Swagger UI**: http://localhost:3001/api
- **API Documentation**: Interactive testing interface

### 4. Authentication Testing

```bash
# Test user registration
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }'

# Expected response:
{
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "role": "user",
    "status": "active"
  },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token"
}

# Test user login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Test protected endpoint (replace TOKEN with actual token)
curl -X GET http://localhost:3001/api/users/me \
  -H "Authorization: Bearer TOKEN"
```

### 5. LAIS (Land Parcel) Testing

```bash
# Get all land parcels
curl http://localhost:3001/api/lais/parcels

# Get land parcel statistics
curl http://localhost:3001/api/lais/statistics

# Search land parcels
curl -X POST http://localhost:3001/api/lais/parcels/search \
  -H "Content-Type: application/json" \
  -d '{
    "landUse": "residential",
    "district": "Kigali"
  }'

# Get nearby parcels (spatial query)
curl "http://localhost:3001/api/lais/parcels/nearby/-1.9441/30.0619/1000"
```

### 6. Notification System Testing

```bash
# Get notifications (requires authentication)
curl -X GET http://localhost:3001/api/notifications \
  -H "Authorization: Bearer TOKEN"

# Create a test notification
curl -X POST http://localhost:3001/api/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test notification",
    "type": "info",
    "priority": "medium"
  }'
```

### 7. IPFS Integration Testing

```bash
# Test IPFS upload (requires multipart form data)
curl -X POST http://localhost:3001/api/ipfs/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@test-document.pdf"

# Expected response:
{
  "hash": "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "size": 12345,
  "url": "https://ipfs.io/ipfs/QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}

# Test IPFS retrieval
curl http://localhost:3001/api/ipfs/QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## 🔍 Advanced Testing

### 1. Database Testing

```bash
# Connect to database and verify data
psql -h localhost -U postgres -d rwalandchain

-- Check users table
SELECT id, email, role, status FROM users LIMIT 5;

-- Check land parcels with spatial data
SELECT id, title, land_use, ST_AsText(location) as location FROM land_parcels LIMIT 5;

-- Check notifications
SELECT id, title, type, priority, created_at FROM notifications LIMIT 5;

-- Verify PostGIS functionality
SELECT PostGIS_Version();
```

### 2. Redis Testing

```bash
# Connect to Redis and check data
redis-cli -h localhost -p 6379

# Check cached data
KEYS *
GET cache:some-key

# Check session data
KEYS sess:*
```

### 3. Performance Testing

```bash
# Install Apache Bench for load testing
sudo apt-get install apache2-utils

# Test health endpoint performance
ab -n 1000 -c 10 http://localhost:3001/api/health/simple

# Test API endpoint performance
ab -n 100 -c 5 http://localhost:3001/api/lais/parcels
```

### 4. Error Handling Testing

```bash
# Test invalid authentication
curl -X GET http://localhost:3001/api/users/me \
  -H "Authorization: Bearer invalid-token"

# Test invalid data
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "weak"
  }'

# Test rate limiting
for i in {1..150}; do
  curl http://localhost:3001/api/health/simple
done
```

## 🧪 Automated Testing

### 1. Unit Tests

```bash
# Run unit tests
pnpm run test

# Run tests with coverage
pnpm run test:coverage

# Run tests in watch mode
pnpm run test:watch
```

### 2. End-to-End Tests

```bash
# Run E2E tests
pnpm run test:e2e

# Run specific test suite
pnpm run test:e2e -- --testNamePattern="Auth"
```

### 3. Integration Tests

```bash
# Test database integration
pnpm run test -- --testPathPattern="database"

# Test API integration
pnpm run test -- --testPathPattern="api"
```

## 📊 Monitoring and Debugging

### 1. Log Analysis

```bash
# View application logs
tail -f logs/combined.log

# View error logs only
tail -f logs/error.log

# Search for specific errors
grep "ERROR" logs/combined.log | tail -20
```

### 2. Database Monitoring

```bash
# Monitor database connections
psql -h localhost -U postgres -d rwalandchain -c "
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  query
FROM pg_stat_activity 
WHERE datname = 'rwalandchain';
"

# Check database size
psql -h localhost -U postgres -d rwalandchain -c "
SELECT 
  pg_size_pretty(pg_database_size('rwalandchain')) as database_size;
"
```

### 3. Redis Monitoring

```bash
# Monitor Redis performance
redis-cli -h localhost -p 6379 INFO stats

# Monitor Redis memory usage
redis-cli -h localhost -p 6379 INFO memory
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps postgres

# Check database logs
docker-compose -f docker-compose.dev.yml logs postgres

# Restart database
docker-compose -f docker-compose.dev.yml restart postgres
```

#### 2. Redis Connection Issues
```bash
# Check Redis status
docker-compose -f docker-compose.dev.yml ps redis

# Test Redis connection
redis-cli -h localhost -p 6379 ping
```

#### 3. Migration Issues
```bash
# Reset database (WARNING: This will delete all data)
pnpm run schema:drop
pnpm run migration:run
pnpm run seed
```

#### 4. Port Conflicts
```bash
# Check what's using port 3001
lsof -i :3001

# Kill process using port
kill -9 $(lsof -t -i:3001)
```

#### 5. Permission Issues
```bash
# Fix file permissions
chmod +x scripts/*.sh

# Fix log directory permissions
mkdir -p logs
chmod 755 logs
```

## 📈 Production Readiness Checklist

### Before Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Logging properly set up
- [ ] Health checks working
- [ ] Error handling tested
- [ ] Performance benchmarks met
- [ ] Security audit completed

### Deployment Commands
```bash
# Build for production
pnpm run build

# Start production server
pnpm run start:prod

# Run production health check
curl http://localhost:3001/api/health
```

## 🎯 Success Criteria

Your backend is working correctly if:

1. ✅ **Health checks** return status "ok"
2. ✅ **Database** connections are established
3. ✅ **Redis** caching is working
4. ✅ **Authentication** endpoints work
5. ✅ **LAIS** endpoints return data
6. ✅ **Swagger documentation** is accessible
7. ✅ **All tests** are passing
8. ✅ **Logs** show no errors
9. ✅ **Performance** meets requirements
10. ✅ **Security** measures are active

---

**🎉 Congratulations!** Your RwaLandChain backend is now fully tested and running! 

For additional support, check the logs, review the API documentation, or refer to the troubleshooting section above.

