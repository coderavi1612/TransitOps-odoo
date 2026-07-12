# Auth Service

Handles user authentication, registration, and role management.

## Owner
Backend Team — Auth

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register new user with email/password |
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/google` | Redirect to Google OAuth |
| GET | `/api/auth/google/callback` | OAuth callback |
| GET | `/api/auth/me` | Get current user + roles |
| POST | `/api/auth/assign-role` | Assign role (admin only) |
| POST | `/api/auth/logout` | Sign out |

## Files
- `auth.routes.js` — Express router with all auth endpoints
- `index.js` — Re-exports the router
