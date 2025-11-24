# JWT Token Role Retrieval Fix

## Problem
The console logs showed empty role values:
- `userRole: ""`
- `userId: ""`
- `userEmployeeId: ""`
- `canApprove: false`
- `canSubmit: false`

This prevented the "Request Approval" button from showing.

## Root Causes Identified

1. **Role might be null in database** - Some users might not have a role assigned
2. **localStorage might be cleared** - Browser might clear localStorage
3. **JWT token not being decoded** - If localStorage role is missing, we should decode from JWT
4. **Timing issues** - Component might load before localStorage is populated

## Solutions Implemented

### 1. Created JWT Utility (`src/lib/jwt.ts`)

**Functions:**
- `decodeJWT(token)` - Decodes JWT token payload (client-side, no verification)
- `getUserRole()` - Gets role from localStorage or decodes from JWT token
- `getUserData()` - Gets full user data from localStorage or JWT token

**Features:**
- Automatically falls back to JWT token if localStorage is empty
- Stores decoded values back to localStorage for future use
- Handles errors gracefully

### 2. Updated Signin API (`src/app/api/auth/signin/route.ts`)

**Changes:**
- Added fallback: `role: user.role || 'REQUESTOR'` - If role is null in DB, defaults to REQUESTOR
- Ensures JWT token always includes a role

### 3. Updated Signin Page (`signin.tsx`)

**Changes:**
- Added console logging to track token and role storage
- Added fallback: `const role = data.user.role || 'REQUESTOR'`
- Better error handling and logging

### 4. Updated PO Pages

**Files Updated:**
- `src/app/procurement/purchase-orders/[id]/page.tsx`
- `src/app/procurement/purchase-orders/page.tsx`

**Changes:**
- Now use `getUserRole()` and `getUserData()` utilities
- Enhanced console logging to debug issues
- Logs both raw localStorage values and decoded JWT values

## How It Works

### Flow 1: Normal Signin
1. User signs in via `/api/auth/signin`
2. API returns JWT token with role in payload
3. Signin page stores token, role, and user data in localStorage
4. PO pages read from localStorage

### Flow 2: Fallback (if localStorage is empty)
1. PO pages try to read from localStorage
2. If empty, decode JWT token from localStorage
3. Extract role and user data from JWT payload
4. Store back to localStorage for future use

### Flow 3: Role is null in database
1. API defaults to 'REQUESTOR' role
2. JWT token includes 'REQUESTOR'
3. Stored in localStorage as 'REQUESTOR'

## Testing Steps

### Test 1: Normal Signin
1. Sign in with valid credentials
2. Check browser console for:
   ```
   ✅ Token stored in localStorage
   ✅ Role stored in localStorage: [role]
   ✅ User data stored in localStorage: {...}
   ```
3. Navigate to PO detail page
4. Check console for:
   ```
   PO Detail - User Role (from JWT util): [role]
   PO Detail - Raw localStorage role: [role]
   PO Detail - Raw localStorage token: Token exists
   ```

### Test 2: Clear localStorage
1. Sign in normally
2. Open browser console
3. Run: `localStorage.removeItem('role')`
4. Refresh PO page
5. Check console - should decode from JWT token and restore role

### Test 3: User with null role
1. Create/update a user with null role in database
2. Sign in as that user
3. Check console - should default to 'REQUESTOR'
4. Verify "Request Approval" button appears

## Debugging Console Output

### Expected Output (Success):
```
✅ Token stored in localStorage
✅ Role stored in localStorage: REQUESTOR
✅ User data stored in localStorage: {id: "...", role: "REQUESTOR", ...}

PO Detail - User Role (from JWT util): REQUESTOR
PO Detail - User Data (from JWT util): {id: "...", role: "REQUESTOR", ...}
PO Detail - Raw localStorage role: REQUESTOR
PO Detail - Raw localStorage token: Token exists
PO Detail - Raw localStorage user: {"id":"...","role":"REQUESTOR",...}

PO Detail - Permissions Check: {
  userRole: "REQUESTOR",
  userId: "...",
  userEmployeeId: "...",
  poStatus: "DRAFT",
  canApprove: false,
  canSubmit: true,
  isCreator: false
}
```

### If Role is Still Empty:
1. Check if token exists: `localStorage.getItem('token')`
2. If token exists, decode it: Run in console:
   ```javascript
   const token = localStorage.getItem('token');
   const parts = token.split('.');
   const payload = JSON.parse(atob(parts[1]));
   console.log('Decoded JWT:', payload);
   ```
3. Check if role is in decoded payload
4. If role is missing from JWT, check database user record

## Files Modified

1. ✅ `src/lib/jwt.ts` - NEW FILE - JWT utility functions
2. ✅ `src/app/api/auth/signin/route.ts` - Added role fallback
3. ✅ `signin.tsx` - Added logging and role fallback
4. ✅ `src/app/procurement/purchase-orders/[id]/page.tsx` - Use JWT utility
5. ✅ `src/app/procurement/purchase-orders/page.tsx` - Use JWT utility

## Next Steps if Still Not Working

1. **Check Database:**
   ```sql
   SELECT id, email, role FROM "User" WHERE email = 'your-email@example.com';
   ```
   - If role is NULL, update it:
   ```sql
   UPDATE "User" SET role = 'REQUESTOR' WHERE email = 'your-email@example.com';
   ```

2. **Check localStorage manually:**
   ```javascript
   // In browser console
   console.log('Token:', localStorage.getItem('token'));
   console.log('Role:', localStorage.getItem('role'));
   console.log('User:', localStorage.getItem('user'));
   ```

3. **Decode JWT manually:**
   ```javascript
   const token = localStorage.getItem('token');
   if (token) {
     const parts = token.split('.');
     const payload = JSON.parse(atob(parts[1]));
     console.log('JWT Payload:', payload);
     console.log('Role in JWT:', payload.role);
   }
   ```

4. **Re-sign in:**
   - Sign out
   - Clear localStorage: `localStorage.clear()`
   - Sign in again
   - Check console logs

## Notes

- JWT decoding is client-side only (no signature verification)
- For production, always verify JWT on server-side
- Role fallback to 'REQUESTOR' is a safety measure
- All console logs can be removed after debugging

