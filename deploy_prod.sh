#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Exit on undefined variables
set -u

# Print commands and their arguments as they are executed (useful for debugging)
# set -x

BACKEND_IMAGE=quantumteknologi/systemq-prod-be:c140630f
FRONTEND_IMAGE=quantumteknologi/systemq-prod-fe:c140630f
BACKEND_SERVICE_NAME=systemq-prod-be
FRONTEND_SERVICE_NAME=systemq-prod-fe
KUBERNETES_NAMESPACE=systemq

# Use current branch name, or allow override via env/argument
if [ -n "${BRANCH_NAME:-}" ]; then
    branch_name="$BRANCH_NAME"
else
    branch_name=$(git rev-parse --abbrev-ref HEAD)
fi
# ensure kubectl exist and running
if ! kubectl version --client > /dev/null 2>&1; then
    echo "❌ Kubernetes client is not installed. Please install Kubernetes client and try again."
    exit 1
fi
if ! kubectl get namespaces | grep -q $KUBERNETES_NAMESPACE; then
    echo "❌ Kubernetes namespace $KUBERNETES_NAMESPACE does not exist. Please create the namespace and try again."
    exit 1
fi

echo "========================================"
echo "        DEPLOYMENT AUTOMATION           "
echo "========================================"
echo ""

echo "0️⃣  PREPARATION"
echo "----------------------------------------"
echo "📋 Using git branch: ${branch_name}"
echo ""

echo "1️⃣  PULL UPDATES"
echo "----------------------------------------"
echo "💾 Stashing current modifications..."
#git stash || true

echo "⬇️  Pulling latest updates from ${branch_name}..."
git pull --rebase origin "$branch_name"

echo "📤 Restoring stashed local changes..."
#git stash pop || true

echo "✅ Git updates completed"
echo ""

echo "2️ ⃣  DOCKER IMAGE BUILD AND PUSH"
echo "----------------------------------------"

# Check if CLEAR_CACHE environment variable is set
if [ "${CLEAR_CACHE:-false}" = "true" ]; then
    echo "🧹 Clearing Docker build cache..."
    docker builder prune -f
    BUILD_ARGS="--no-cache"
else
    BUILD_ARGS=""
fi

echo "🔨 Building docker image..."
if ! docker compose -f docker-compose.prod.yml build $BUILD_ARGS; then
    echo "❌ Failed to build docker image"
    echo "💡 If the build fails with cache errors, try running: CLEAR_CACHE=true ./deploy.sh"
    exit 1
fi

echo "📤 Pushing docker image to registry..."
if ! docker image push "$BACKEND_IMAGE"; then
    echo "❌ Failed to push docker image to registry $BACKEND_SERVICE_NAME"
    exit 1
fi

echo "📤 Pushing docker image to registry $FRONTEND_SERVICE_NAME..."
if ! docker image push "$FRONTEND_IMAGE"; then
    echo "❌ Failed to push docker image to registry $FRONTEND_SERVICE_NAME"
    exit 1
fi

echo "Pruning docker to optimize space"
docker image prune -f

echo "✅ Docker operations completed. Don't forget to redeploy the services"
echo ""

# trigger deployment kubernetes to deploy the new images
echo "3️⃣  DEPLOYMENT KUBERNETES"
echo "----------------------------------------"
echo "🚀 Triggering deployment to Kubernetes..."
kubectl delete -f k8s/deployment.yml -n $KUBERNETES_NAMESPACE
kubectl apply -f k8s/deployment.yml -n $KUBERNETES_NAMESPACE
echo "✅ Kubernetes deployment triggered"
echo ""
echo "========================================"
echo "        DEPLOYMENT COMPLETED            "
echo "========================================"