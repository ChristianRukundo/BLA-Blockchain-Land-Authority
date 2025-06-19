# 🏗️ RwaLandChain Backend

A comprehensive NestJS backend application for the RwaLandChain blockchain-powered land administration system.

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Navigate to backend directory
cd packages/backend

# Run the automated test setup (first time only)
./scripts/test-setup.sh

# For daily development, use the quick start script
./scripts/start-dev.sh
```

### Option 2: Manual Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your configuration

# 3. Start services with Docker
docker-compose -f docker-compose.dev.yml up -d

# 4. Run migrations
pnpm run migration:run

# 5. Seed database
pnpm run seed

# 6. Start development server
pnpm run start:dev
```

## 📋 Prerequisites

- **Node.js** 18+ and **pnpm**
- **Docker** and **Docker Compose**
- **PostgreSQL** 14+ with **PostGIS** extension
- **Redis** 6+
- **IPFS** node (optional, included in Docker setup)

## 🛠️ Available Scripts

### Development Scripts
```bash
pnpm run start:dev      # Start development server with hot reload
pnpm run start:debug    # Start in debug mode
pnpm run start:prod     # Start production server
```

### Testing Scripts
```bash
pnpm run test           # Run unit tests
pnpm run test:watch     # Run tests in watch mode
pnpm run test:coverage  # Run tests with coverage
pnpm run test:e2e       # Run end-to-end tests
```

### Database Scripts
```bash
pnpm run migration:run     # Run database migrations
pnpm run migration:revert  # Revert last migration
pnpm run migration:show    # Show migration status
pnpm run schema:drop       # Drop database schema
pnpm run seed             # Seed database with test data
```

### Code Quality Scripts
```bash
pnpm run lint          # Run ESLint
pnpm run lint:fix      # Fix ESLint issues
pnpm run format        # Format code with Prettier
pnpm run type-check    # TypeScript type checking
```

### Build Scripts
```bash
pnpm run build         # Build for production
pnpm run clean         # Clean build artifacts
```

## 🧪 Testing the Application

### 1. Automated Testing

```bash
# Run comprehensive API tests
./scripts/test-api.sh

# This will test:
# ✅ Health check endpoints
# ✅ Authentication flow
# ✅ User management
# ✅ Land parcel operations
# ✅ Notification system
# ✅ IPFS integration
# ✅ Error handling
# ✅ Performance metrics
```

### 2. Manual Testing

#### Health Checks
```bash
# Simple health check
curl http://localhost:3001/api/health/simple

# Comprehensive health check
curl http://localhost:3001/api/health

# Detailed system information
curl http://localhost:3001/api/health/detailed
```

#### Authentication Testing
```bash
# Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Use the returned token for authenticated requests
curl -X GET http://localhost:3001/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Land Parcel Testing
```bash
# Get all land parcels
curl http://localhost:3001/api/lais/parcels

# Get statistics
curl http://localhost:3001/api/lais/statistics

# Search parcels
curl -X POST http://localhost:3001/api/lais/parcels/search \
  -H "Content-Type: application/json" \
  -d '{
    "landUse": "residential",
    "district": "Kigali"
  }'

# Spatial query - get nearby parcels
curl "http://localhost:3001/api/lais/parcels/nearby/-1.9441/30.0619/1000"
```

### 3. API Documentation

Visit **http://localhost:3001/api** for interactive Swagger documentation where you can:
- 📖 View all available endpoints
- 🧪 Test API calls directly
- 📋 See request/response schemas
- 🔐 Test authentication flows

## 🏗️ Architecture Overview

### Core Modules

#### 🔐 Authentication Module
- JWT-based authentication
- Wallet address integration
- Role-based access control
- Password reset functionality

#### 👤 User Profile Module
- User management and profiles
- Wallet address verification
- Role and permission management

#### 🏞️ LAIS Module (Land Administration)
- Land parcel management with PostGIS
- Spatial queries and operations
- Cadastral data integration
- GeoJSON support

#### 📁 IPFS Module
- Decentralized file storage
- Document upload and retrieval
- Content addressing

#### 🔔 Notification Module
- Real-time notifications
- Email integration
- Priority-based messaging

#### ⚖️ Admin Module
- Multi-signature coordination
- Administrative actions
- Audit trail logging

#### 🏛️ Expropriation Module
- Expropriation process management
- Compensation tracking
- Legal document storage

### Database Schema

#### Core Tables
- `users` - User accounts and profiles
- `land_parcels` - Land parcel data with spatial information
- `notifications` - User notifications
- `admin_actions` - Administrative actions and approvals
- `expropriations` - Expropriation records

#### Spatial Features
- PostGIS integration for geographic data
- Spatial indexing for performance
- GeoJSON support for boundaries
- Proximity and intersection queries

## 🔧 Configuration

### Environment Variables

#### Database Configuration
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=rwalandchain
DB_LOGGING=true
```

#### Redis Configuration
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

#### JWT Configuration
```env
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d
```

#### Application Configuration
```env
NODE_ENV=development
PORT=3001
API_PREFIX=api
API_VERSION=v1
LOG_LEVEL=debug
```

#### Feature Flags
```env
ENABLE_SWAGGER=true
ENABLE_METRICS=true
ENABLE_HEALTH_CHECK=true
HELMET_ENABLED=false
COMPRESSION_ENABLED=true
```

#### CORS Configuration
```env
CORS_ORIGIN=http://localhost:3000
```

#### Rate Limiting
```env
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

#### File Upload
```env
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx
```

#### IPFS Configuration
```env
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
```

## 📊 Monitoring and Logging

### Health Monitoring
- **Simple Health**: Basic server status
- **Comprehensive Health**: Database, Redis, and service status
- **Detailed Health**: Performance metrics and system information

### Logging
- Structured logging with Winston
- Log levels: error, warn, info, debug
- File-based logging with rotation
- Console logging for development

### Metrics
- Request/response metrics
- Database query performance
- Error tracking and reporting
- Custom business metrics

## 🔒 Security Features

### Authentication & Authorization
- JWT token-based authentication
- Refresh token rotation
- Role-based access control (RBAC)
- Wallet address verification

### API Security
- Rate limiting and throttling
- CORS configuration
- Helmet security headers
- Input validation and sanitization
- SQL injection prevention

### Data Protection
- Password hashing with bcrypt
- Sensitive data encryption
- Secure session management
- GDPR compliance considerations

## 🚀 Deployment

### Development Deployment
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Start application
pnpm run start:dev
```

### Production Deployment
```bash
# Build application
pnpm run build

# Start production server
pnpm run start:prod
```

### Docker Deployment
```bash
# Build Docker image
docker build -t rwalandchain-backend .

# Run container
docker run -p 3001:3001 rwalandchain-backend
```

## 🧪 Testing Strategy

### Unit Tests
- Service layer testing
- Controller testing
- Utility function testing
- Mock external dependencies

### Integration Tests
- Database integration
- API endpoint testing
- Service interaction testing
- External service mocking

### End-to-End Tests
- Complete user flows
- Authentication workflows
- Business process testing
- Performance validation

## 📈 Performance Optimization

### Database Optimization
- Spatial indexing for geographic queries
- Query optimization and analysis
- Connection pooling
- Read replicas for scaling

### Caching Strategy
- Redis caching for frequently accessed data
- Query result caching
- Session storage in Redis
- Cache invalidation strategies

### API Optimization
- Response compression
- Pagination for large datasets
- Efficient serialization
- Rate limiting for protection

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose -f docker-compose.dev.yml ps postgres

# View PostgreSQL logs
docker-compose -f docker-compose.dev.yml logs postgres

# Test connection
psql -h localhost -U postgres -d rwalandchain -c "SELECT version();"
```

#### Redis Connection Issues
```bash
# Check Redis status
docker-compose -f docker-compose.dev.yml ps redis

# Test Redis connection
redis-cli -h localhost -p 6379 ping
```

#### Migration Issues
```bash
# Check migration status
pnpm run migration:show

# Reset database (WARNING: Deletes all data)
pnpm run schema:drop
pnpm run migration:run
pnpm run seed
```

#### Port Conflicts
```bash
# Check what's using port 3001
lsof -i :3001

# Kill process using port
kill -9 $(lsof -t -i:3001)
```

### Debug Mode
```bash
# Start in debug mode
pnpm run start:debug

# Attach debugger on port 9229
# Use VS Code or Chrome DevTools
```

### Log Analysis
```bash
# View application logs
tail -f logs/combined.log

# View error logs only
tail -f logs/error.log

# Search for specific errors
grep "ERROR" logs/combined.log | tail -20
```

## 📚 API Documentation

### Interactive Documentation
- **Swagger UI**: http://localhost:3001/api
- **OpenAPI Spec**: http://localhost:3001/api-json

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh

#### User Management
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `GET /api/users` - Get all users (admin)

#### Land Parcels (LAIS)
- `GET /api/lais/parcels` - Get all land parcels
- `POST /api/lais/parcels` - Create land parcel
- `GET /api/lais/parcels/:id` - Get parcel by ID
- `PUT /api/lais/parcels/:id` - Update land parcel
- `POST /api/lais/parcels/search` - Search parcels
- `GET /api/lais/parcels/nearby/:lat/:lng/:radius` - Spatial search
- `GET /api/lais/statistics` - Get system statistics

#### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

#### IPFS
- `POST /api/ipfs/upload` - Upload file to IPFS
- `GET /api/ipfs/:hash` - Get file from IPFS

#### Health Monitoring
- `GET /api/health/simple` - Simple health check
- `GET /api/health` - Comprehensive health check
- `GET /api/health/detailed` - Detailed system information

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `pnpm run test`
5. Run linting: `pnpm run lint`
6. Submit a pull request

### Code Standards
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write comprehensive tests
- Document API changes
- Follow conventional commit messages

### Testing Requirements
- Unit tests for all services
- Integration tests for API endpoints
- E2E tests for critical user flows
- Minimum 80% code coverage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- 📧 Email: support@rwalandchain.com
- 📖 Documentation: [docs.rwalandchain.com](https://docs.rwalandchain.com)
- 🐛 Issues: [GitHub Issues](https://github.com/rwalandchain/backend/issues)

---

**🎉 Happy coding!** The RwaLandChain backend is designed to be robust, scalable, and developer-friendly. If you encounter any issues or have suggestions for improvements, please don't hesitate to reach out!

