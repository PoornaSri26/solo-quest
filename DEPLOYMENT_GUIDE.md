# Solo Quest Deployment Guide

This guide covers deploying Solo Quest using Docker for production and development environments.

## Prerequisites

- Docker and Docker Compose installed
- Git
- Domain name (for production deployment)
- SSL certificates (for HTTPS)

## Quick Start

### Development Environment

```bash
# Clone the repository
git clone https://github.com/PoornaSri26/solo-quest.git
cd solo-quest

# Build and start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:5173
# Backend: http://localhost:5000
# Database: localhost:5432
# Redis: localhost:6379
```

### Production Environment

```bash
# Build the frontend first
npm run build

# Start production services
docker-compose -f docker-compose.yml up -d

# Access the application
# Frontend: http://localhost:80
# Backend API: http://localhost:80/api/
```

## Environment Configuration

Create a `.env` file in the `server/` directory:

```env
DATABASE_URL=postgresql://soloquest:soloquestpassword@db:5432/soloquest
JWT_SECRET=your-secure-jwt-secret-at-least-16-characters
REDIS_URL=redis://redis:6379
PORT=5000
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## Services

### Backend (Node.js/Express)
- Port: 5000
- Database: PostgreSQL
- Cache: Redis
- Features: REST API, WebSocket support, authentication

### Frontend (React/Vite)
- Port: 5173 (dev), 80 (production via nginx)
- Build: Static files served by nginx
- Features: SPA with client-side routing

### Database (PostgreSQL)
- Port: 5432
- Volume: Persistent data storage
- Backup: Automated backups recommended

### Redis
- Port: 6379
- Features: Caching, rate limiting, session storage

### Nginx
- Ports: 80 (HTTP), 443 (HTTPS)
- Features: Reverse proxy, SSL termination, static file serving

## SSL/HTTPS Setup

### Using Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./certs/

# Update nginx.conf to use SSL
# Uncomment the HTTPS server block
```

### Manual SSL Setup

1. Purchase SSL certificate from provider
2. Place certificates in `./certs/` directory
3. Update `nginx.conf` with certificate paths
4. Restart nginx: `docker-compose restart nginx`

## Database Management

### Initial Setup

```bash
# Access the backend container
docker-compose exec backend bash

# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Backups

```bash
# Backup database
docker-compose exec db pg_dump -U soloquest soloquest > backup.sql

# Restore database
docker-compose exec -T db psql -U soloquest soloquest < backup.sql
```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec db psql -U soloquest soloquest

# View tables
\dt

# Exit PostgreSQL
\q
```

## Monitoring

### Health Checks

```bash
# Check service health
curl http://localhost:5000/health

# Check all containers
docker-compose ps
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
docker-compose logs -f redis
```

### Performance Monitoring

- Monitor CPU/memory usage: `docker stats`
- Check disk space: `docker system df`
- View container resource usage: `docker inspect <container_id>`

## Scaling

### Horizontal Scaling

```bash
# Scale backend services
docker-compose up -d --scale backend=3

# Configure load balancer in nginx
# Update upstream backend block with multiple servers
```

### Vertical Scaling

- Increase Docker container resources in `docker-compose.yml`
- Adjust database connection pool size
- Optimize Redis memory settings

## Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs <service>

# Rebuild containers
docker-compose down
docker-compose up -d --build
```

**Database connection errors:**
```bash
# Check if database is ready
docker-compose exec db pg_isready -U soloquest

# Restart database
docker-compose restart db
```

**Port conflicts:**
```bash
# Change ports in docker-compose.yml
# Update ports section for conflicting services
```

**SSL certificate errors:**
```bash
# Verify certificate paths
ls -la ./certs/

# Check nginx configuration
docker-compose exec nginx nginx -t
```

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **Strong Secrets**: Use strong JWT secrets and database passwords
3. **SSL/TLS**: Always use HTTPS in production
4. **Firewall**: Configure firewall rules to restrict access
5. **Updates**: Keep Docker images and dependencies updated
6. **Backups**: Regular database backups
7. **Monitoring**: Set up monitoring and alerting

## Production Checklist

- [ ] Set strong environment variables
- [ ] Configure SSL certificates
- [ ] Set up database backups
- [ ] Configure monitoring and logging
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure CDN for static assets
- [ ] Set up load balancing if needed
- [ ] Configure firewall rules
- [ ] Test disaster recovery procedures
- [ ] Set up automated security updates

## CI/CD Integration

### GitHub Actions

The project includes a CI pipeline in `.github/workflows/ci.yml` that:
- Runs tests on push/PR
- Builds frontend and backend
- Enforces test coverage thresholds

### Deployment Pipeline

```bash
# Build and test
npm run build
npm test

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

## Support

For deployment issues:
- Check logs: `docker-compose logs`
- Review configuration files
- Consult service documentation
- Open GitHub issue for persistent problems