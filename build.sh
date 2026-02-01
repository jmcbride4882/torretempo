#!/bin/bash

# Torre Tempo - Comprehensive Build Script
# This script checks prerequisites, installs dependencies, sets up the database, runs tests, and builds all apps.
# Keep this updated as the project evolves!

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Parse command line arguments
SKIP_TESTS=false
SKIP_BUILD=false
SKIP_DOCKER=false
SKIP_SEED=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        --help)
            echo "Torre Tempo Build Script"
            echo ""
            echo "Usage: ./build.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-tests    Skip running tests"
            echo "  --skip-build    Skip building apps"
            echo "  --skip-docker   Skip Docker checks and startup"
            echo "  --skip-seed     Skip database seeding"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Start build process
log_section "🚀 Torre Tempo Build Script"
log_info "Starting build process..."

# ============================================================================
# STEP 1: Check Prerequisites
# ============================================================================
log_section "📋 Step 1: Checking Prerequisites"

# Check Node.js version
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js 20 LTS."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    log_error "Node.js version 20 or higher is required. Current version: $(node -v)"
    exit 1
fi
log_success "Node.js $(node -v) installed"

# Check npm version
if ! command -v npm &> /dev/null; then
    log_error "npm is not installed."
    exit 1
fi
log_success "npm $(npm -v) installed"

# Check Docker (if not skipped)
if [ "$SKIP_DOCKER" = false ]; then
    if ! command -v docker &> /dev/null; then
        log_warning "Docker is not installed. Skipping Docker checks."
        SKIP_DOCKER=true
    else
        log_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') installed"
        
        if ! command -v docker-compose &> /dev/null; then
            log_warning "docker-compose is not installed. Skipping Docker Compose."
            SKIP_DOCKER=true
        else
            log_success "docker-compose $(docker-compose --version | cut -d' ' -f4 | tr -d ',') installed"
        fi
    fi
fi

# Check PostgreSQL client (optional but helpful)
if command -v psql &> /dev/null; then
    log_success "PostgreSQL client $(psql --version | cut -d' ' -f3) installed"
else
    log_warning "PostgreSQL client not found (optional)"
fi

# ============================================================================
# STEP 2: Environment Setup
# ============================================================================
log_section "🔧 Step 2: Environment Setup"

# Check if .env exists, if not copy from .env.example
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        log_info "Creating .env from .env.example..."
        cp .env.example .env
        log_success ".env file created"
        log_warning "⚠ Please update .env with your local configuration before running!"
    else
        log_error ".env.example not found"
        exit 1
    fi
else
    log_success ".env file exists"
fi

# ============================================================================
# STEP 3: Docker Services
# ============================================================================
if [ "$SKIP_DOCKER" = false ]; then
    log_section "🐳 Step 3: Starting Docker Services"
    
    log_info "Starting PostgreSQL and Redis..."
    docker-compose up -d
    
    log_info "Waiting for PostgreSQL to be ready..."
    sleep 5
    
    # Check if PostgreSQL is ready
    RETRY_COUNT=0
    MAX_RETRIES=30
    while ! docker exec torre-tempo-postgres pg_isready -U postgres > /dev/null 2>&1; do
        RETRY_COUNT=$((RETRY_COUNT+1))
        if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
            log_error "PostgreSQL failed to start after ${MAX_RETRIES} attempts"
            exit 1
        fi
        log_info "Waiting for PostgreSQL... (${RETRY_COUNT}/${MAX_RETRIES})"
        sleep 1
    done
    
    log_success "PostgreSQL is ready"
    log_success "Redis is ready"
else
    log_warning "Skipping Docker services (--skip-docker)"
fi

# ============================================================================
# STEP 4: Install Dependencies
# ============================================================================
log_section "📦 Step 4: Installing Dependencies"

log_info "Installing root dependencies..."
npm install

log_success "Dependencies installed"

# ============================================================================
# STEP 5: Database Setup
# ============================================================================
log_section "🗄️ Step 5: Database Setup"

log_info "Generating Prisma client..."
cd apps/api
npx prisma generate
log_success "Prisma client generated"

log_info "Running database migrations..."
npx prisma migrate deploy
log_success "Migrations applied"

if [ "$SKIP_SEED" = false ]; then
    log_info "Seeding database..."
    npm run db:seed
    log_success "Database seeded"
else
    log_warning "Skipping database seed (--skip-seed)"
fi

cd ../..

# ============================================================================
# STEP 6: Run Tests
# ============================================================================
if [ "$SKIP_TESTS" = false ]; then
    log_section "🧪 Step 6: Running Tests"
    
    log_info "Running test suite..."
    npm run test
    
    log_success "All tests passed"
else
    log_warning "Skipping tests (--skip-tests)"
fi

# ============================================================================
# STEP 7: Build Applications
# ============================================================================
if [ "$SKIP_BUILD" = false ]; then
    log_section "🏗️ Step 7: Building Applications"
    
    log_info "Building all applications with Turborepo..."
    npm run build
    
    log_success "Build complete"
else
    log_warning "Skipping build (--skip-build)"
fi

# ============================================================================
# STEP 8: Lint Check
# ============================================================================
log_section "🔍 Step 8: Running Linters"

log_info "Running ESLint..."
npm run lint

log_success "Linting complete"

# ============================================================================
# Summary
# ============================================================================
log_section "✨ Build Summary"

log_success "Prerequisites: OK"
if [ "$SKIP_DOCKER" = false ]; then
    log_success "Docker Services: Running"
else
    log_warning "Docker Services: Skipped"
fi
log_success "Dependencies: Installed"
log_success "Database: Migrated"
if [ "$SKIP_SEED" = false ]; then
    log_success "Database: Seeded"
else
    log_warning "Database: Seed Skipped"
fi
if [ "$SKIP_TESTS" = false ]; then
    log_success "Tests: Passed"
else
    log_warning "Tests: Skipped"
fi
if [ "$SKIP_BUILD" = false ]; then
    log_success "Build: Complete"
else
    log_warning "Build: Skipped"
fi
log_success "Linting: OK"

echo ""
log_section "🎉 Build Complete!"
echo ""
log_info "Next steps:"
echo "  1. Review .env configuration"
echo "  2. Start development: npm run dev"
echo "  3. API will be available at: http://localhost:3000"
echo "  4. Web will be available at: http://localhost:5173"
echo ""
log_info "Useful commands:"
echo "  npm run dev       - Start all apps in development mode"
echo "  npm run build     - Build all apps for production"
echo "  npm run test      - Run test suite"
echo "  npm run lint      - Run linters"
echo ""
log_success "Happy coding! 🚀"
echo ""
