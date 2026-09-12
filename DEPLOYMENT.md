# Deployment Guide

This guide covers deploying Solo Quest to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Redis Setup](#redis-setup)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker and Docker Compose
- kubectl (for Kubernetes deployment)
- PostgreSQL 15+
- Redis 7+
- Node.js 18+
- Domain name (for production)

## Environment Setup

### Production Environment Variables

Create a secure `.env` file:

```env
# Database
DATABASE_URL="postgresql://soloquest:secure_password@postgres-service:5432/soloquest"

# Authentication
JWT_SECRET="generate-secure-random-secret-min-16-chars"

# Redis
REDIS_URL="redis://redis-service:6379"

# Server
PORT=5000
NODE_ENV="production"
LOG_LEVEL="info"

# Frontend
VITE_API_URL="https://api.yourdomain.com"
```

### Security Best Practices

1. **Generate secure secrets**:
   ```bash
   # Generate JWT secret
   openssl rand -base64 32

   # Generate database password
   openssl rand -base64 24
   ```

2. **Use environment-specific configs**:
   - Development: SQLite + local Redis
   - Staging: PostgreSQL + Redis
   - Production: PostgreSQL + Redis + SSL

3. **Never commit secrets**:
   - Use `.env.example` as template
   - Add `.env` to `.gitignore`
   - Use secret management (AWS Secrets Manager, HashiCorp Vault)

## Database Setup

### PostgreSQL Migration

```bash
# Switch to PostgreSQL schema
cp server/prisma/schema.postgres.prisma server/prisma/schema.prisma

# Update DATABASE_URL in .env
DATABASE_URL="postgresql://user:password@host:5432/soloquest"

# Generate Prisma client
cd server
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed initial data (optional)
npx prisma db seed
```

### Connection Pooling

Configure connection pool in `server/src/index.ts`:

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
  log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
```

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U soloquest soloquest > backup_$DATE.sql

# Upload to S3 or other storage
aws s3 cp backup_$DATE.sql s3://backups/soloquest/
```

## Redis Setup

### Installation

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Configuration

Edit `redis.conf`:

```
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Monitoring

```bash
# Check Redis status
redis-cli ping

# Monitor Redis
redis-cli monitor

# Check memory usage
redis-cli info memory
```

## Docker Deployment

### Quick Start

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Production Docker Compose

Update `docker-compose.yml` for production:

```yaml
version: '3.8'

services:
  backend:
    build: ./server
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: always

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=soloquest
      - POSTGRES_USER=soloquest
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: always

volumes:
  postgres_data:
  redis_data:
```

### Deploy to Cloud

#### AWS ECS

```bash
# Build and push images
docker build -t solo-quest-backend ./server
docker tag solo-quest-backend:latest your-registry.dkr.ecr.amazonaws.com/solo-quest-backend:latest
docker push your-registry.dkr.ecr.amazonaws.com/solo-quest-backend:latest

# Deploy using ECS task definition
aws ecs update-service --cluster solo-quest --service backend --force-new-deployment
```

#### Google Cloud Run

```bash
# Deploy backend
gcloud run deploy solo-quest-backend \
  --image gcr.io/PROJECT-ID/solo-quest-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Deploy frontend
gcloud run deploy solo-quest-frontend \
  --image gcr.io/PROJECT-ID/solo-quest-frontend \
  --platform managed \
  --region us-central1
```

## Kubernetes Deployment

### Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Install kubectl autocomplete
echo 'source <(kubectl completion bash)' >>~/.bashrc
```

### Deploy to Kubernetes

```bash
# Update secrets
kubectl apply -f k8s/secrets.yaml

# Apply configuration
kubectl apply -f k8s/configmap.yaml

# Deploy database and cache
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml

# Wait for database to be ready
kubectl wait --for=condition=ready pod -l component=postgres --timeout=300s

# Deploy backend and frontend
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# Apply autoscaling
kubectl apply -f k8s/hpa.yaml

# Apply ingress (if using)
kubectl apply -f k8s/ingress.yaml
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -l app=solo-quest

# Check services
kubectl get services -l app=solo-quest

# Check HPA status
kubectl get hpa

# Check ingress
kubectl get ingress solo-quest-ingress

# View logs
kubectl logs -l component=backend --tail=100 -f
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment solo-quest-backend --replicas=5

# Check HPA metrics
kubectl describe hpa solo-quest-backend-hpa
```

## CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd server && npm install
          cd .. && npm install
      - name: Run tests
        run: cd server && npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
        run: |
          docker build -t solo-quest-backend ./server
          docker build -t solo-quest-frontend .
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push solo-quest-backend
          docker push solo-quest-frontend

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/solo-quest-backend backend=solo-quest-backend
          kubectl set image deployment/solo-quest-frontend frontend=solo-quest-frontend
```

## Monitoring

### Health Checks

```bash
# Backend health
curl https://api.yourdomain.com/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "services": {
    "database": "connected",
    "rateLimiter": "connected",
    "cache": "connected"
  }
}
```

### Logging

View logs in real-time:

```bash
# Docker logs
docker-compose logs -f backend

# Kubernetes logs
kubectl logs -f deployment/solo-quest-backend

# Specific pod
kubectl logs -f <pod-name>
```

### Metrics Setup

Install Prometheus and Grafana:

```bash
# Add Prometheus Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80
```

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check PostgreSQL pod
kubectl get pods -l component=postgres

# Check PostgreSQL logs
kubectl logs -l component=postgres

# Test connection
kubectl exec -it deployment/postgres -- psql -U soloquest -d soloquest
```

#### Redis Connection Failed

```bash
# Check Redis pod
kubectl get pods -l component=redis

# Test Redis connection
kubectl exec -it deployment/redis -- redis-cli ping
```

#### High Memory Usage

```bash
# Check resource usage
kubectl top pods

# Increase limits in deployment yaml
resources:
  limits:
    memory: "1Gi"
```

#### Pods Not Starting

```bash
# Describe pod for details
kubectl describe pod <pod-name>

# Check events
kubectl get events --sort-by='.lastTimestamp'
```

### Performance Issues

#### Slow API Response

1. Check cache hit rate in health endpoint
2. Review database query performance
3. Check Redis connection status
4. Verify HPA is scaling correctly

#### High CPU Usage

1. Check rate limiting effectiveness
2. Review WebSocket connection count
3. Optimize database queries
4. Consider adding more replicas

## Security Hardening

### Network Policies

Create network policies to restrict pod-to-pod communication:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: solo-quest-network-policy
spec:
  podSelector:
    matchLabels:
      app: solo-quest
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: ingress-nginx
  egress:
  - to:
    - podSelector:
        matchLabels:
          component: postgres
    - podSelector:
        matchLabels:
          component: redis
```

### Secrets Management

Use Kubernetes secrets or external secret managers:

```bash
# Create secret from file
kubectl create secret generic solo-quest-secrets \
  --from-env-file=.env

# Reference in deployment
envFrom:
  - secretRef:
      name: solo-quest-secrets
```

## Backup and Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

kubectl exec deployment/postgres -- pg_dump -U soloquest soloquest > $BACKUP_DIR/soloquest_$DATE.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/soloquest_$DATE.sql s3://backups/soloquest/

# Keep last 7 days
find $BACKUP_DIR -name "soloquest_*.sql" -mtime +7 -delete
```

### Disaster Recovery

```bash
# Restore from backup
kubectl exec -i deployment/postgres -- psql -U soloquest soloquest < backup.sql

# Or use kubectl cp
kubectl cp backup.sql deployment/postgres:/tmp/backup.sql
kubectl exec deployment/postgres -- psql -U soloquest soloquest -f /tmp/backup.sql
```

## Maintenance

### Database Maintenance

```bash
# Vacuum analyze
kubectl exec deployment/postgres -- psql -U soloquest -c "VACUUM ANALYZE;"

# Reindex
kubectl exec deployment/postgres -- psql -U soloquest -c "REINDEX DATABASE soloquest;"
```

### Application Updates

```bash
# Rolling update
kubectl set image deployment/solo-quest-backend backend=solo-quest-backend:v2.0.0

# Rollback if needed
kubectl rollout undo deployment/solo-quest-backend

# Check rollout status
kubectl rollout status deployment/solo-quest-backend
```

## Support

For deployment issues:
- Check logs: `kubectl logs` or `docker-compose logs`
- Health check: `curl https://api.yourdomain.com/health`
- Review monitoring dashboards
- Check GitHub issues for known problems

For enterprise support: poornasri.n24@gmail.com
