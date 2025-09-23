# Backend API Requests

The following endpoints are currently missing from `https://api.systemq.qtn.ai/openapi.json` but are required by the frontend to deliver a complete authentication experience. They should be added to the backend and exposed through the documented API when available.

## 1. Renew Authentication Token
- **Endpoint**: `POST /auth/renew`
- **Purpose**: Exchange an expiring session token for a fresh token without requiring the user to log in again.
- **Request Body**:
  ```json
  {
    "token": "string"
  }
  ```
- **Success Response** (`200`):
  ```json
  {
    "token": "string",
    "expires_at": 1735689600,
    "user": { /* same schema as AuthSession.user */ }
  }
  ```
- **Errors**:
  - `401` — token is invalid or expired beyond the renewal window
  - `422` — request payload validation error

## 2. Fetch Current User Profile
- **Endpoint**: `GET /auth/me`
- **Purpose**: Retrieve the authenticated user's latest profile data using the bearer token. Used to hydrate client state after page refreshes or renewals.
- **Headers**:
  - `Authorization: Bearer <token>`
- **Success Response** (`200`):
  ```json
  {
    "id": "string",
    "name": "string",
    "email": "user@example.com",
    "title": "string|null",
    "division": "string|null",
    "level": "string|null",
    "position": "string|null",
    "subordinates": ["string"],
    "projects": ["string"],
    "avatar": "https://..." | null
  }
  ```
- **Errors**:
  - `401` — bearer token missing or invalid
  - `404` — user no longer exists

## 3. Sign Out (Optional)
- **Endpoint**: `POST /auth/logout`
- **Purpose**: Invalidate the active token server-side when the user signs out.
- **Headers**:
  - `Authorization: Bearer <token>`
- **Success Response** (`204`): Empty body.
- **Errors**:
  - `401` — bearer token missing or invalid

Once these endpoints exist, the frontend can call them from `AuthService` to keep sessions up to date and ensure user data is accurate after server-side changes.
