# API Debugging Guide - Cannot Fetch Data

## Problem

You cannot fetch or add data for: leases, units, agents, agencies, invoices, penalties, messages, and users.

## Root Cause Analysis

Based on the backend code review:

- ✅ Backend server is running (port 4000)
- ✅ All routes are properly mounted in `api/src/server.js`
- ✅ Routes exist for all the mentioned endpoints
- ⚠️ All endpoints require authentication (Bearer token)

## Possible Issues

### 1. Authentication Token Missing or Invalid

**Check in Browser Console:**

```javascript
// Open browser console (F12) and run:
localStorage.getItem("token");
```

**If null or undefined:**

- You need to log in first
- Go to `/login` and sign in
- Token should be stored in localStorage after successful login

**If token exists but still getting errors:**

- Token might be expired
- Try logging out and logging back in

### 2. API Base URL Mismatch

**Check frontend API configuration:**
File: `frontend/src/config/api.js`

- API_BASE_URL should be: `http://localhost:4000/api`
- Check if `VITE_API_URL` environment variable is set correctly

**Check `.env` file in frontend:**

```bash
VITE_API_URL=http://localhost:4000/api
```

### 3. CORS Issues

**Symptoms:**

- Browser console shows CORS errors
- Requests are blocked

**Solution:**
Backend is configured to allow `http://localhost:5173`
Make sure frontend is running on this port.

### 4. Backend Not Running

**Check if backend is running:**

```powershell
# Test health endpoint
curl http://localhost:4000/health
```

**If not running, start it:**

```powershell
cd api
npm run dev
```

### 5. Database Connection Issues

**Check backend logs:**
Look for database connection errors in the terminal where backend is running.

**Test database connection:**

```powershell
curl http://localhost:4000/health/detailed
```

## Step-by-Step Debugging

### Step 1: Verify Backend is Running

```powershell
curl http://localhost:4000/health
```

Expected: `{"success":true,"status":"OK",...}`

### Step 2: Check Authentication

Open browser console (F12) and run:

```javascript
// Check if token exists
const token = localStorage.getItem("token");
console.log("Token:", token ? "EXISTS" : "MISSING");

// Check if user is logged in
const user = localStorage.getItem("user");
console.log("User:", user);
```

### Step 3: Test API Endpoint Manually

In browser console:

```javascript
// Test leases endpoint
fetch("http://localhost:4000/api/leases", {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
})
  .then((r) => r.json())
  .then((data) => console.log("Leases:", data))
  .catch((err) => console.error("Error:", err));
```

### Step 4: Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to load a page (e.g., Leases page)
4. Look for failed requests (red)
5. Click on failed request to see:
   - Request URL
   - Request Headers (check Authorization header)
   - Response (error message)

## Common Solutions

### Solution 1: Login Required

```
1. Go to http://localhost:5173/login
2. Enter your credentials
3. After successful login, try accessing the pages again
```

### Solution 2: Clear Cache and Re-login

```javascript
// In browser console:
localStorage.clear();
// Then refresh page and login again
```

### Solution 3: Check Backend Logs

Look at the terminal where backend is running for error messages.

### Solution 4: Restart Both Servers

```powershell
# Terminal 1 - Backend
cd api
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Testing Individual Endpoints

Once you have a valid token, test each endpoint:

### Test Leases

```javascript
fetch("http://localhost:4000/api/leases", {
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
})
  .then((r) => r.json())
  .then((d) => console.log("Leases:", d));
```

### Test Units

```javascript
fetch("http://localhost:4000/api/units", {
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
})
  .then((r) => r.json())
  .then((d) => console.log("Units:", d));
```

### Test Agents

```javascript
fetch("http://localhost:4000/api/agents", {
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
})
  .then((r) => r.json())
  .then((d) => console.log("Agents:", d));
```

### Test Agencies

```javascript
fetch("http://localhost:4000/api/agencies", {
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
})
  .then((r) => r.json())
  .then((d) => console.log("Agencies:", d));
```

## Expected Response Format

All endpoints should return data in this format:

```json
{
  "success": true,
  "data": {
    "leases": [...],  // or agents, units, etc.
  }
}
```

Or:

```json
{
  "success": true,
  "data": [...]
}
```

## Error Messages and Solutions

| Error Message                  | Cause               | Solution             |
| ------------------------------ | ------------------- | -------------------- |
| "Missing Authorization header" | No token sent       | Login first          |
| "Invalid Authorization format" | Token format wrong  | Check token format   |
| "Token expired"                | Token is old        | Login again          |
| "Route not found"              | Wrong URL           | Check API base URL   |
| "CORS error"                   | Cross-origin issue  | Check CORS settings  |
| Network error                  | Backend not running | Start backend server |

## Quick Fix Checklist

- [ ] Backend server is running on port 4000
- [ ] Frontend server is running on port 5173
- [ ] You are logged in (check localStorage.getItem('token'))
- [ ] Token is not expired
- [ ] API base URL is correct in frontend config
- [ ] No CORS errors in browser console
- [ ] Database is connected (check backend logs)

## Still Not Working?

### Check Backend Route Files

Verify these files exist and have proper exports:

- `api/src/routes/leases.js`
- `api/src/routes/units.js`
- `api/src/routes/agents.js`
- `api/src/routes/agencies.js`
- `api/src/routes/invoices.js`
- `api/src/routes/penalties.js`
- `api/src/routes/messaging.js`
- `api/src/routes/users.js`

### Check Database

Make sure you have data in the database:

```javascript
// In browser console after login:
fetch("http://localhost:4000/api/properties", {
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
})
  .then((r) => r.json())
  .then((d) => console.log("Properties work?", d));
```

If properties work but others don't, the issue is specific to those endpoints.

## Next Steps

1. **First**: Check if you're logged in
2. **Second**: Open browser console and check for errors
3. **Third**: Test one endpoint manually using the fetch commands above
4. **Fourth**: Check backend terminal for error logs
5. **Fifth**: Verify database has data

## Contact Points

If none of the above works, provide:

1. Screenshot of browser console errors
2. Screenshot of Network tab showing failed requests
3. Backend terminal logs
4. Result of running the test fetch commands above
