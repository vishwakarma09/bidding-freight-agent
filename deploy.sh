#!/bin/bash
set -e

echo "======================================"
echo " Deploying Dispatch ..."
echo "======================================"

APP_DIR="/var/www/html/dispatch.owera.ca"
FRONTEND_APP="dispatch-frontend"
BACKEND_APP="dispatch-backend"
ECOSYSTEM_CONFIG="$APP_DIR/docs/ecosystem.config.cjs"


# -------------------------------------------------------
# Load NVM / Node environment (for non-interactive shells)
# -------------------------------------------------------
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# -------------------------------------------------------
# Load uv (Python package manager)
# -------------------------------------------------------
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"

echo "Node version : $(node -v)"
echo "NPM version  : $(npm -v)"
echo "Python version: $(python3 --version)"

# -------------------------------------------------------
# 1. Pull latest changes
# -------------------------------------------------------
echo ""
echo "[1/4] Pulling latest changes from git..."
cd "$APP_DIR"
git fetch origin
git reset --hard origin/main

# -------------------------------------------------------
# 2. Frontend — install dependencies & build
# -------------------------------------------------------
echo ""
echo "[2/4] Installing frontend dependencies & building..."
cd "$APP_DIR/frontend"
npm ci --legacy-peer-deps
VITE_API_URL=/ npm run build

# -------------------------------------------------------
# 3. Backend — sync Python dependencies via uv
# -------------------------------------------------------
echo ""
echo "[3/4] Syncing backend dependencies..."
cd "$APP_DIR/backend"
if [ ! -d ".venv" ]; then
    uv venv .venv --python python3
fi
uv pip install -r requirements.txt

# -------------------------------------------------------
# 4. Run database migrations or initial table creation
# -------------------------------------------------------
echo ""
echo "[4/4] Running database setup/migrations..."
cd "$APP_DIR/backend"

if [ -f "$APP_DIR/backend/.env.production" ]; then
    set -a
    source "$APP_DIR/backend/.env.production"
    set +a
elif [ -f "$APP_DIR/backend/.env" ]; then
    set -a
    source "$APP_DIR/backend/.env"
    set +a
fi

if [ -d "alembic/versions" ] && [ "$(ls -A alembic/versions | grep -v '.gitkeep')" ]; then
    uv run alembic upgrade head
else
    echo "No migrations found, creating tables directly via SQLAlchemy..."
    uv run python -c "from app.database import engine, Base; from app import models; Base.metadata.create_all(bind=engine)"
fi

# -------------------------------------------------------
# 5. Start / restart PM2 processes
# -------------------------------------------------------
echo ""
echo "Managing PM2 processes..."

if pm2 list | grep -q "$FRONTEND_APP"; then
    echo "  → '$FRONTEND_APP' is running. Restarting..."
    pm2 restart "$FRONTEND_APP" --update-env
else
    echo "  → '$FRONTEND_APP' is not running. Starting via ecosystem config..."
    pm2 start "$ECOSYSTEM_CONFIG" --only "$FRONTEND_APP"
fi

if pm2 list | grep -q "$BACKEND_APP"; then
    echo "  → '$BACKEND_APP' is running. Restarting..."
    pm2 restart "$BACKEND_APP" --update-env
else
    echo "  → '$BACKEND_APP' is not running. Starting via ecosystem config..."
    pm2 start "$ECOSYSTEM_CONFIG" --only "$BACKEND_APP"
fi

# Persist PM2 process list so it survives reboots
pm2 save

echo ""
echo "✅ Deployment complete!"
