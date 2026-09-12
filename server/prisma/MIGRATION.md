# PostgreSQL Migration Guide

This guide explains how to migrate from SQLite to PostgreSQL for production deployment.

## Why PostgreSQL?

PostgreSQL offers several advantages over SQLite for production:

- **Better concurrency**: Multi-version concurrency control (MVCC)
- **Scalability**: Handles multiple connections efficiently
- **Advanced features**: Full-text search, JSON support, advanced indexing
- **Replication**: Built-in replication for high availability
- **Performance**: Optimized for complex queries and large datasets
- **Security**: Row-level security, robust user management

## Migration Steps

### 1. Update Database Provider

The current schema uses SQLite (`provider = "sqlite"`). We have a PostgreSQL-ready schema at `schema.postgres.prisma`.

### 2. Set Up PostgreSQL Database

#### Option A: Using Docker Compose (Local)

The `docker-compose.yml` already includes PostgreSQL:

```yaml
db:
  image: postgres:15-alpine
  environment:
    - POSTGRES_DB=soloquest
    - POSTGRES_USER=soloquest
    - POSTGRES_PASSWORD=soloquestpassword
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

Start the database:

```bash
docker-compose up -d db
```

#### Option B: Using Managed Service (Production)

Use a managed PostgreSQL service like:
- AWS RDS
- Google Cloud SQL
- Azure Database for PostgreSQL
- Supabase
- Neon

### 3. Update Environment Variables

Update your `.env` file:

```bash
# For Docker Compose
DATABASE_URL="postgresql://soloquest:soloquestpassword@db:5432/soloquest"

# For local PostgreSQL
DATABASE_URL="postgresql://soloquest:your-password@localhost:5432/soloquest"

# For managed service
DATABASE_URL="postgresql://user:password@host:port/database"
```

### 4. Generate Prisma Client

```bash
cd server
npx prisma generate
```

### 5. Create Database Migration

```bash
# Create initial migration
npx prisma migrate dev --name init

# Or for production
npx prisma migrate deploy
```

### 6. Seed Data (Optional)

If you have existing data in SQLite, you'll need to migrate it:

```bash
# Export SQLite data
npx prisma db pull

# Convert to PostgreSQL format
# (This may require manual conversion for complex data)
```

### 7. Verify Migration

```bash
# Open Prisma Studio to verify data
npx prisma studio

# Or run a simple query
npx prisma db execute --stdin <<EOF
SELECT COUNT(*) FROM "User";
EOF
```

## Schema Differences

### SQLite vs PostgreSQL

The main differences are:

1. **Database Provider**
   - SQLite: `provider = "sqlite"`
   - PostgreSQL: `provider = "postgresql"`

2. **URL Format**
   - SQLite: `file:./dev.db`
   - PostgreSQL: `postgresql://user:password@host:port/database`

3. **Connection Pooling**
   - PostgreSQL supports connection pooling natively
   - SQLite is file-based, no connection pooling needed

### Current Schema Compatibility

The current schema is already compatible with PostgreSQL because:

- We use string types instead of enums (SQLite limitation)
- We use standard indexes
- We use UUID primary keys
- We use standard DateTime types

No schema changes are required beyond updating the provider.

## Connection Pooling

For production, use connection pooling with PostgreSQL:

### PgBouncer (Recommended)

```yaml
# docker-compose.yml
pgbouncer:
  image: pgbouncer/pgbouncer
  environment:
    - DATABASES_HOST=db
    - DATABASES_PORT=5432
    - DATABASES_USER=soloquest
    - DATABASES_PASSWORD=soloquestpassword
    - DATABASES_DBNAME=soloquest
    - POOL_MODE=transaction
    - MAX_CLIENT_CONN=100
```

### Prisma Connection Pooling

Update `server/src/index.ts`:

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
  log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Connection pooling configuration
  // Prisma handles this automatically with PostgreSQL
});
```

## Performance Optimization

### Indexes

The current schema includes these indexes:

```prisma
@@index([userId, status])
@@index([userId, gateId])
@@index([userId, completedAt])
```

Consider adding more indexes based on query patterns:

```prisma
model Quest {
  // ... existing fields

  @@index([userId, status])
  @@index([userId, gateId])
  @@index([userId, completedAt])
  @@index([rank]) // Add for rank-based queries
  @@index([createdAt]) // Add for time-based queries
}
```

### Query Optimization

Use `select` to limit returned fields:

```typescript
const quests = await prisma.quest.findMany({
  select: {
    id: true,
    title: true,
    rank: true,
    // Only select needed fields
  },
});
```

## Backup Strategy

### Automated Backups

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker exec solo-quest-db-1 pg_dump -U soloquest soloquest > "$BACKUP_DIR/soloquest_$DATE.sql"

# Keep last 7 days
find $BACKUP_DIR -name "soloquest_*.sql" -mtime +7 -delete
```

### Point-in-Time Recovery

PostgreSQL supports point-in-time recovery (PITR) for more granular backup and restore.

## Monitoring

### Health Checks

Add PostgreSQL health check:

```typescript
async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}
```

### Performance Monitoring

Use tools like:
- pg_stat_statements (built-in)
- pgAdmin
- DataDog
- New Relic

## Rollback Plan

If you need to rollback to SQLite:

1. Backup PostgreSQL data
2. Restore SQLite database
3. Update `.env` to use SQLite URL
4. Regenerate Prisma client
5. Restart application

```bash
# Restore SQLite
cp dev.db.backup dev.db

# Update .env
DATABASE_URL="file:./dev.db"

# Regenerate
npx prisma generate
```

## Testing Migration

### Staging Environment

Always test migration in a staging environment first:

1. Copy production data to staging
2. Run migration on staging
3. Test all features
4. Monitor performance
5. Then migrate production

### Migration Script

```bash
#!/bin/bash
# migration.sh

echo "Starting PostgreSQL migration..."

# Backup current SQLite database
cp server/prisma/dev.db server/prisma/dev.db.backup

# Update .env
sed -i 's|DATABASE_URL="file:./dev.db"|DATABASE_URL="postgresql://soloquest:soloquestpassword@localhost:5432/soloquest"|' server/.env

# Generate Prisma client
cd server
npx prisma generate

# Run migration
npx prisma migrate deploy

# Restart application
pm2 restart solo-quest

echo "Migration complete!"
```

## Troubleshooting

### Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U soloquest -d soloquest

# Check PostgreSQL logs
docker logs solo-quest-db-1
```

### Migration Errors

```bash
# Reset migration (development only)
npx prisma migrate reset

# Force sync schema (development only)
npx prisma db push
```

### Performance Issues

```bash
# Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

# Check index usage
SELECT * FROM pg_stat_user_indexes;
```

## Checklist

- [ ] Set up PostgreSQL database
- [ ] Update environment variables
- [ ] Update Prisma schema provider
- [ ] Generate Prisma client
- [ ] Create and run migration
- [ ] Migrate existing data (if any)
- [ ] Test all application features
- [ ] Set up connection pooling
- [ ] Configure backup strategy
- [ ] Set up monitoring
- [ ] Document rollback procedure
- [ ] Test in staging environment
- [ ] Deploy to production

## Additional Resources

- [Prisma PostgreSQL Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker PostgreSQL](https://hub.docker.com/_/postgres)
- [AWS RDS PostgreSQL](https://aws.amazon.com/rds/postgresql/)
