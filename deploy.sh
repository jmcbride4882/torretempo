#!/bin/bash

##############################################################################
# Torre Tempo - VPS Deployment Script
# Deploys the application to production VPS at time.lsltgroup.es
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="root@time.lsltgroup.es"
VPS_PATH="/opt/torre-tempo"
DOMAIN="time.lsltgroup.es"

##############################################################################
# Helper functions
##############################################################################

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

##############################################################################
# Pre-flight checks
##############################################################################

print_header "Torre Tempo - VPS Deployment"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error ".env.production not found!"
    print_info "Copy .env.production template and configure secrets:"
    print_info "  cp .env.production.template .env.production"
    print_info "  vim .env.production"
    exit 1
fi

# Check if secrets have been changed
if grep -q "CHANGE_ME" .env.production; then
    print_error "Default secrets detected in .env.production!"
    print_info "Generate secure secrets with: openssl rand -base64 64"
    exit 1
fi

print_success "Pre-flight checks passed"

##############################################################################
# SSH connectivity check
##############################################################################

print_header "Checking VPS Connectivity"

if ! ssh -o ConnectTimeout=5 $VPS_HOST "echo 'SSH OK'" > /dev/null 2>&1; then
    print_error "Cannot connect to VPS at $VPS_HOST"
    exit 1
fi

print_success "VPS connection OK"

##############################################################################
# Create deployment archive
##############################################################################

print_header "Creating Deployment Archive"

ARCHIVE_NAME="torre-tempo-$(date +%Y%m%d-%H%M%S).tar.gz"

print_info "Building archive: $ARCHIVE_NAME"

tar -czf "/tmp/$ARCHIVE_NAME" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='coverage' \
    --exclude='.turbo' \
    --exclude='*.log' \
    .

print_success "Archive created: $(du -h /tmp/$ARCHIVE_NAME | cut -f1)"

##############################################################################
# Upload to VPS
##############################################################################

print_header "Uploading to VPS"

scp "/tmp/$ARCHIVE_NAME" "$VPS_HOST:/tmp/" > /dev/null 2>&1

print_success "Upload complete"

# Cleanup local archive
rm "/tmp/$ARCHIVE_NAME"

##############################################################################
# Deploy on VPS
##############################################################################

print_header "Deploying on VPS"

ssh $VPS_HOST << 'EOF'
set -e

VPS_PATH="/opt/torre-tempo"
ARCHIVE_NAME=$(ls -t /tmp/torre-tempo-*.tar.gz | head -1)
BACKUP_PATH="/opt/torre-tempo-backup-$(date +%Y%m%d-%H%M%S)"

echo "→ Stopping existing containers..."
cd $VPS_PATH 2>/dev/null || true
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

echo "→ Creating backup..."
if [ -d "$VPS_PATH" ]; then
    cp -r $VPS_PATH $BACKUP_PATH
    echo "  Backup saved: $BACKUP_PATH"
fi

echo "→ Extracting new version..."
mkdir -p $VPS_PATH
cd $VPS_PATH
tar -xzf $ARCHIVE_NAME
rm $ARCHIVE_NAME

echo "→ Copying production environment..."
if [ -f "$BACKUP_PATH/.env" ]; then
    cp $BACKUP_PATH/.env .env
else
    cp .env.production .env
fi

echo "→ Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "→ Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

echo "→ Waiting for services to be ready..."
sleep 10

echo "→ Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T api npm run db:migrate:deploy

echo "→ Checking container health..."
docker-compose -f docker-compose.prod.yml ps

echo "✓ Deployment complete!"
EOF

print_success "Deployment complete"

##############################################################################
# SSL Certificate Setup (if needed)
##############################################################################

print_header "SSL Certificate Check"

ssh $VPS_HOST "test -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null && {
    print_success "SSL certificate exists"
} || {
    print_warning "SSL certificate not found"
    print_info "Setting up Let's Encrypt certificate..."
    
    ssh $VPS_HOST << EOF
cd /opt/torre-tempo
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@$DOMAIN \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

docker-compose -f docker-compose.prod.yml restart nginx
EOF

    print_success "SSL certificate installed"
}

##############################################################################
# Health checks
##############################################################################

print_header "Running Health Checks"

print_info "Checking API health..."
sleep 5

if curl -sf "https://$DOMAIN/health" > /dev/null; then
    print_success "API is healthy"
else
    print_error "API health check failed!"
    print_info "Check logs: ssh $VPS_HOST 'cd $VPS_PATH && docker-compose -f docker-compose.prod.yml logs api'"
    exit 1
fi

print_info "Checking web frontend..."
if curl -sf "https://$DOMAIN" > /dev/null; then
    print_success "Frontend is accessible"
else
    print_warning "Frontend check failed (may be normal if not built yet)"
fi

##############################################################################
# Summary
##############################################################################

print_header "Deployment Summary"

ssh $VPS_HOST << EOF
cd $VPS_PATH
echo "Container Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "Disk Usage:"
df -h /opt/torre-tempo
echo ""
echo "Database Status:"
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U torretempo -d torre_tempo_prod -c "SELECT COUNT(*) as tenant_count FROM tenants;" 2>/dev/null || echo "Database not seeded yet"
EOF

echo ""
print_success "Deployment successful! 🚀"
echo ""
print_info "Access your application:"
print_info "  URL: https://$DOMAIN"
print_info "  API: https://$DOMAIN/api/v1/health"
echo ""
print_info "Useful commands:"
print_info "  View logs: ssh $VPS_HOST 'cd $VPS_PATH && docker-compose -f docker-compose.prod.yml logs -f'"
print_info "  Restart:   ssh $VPS_HOST 'cd $VPS_PATH && docker-compose -f docker-compose.prod.yml restart'"
print_info "  Stop:      ssh $VPS_HOST 'cd $VPS_PATH && docker-compose -f docker-compose.prod.yml down'"
echo ""
