# Supabase Auth Setup & Testing Guide

## Step 1: Verify Supabase Connection

Create a test script to check if Supabase connection works:

```bash
node test-supabase-connection.js
```

## Step 2: Setup Auth Tables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and run the entire contents of `setup-auth-tables.sql`
5. Verify tables were created (should see: `profiles`, `user_roles`, `companies`, `user_companies`)

## Step 3: Disable RLS (Row Level Security)

1. In Supabase SQL Editor, run `disable-rls.sql`
2. Verify RLS is disabled on all auth tables

## Step 4: Start the Backend Server

```bash
cd backend
npm install
npm start
```

Expected output:
```
TransitOps API listening on http://localhost:3000
```

## Step 5: Run Auth Tests

In a new terminal:

```bash
cd backend
node test-auth-complete.js
```

This will:
- Create 5 test users (admin, fleet_manager, driver, safety_officer, financial_analyst)
- Test authentication and role-based access control
- Verify RBAC restrictions are enforced
- Test role assignment and revocation

## Step 6: Manual Testing (Optional)

### Test 1: Create a user
```bash
curl -X POST http://localhost:3000/api/auth/test-signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@transitops.local",
    "password": "Password123!",
    "full_name": "Test User",
    "phone": "+1234567890",
    "role": "fleet_manager"
  }'
```

Expected response:
```json
{
  "user": { "id": "...", "email": "testuser@transitops.local" },
  "session": { "access_token": "..." },
  "profile": { "full_name": "Test User", "email": "...", "phone": "...", "role": "fleet_manager" }
}
```

### Test 2: Get current user
Save the `access_token` from above, then:

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:
```json
{
  "user": { "id": "...", "email": "..." },
  "profile": { "full_name": "Test User", ... },
  "roles": ["fleet_manager"]
}
```

### Test 3: Admin assigns role
Create an admin user first, then:

```bash
curl -X POST http://localhost:3000/api/auth/assign-role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "user_id": "USER_ID_FROM_TEST1",
    "role": "safety_officer"
  }'
```

### Test 4: Non-admin blocked from assigning role
```bash
curl -X POST http://localhost:3000/api/auth/assign-role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer NON_ADMIN_TOKEN" \
  -d '{
    "user_id": "SOME_USER_ID",
    "role": "admin"
  }'
```

Expected response (403):
```json
{
  "error": "Insufficient permissions",
  "required_roles": ["admin"],
  "your_roles": ["fleet_manager"],
  "message": "This action requires one of: admin"
}
```

## Troubleshooting

### Issue: "Failed to connect to Supabase"
- Verify `SUPABASE_URL` in `.env` is correct
- Check your internet connection
- Ensure Supabase project is active

### Issue: "user_roles table not found"
- Run `setup-auth-tables.sql` in Supabase SQL Editor
- Verify the query executed successfully

### Issue: "RLS policy prevents query"
- Run `disable-rls.sql` in Supabase SQL Editor
- Verify all tables show `rowsecurity = f` in pg_tables

### Issue: "Invalid token"
- Token may have expired
- Create a new user and get a fresh token
- Check that `SUPABASE_JWT_SECRET` matches in Supabase settings

### Issue: "Server not running"
- Make sure you ran `npm start` in the backend directory
- Check that port 3000 is not in use
- Try a different port by setting `PORT=3001` in `.env`

## Success Criteria

✅ All 10 tests pass in `test-auth-complete.js`
✅ Users can signup with valid email/password
✅ Users can login and receive JWT token
✅ Admins can assign/revoke roles
✅ Non-admins are blocked from admin operations
✅ Profile and role data persists in Supabase

## Next Steps

Once auth is working:
1. Build vehicle management endpoints
2. Build driver management endpoints
3. Build trip management endpoints
4. Integrate RBAC middleware into all service routes
5. Build frontend login/dashboard UI
