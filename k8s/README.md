# Kubernetes Deployment Configuration

This directory contains Kubernetes manifests for deploying Solo Quest to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (minikube, kind, GKE, EKS, AKS, etc.)
- kubectl configured to talk to your cluster
- Helm (optional, for cert-manager)
- cert-manager (for TLS certificates)

## Files

- `backend-deployment.yaml`: Backend deployment and service
- `frontend-deployment.yaml`: Frontend deployment and service
- `postgres-deployment.yaml`: PostgreSQL deployment, service, and PVC
- `redis-deployment.yaml`: Redis deployment, service, and PVC
- `secrets.yaml`: Kubernetes secrets for sensitive data
- `configmap.yaml`: Configuration for environment variables
- `ingress.yaml`: Ingress configuration for routing
- `hpa.yaml`: Horizontal Pod Autoscaler configuration

## Deployment Steps

### 1. Update Secrets

Edit `secrets.yaml` and replace placeholder values with actual secure values:

```yaml
stringData:
  database-url: "postgresql://soloquest:YOUR_SECURE_PASSWORD@postgres-service:5432/soloquest"
  jwt-secret: "YOUR_SECURE_JWT_SECRET_AT_LEAST_16_CHARACTERS"
  postgres-user: "soloquest"
  postgres-password: "YOUR_SECURE_POSTGRES_PASSWORD"
```

### 2. Update Ingress Domain

Edit `ingress.yaml` and replace `solo-quest.example.com` with your actual domain:

```yaml
spec:
  tls:
  - hosts:
    - your-actual-domain.com
    secretName: solo-quest-tls
  rules:
  - host: your-actual-domain.com
```

### 3. Apply Configuration

```bash
# Apply secrets and configmaps
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml

# Apply database and cache
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml

# Wait for database to be ready
kubectl wait --for=condition=ready pod -l component=postgres --timeout=300s
kubectl wait --for=condition=ready pod -l component=redis --timeout=300s

# Run database migrations
kubectl exec -it deployment/postgres -- npx prisma migrate deploy

# Apply backend and frontend
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# Apply HPA
kubectl apply -f k8s/hpa.yaml

# Apply ingress (if using)
kubectl apply -f k8s/ingress.yaml
```

### 4. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -l app=solo-quest

# Check services
kubectl get services -l app=solo-quest

# Check HPA status
kubectl get hpa

# Check ingress (if using)
kubectl get ingress solo-quest-ingress
```

## Architecture

```
┌─────────────┐
│   Ingress   │
└──────┬──────┘
       │
       ├─────────────┐
       │             │
┌──────▼──────┐ ┌───▼────────┐
│  Frontend   │ │  Backend   │
│  (Nginx)    │ │  (Express) │
└─────────────┘ └───┬────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
    ┌────▼────┐  ┌───▼────┐  ┌───▼────┐
    │ Postgres │  │  Redis │  │  Redis │
    │  (DB)    │  │ (Cache) │  │ (Rate) │
    └─────────┘  └────────┘  └────────┘
```

## Scaling

The deployment includes Horizontal Pod Autoscalers (HPA):

- **Backend**: 3-10 replicas based on CPU/memory
- **Frontend**: 2-5 replicas based on CPU/memory

You can adjust these in `hpa.yaml`.

## Storage

- **PostgreSQL**: 10Gi persistent storage
- **Redis**: 2Gi persistent storage

Adjust storage sizes in the respective deployment files.

## Monitoring

### Logs

```bash
# Backend logs
kubectl logs -l component=backend --tail=100 -f

# Frontend logs
kubectl logs -l component=frontend --tail=100 -f

# Database logs
kubectl logs -l component=postgres --tail=100 -f
```

### Health Checks

Both backend and frontend include liveness and readiness probes:

- **Liveness**: Checks if the container is running
- **Readiness**: Checks if the container is ready to serve traffic

### Metrics

Consider installing Prometheus and Grafana for monitoring:

```bash
# Install Prometheus Operator
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml
```

## Local Development with Minikube

```bash
# Start minikube
minikube start

# Enable ingress addon
minikube addons enable ingress

# Apply configurations
kubectl apply -f k8s/

# Get the ingress URL
minikube ingress list
```

## Troubleshooting

### Pods not starting

```bash
# Describe pod for details
kubectl describe pod <pod-name>

# Check pod logs
kubectl logs <pod-name>
```

### Database connection issues

```bash
# Check postgres pod is ready
kubectl get pods -l component=postgres

# Test connection
kubectl exec -it deployment/postgres -- psql -U soloquest -d soloquest
```

### Redis connection issues

```bash
# Check redis pod is ready
kubectl get pods -l component=redis

# Test connection
kubectl exec -it deployment/redis -- redis-cli ping
```

## Cleanup

```bash
# Delete all resources
kubectl delete -f k8s/

# Or delete by label
kubectl delete all -l app=solo-quest
kubectl delete pvc -l app=solo-quest
kubectl delete secrets solo-quest-secrets
kubectl delete configmap solo-quest-config
```

## Security Considerations

1. **Secrets**: Use proper secret management (e.g., AWS Secrets Manager, HashiCorp Vault)
2. **Network Policies**: Implement network policies to restrict pod-to-pod communication
3. **RBAC**: Configure proper Role-Based Access Control
4. **Image Security**: Use signed images and scan for vulnerabilities
5. **TLS**: Always use TLS in production (configure in ingress)

## Production Checklist

- [ ] Update all placeholder secrets with secure values
- [ ] Configure proper TLS certificates
- [ ] Set up proper monitoring and alerting
- [ ] Configure backup strategy for PostgreSQL
- [ ] Implement network policies
- [ ] Set up log aggregation (e.g., ELK, Loki)
- [ ] Configure proper resource limits based on load testing
- [ ] Set up CI/CD pipeline for automated deployments
- [ ] Configure proper ingress controller with rate limiting
- [ ] Implement database backup and restore procedures
