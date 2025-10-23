## Project Overview

SystemQ is a full-stack enterprise application for project management, employee administration, and document workflows. The repository is structured as a monorepo with separate backend (FastAPI + MongoDB) and frontend (React + TypeScript + Vite) applications.

## Repository Struure

__pycache__/

*.py[cod]

*.so

*.log

.env

.venv/

venv/

.idea/

.vscode/

.DS_Store

.eggs/

*.egg-info/

- `be/` - FastAPI backend service
  - `app/main.py` - Application entry point with CORS, logging middleware, and static file mounting
  - `app/api/routes/` - API endpoints (auth, documents, employees, projects, uploads)
  - `app/models/` - Beanie ODM document models (User, Project, DocumentItem, etc.)
  - `app/db/beanie.py` - MongoDB connection and Beanie initialization
  - `app/core/security.py` - Password hashing and token management
  - `constants.py` - Environment variable configuration
  - `requirements.txt` - Python dependencies
- `fe/` - React + TypeScript frontend
  - `src/pages/` - Page components (Dashboard, Documents, EmployeeManagement, etc.)
  - `src/services/` - API service clients (AuthService, DocumentService, EmployeeService, etc.)
  - `src/stores/` - Zustand state management (authStore)
  - `src/components/` - Reusable UI components
  - `src/types/` - TypeScript type definitions

## Development Commands

### Backend

```bash
# Setup virtual environment
cd be
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run development server (port 47430, 4 workers)
./scripts/run_server.sh

# Linting and formatting
ruff check app
ruff format app
```

The backend requires MongoDB to be running. Copy `be/.env.example` to `be/.env` and configure:

- `MONGODB_URI` - MongoDB connection string
- `SECRET_KEY` - Required for password hashing and JWT tokens
- SMTP settings for email notifications

### Frontend

```bash
cd fe
npm install

# Development server
npm run dev

# Build for production
npm run build

# Linting
npm run lint

# Preview production build
npm run preview
```

The frontend uses `VITE_API_BASE_URL` environment variable (see `fe/.env.example`).

### Root-Level Commands

```bash
# Run frontend dev server
make fe-dev

# Run backend dev server
make be-dev
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up

# Staging environment
docker-compose -f docker-compose.staging.yml up
```

## Architecture & Key Patterns

### Backend Architecture

**Database Layer**: Uses Beanie ODM (async MongoDB client via Motor) with models registered in `app/db/beanie.py`. On startup, the application:

1. Initializes Beanie with all document models
2. Creates default admin user (admin@quantumteknologi.com / admin)

**Authentication**: Token-based authentication using session tokens stored in MongoDB. Passwords are hashed using the configured `SECRET_KEY`. Password reset tokens expire after 30 minutes (configurable).

**API Structure**: All routes are organized under `app/api/routes/` and included via a single router in `app/api/routes/__init__.py`. Each route module corresponds to a resource:

- `auth.py` - Login, password reset, change password
- `documents.py` - Document CRUD with history tracking and breadcrumb navigation
- `employees.py` - Employee management with subordinate relationships
- `projects.py` - Project CRUD operations
- `uploads.py` - File and image upload handling

**Document History**: Every document update (rename, move, content change) is snapshot in `DocumentHistory` collection for audit trails.

**SMTP Integration**: Email notifications are sent for password recovery, employee invitations, and deactivations. For local development, use Python's DebuggingServer: `python -m smtpd -c DebuggingServer -n localhost:1025`

**Logging**: Request logging middleware captures method, path, duration, status code, and correlation IDs. Log level is configurable via `APP_LOG_LEVEL` environment variable.

### Frontend Architecture

**State Management**: Uses Zustand for global state (currently `authStore.ts` for authentication state).

**Routing**: React Router v7 for client-side routing. Pages are in `src/pages/`.

**API Communication**: Axios-based service clients in `src/services/` mirror backend API structure. Each service handles one resource type.

**Styling**: Tailwind CSS v4 with custom configuration in `vite.config.ts`. Uses shadcn/ui patterns with `class-variance-authority` for component variants.

**Build Optimization**: Vite build is configured with manual chunk splitting for vendor, UI, and utility libraries to optimize bundle size.

## Testing

Currently no test framework is configured for either backend or frontend. Tests would need to be added.

## Default Credentials

Default admin account (change in production):

- Email: `admin@quantumteknologi.com`
- Password: `admin`

## Code Quality

**Backend**: Use Ruff for linting and formatting (configured in `pyproject.toml`):

- Line length: 100 characters
- Target: Python 3.13
- Enabled rules: E (pycodestyle errors), F (pyflakes), I (import sorting)

**Frontend**: ESLint configured with React, TypeScript, and accessibility plugins. Configuration in `eslint.config.js`.

## API Documentation

When the backend is running, interactive API documentation is available at:

- Swagger UI: `http://localhost:47430/docs`
- ReDoc: `http://localhost:47430/redoc`

## Important Notes

- The backend runs on port **47430** (not the standard 8000) as configured in `scripts/run_server.sh`
- All API endpoints include comprehensive logging with request/response correlation IDs
- Document operations maintain parent-child relationships and update counts automatically
- Employee deactivation soft-deletes (sets `is_active=false`) rather than hard deletion
- Static files (uploads) are served from `be/static/` directory, auto-created if missing
