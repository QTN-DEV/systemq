# SystemQ Backend

FastAPI-based backend service for the SystemQ platform. It provides health monitoring, authentication, and project management endpoints, database access through Beanie ODM, and SMTP-backed password recovery workflows.

## Prerequisites

- Python 3.11+
- MongoDB instance reachable at the configured URI
- (Optional) SMTP server for outbound email

## Initial Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copy the example environment variables and update as needed:

```bash
cp .env.example .env
```

At minimum set `SECRET_KEY` to a strong random value before starting the server. The key is required for password hashing and token signing.

## Configuration

All configuration values are read in `constants.py`. Environment variables:

- `APP_NAME` – Application title exposed in OpenAPI docs (default: `SystemQ API`).
- `MONGODB_URI` – MongoDB connection string.
- `MONGODB_DATABASE` – Target MongoDB database.
- `SECRET_KEY` – Required secret used for password hashing and token signatures.
- `RESET_TOKEN_EXPIRE_MINUTES` – Minutes before password reset tokens expire (default: `30`).
- `SMTP_HOST` – SMTP server host (default: `localhost`).
- `SMTP_PORT` – SMTP server port (default: `1025`).
- `SMTP_USERNAME` / `SMTP_PASSWORD` – Optional credentials for the SMTP server.
- `SMTP_FROM_EMAIL` – Sender address for outbound email.
- `SMTP_USE_TLS` – Set to `true` to enable `STARTTLS` when sending email.

## Running the API

Use the provided script to start Uvicorn with four workers:

```bash
./scripts/run_server.sh
```

The script activates the virtual environment and runs the application on `http://0.0.0.0:8000`.

## Database Bootstrapping

On startup the application connects to MongoDB and initialises Beanie with the registered document models. It also ensures an administrator account exists:

- Email: `admin@quantumteknologi.com`
- Password: `admin` (hashed with the configured `SECRET_KEY`)

Change this password immediately in production environments.

## Authentication API

Base path: `/auth`

| Endpoint | Method | Description |
| --- | --- | --- |
| `/auth/login` | `POST` | Authenticate a user and return a session token (2 hour expiry). |
| `/auth/forgot-password` | `POST` | Generate a password reset token and send it via email if the account exists. |
| `/auth/reset-password` | `POST` | Reset a password using a valid token. |
| `/auth/change-password` | `POST` | Update a user's password after validating the current password. |

Responses mirror the structure used in the frontend mock service (`AuthService.ts`). The `UserProfile` payload includes the same fields defined in `mockUsers.json`.

## Projects API

Base path: `/projects`

| Endpoint | Method | Description |
| --- | --- | --- |
| `/projects/` | `GET` | List all projects. |
| `/projects/{id}` | `GET` | Retrieve a project by identifier. |
| `/projects/` | `POST` | Create a new project (id must be unique). |
| `/projects/{id}` | `PATCH` | Update project name and/or avatar. |
| `/projects/{id}` | `DELETE` | Delete a project. |

Project payloads mirror the structure used in the frontend (`ProjectService.ts` and `mockProjects.json`). Each object exposes `id`, `name`, and optional `avatar` fields.

## SMTP Integration

Password recovery emails are dispatched through the configured SMTP server. For local development you can run a debugging server, e.g.:

```bash
python -m smtpd -c DebuggingServer -n localhost:1025
```

## Tooling

- **Beanie ODM** for asynchronous MongoDB access.
- **Ruff** for linting/formatting (`ruff check app`).
- **Python-Dotenv** for environment management.

## Development Tips

- Add additional document models to `app/models` and register them in `app/db/beanie.py`.
- Keep sensitive configuration in `.env` and out of version control.
- Run `ruff` before committing to ensure code quality.
