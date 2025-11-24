# NextAuth to Custom Signin Route Migration

## Problem
The application was using NextAuth for authentication, which stores session data differently than our custom signin route. This caused:
- Empty role/user data in localStorage
- NextAuth session events instead of JWT tokens
- "Request Approval" button not showing due to missing role

## Solution
Migrated from NextAuth to custom signin route (`/api/auth/signin`) that uses JWT tokens stored in localStorage.

## Changes Made

### 1. Updated Procurement Layout (`src/app/procurement/layout.tsx`)

**Before:**
- Used `useSession()` from `next-auth/react`
- Used `signOut()` from NextAuth
- Got user data from NextAuth session

**After:**
- Uses `getUserData()` from `@/lib/jwt`
- Custom logout that clears localStorage
- Gets user data from localStorage/JWT

**Changes:**
```typescript
// Removed NextAuth imports
- import { signOut, useSession } from 'next-auth/react';

// Added JWT utility
+ import { getUserData } from '@/lib/jwt';

// Replaced session with localStorage
- const { data: session } = useSession();
+ const [user, setUser] = useState(null);
+ useEffect(() => {
+   const userData = getUserData();
+   setUser(userData);
+ }, []);

// Custom logout
- await signOut({ callbackUrl: '/login' });
+ localStorage.removeItem('token');
+ localStorage.removeItem('role');
+ localStorage.removeItem('user');
+ router.push('/login');
```

### 2. Updated Login Page (`src/app/login/page.tsx`)

**Before:**
- Used `signIn('credentials', ...)` from NextAuth
- Relied on NextAuth session management

**After:**
- Uses custom `/api/auth/signin` API route
- Stores JWT token, role, and user data in localStorage
- Same functionality as `signin.tsx` but in the `/login` route

**Changes:**
```typescript
// Removed NextAuth
- import { signIn } from 'next-auth/react';

// Added API fetch
+ import { apiFetch } from '@/lib/apiFetch';

// Custom signin
- const result = await signIn('credentials', {...});
+ const response = await apiFetch('/api/auth/signin', {
+   method: 'POST',
+   body: JSON.stringify({ email, password }),
+ });

// Store in localStorage
+ localStorage.setItem('token', data.token);
+ localStorage.setItem('role', data.user.role);
+ localStorage.setItem('user', JSON.stringify(data.user));
```

### 3. Already Updated (Previous Changes)
- ✅ JWT utility (`src/lib/jwt.ts`) - Decodes JWT if localStorage is empty
- ✅ Signin API (`src/app/api/auth/signin/route.ts`) - Creates JWT with role
- ✅ Signin page (`signin.tsx`) - Stores token/role in localStorage
- ✅ PO pages - Use JWT utility to get role

## Authentication Flow

### New Flow (Custom Signin):
1. User visits `/login`
2. Enters credentials
3. POST to `/api/auth/signin`
4. API validates and returns JWT token + user data
5. Frontend stores in localStorage:
   - `token` - JWT token
   - `role` - User role
   - `user` - Full user object (JSON)
6. User redirected to dashboard
7. All pages read from localStorage or decode JWT

### Old Flow (NextAuth):
1. User visits `/login`
2. Enters credentials
3. NextAuth handles authentication
4. Session stored in HTTP-only cookies
5. `useSession()` hook provides session data
6. No localStorage involvement

## Testing Steps

### 1. Clear All Data
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
```

### 2. Sign In
1. Go to `/login`
2. Enter credentials
3. Check browser console for:
   ```
   ✅ Token stored in localStorage
   ✅ Role stored in localStorage: [role]
   ✅ User data stored in localStorage: {...}
   ```

### 3. Verify localStorage
```javascript
// In browser console
console.log('Token:', localStorage.getItem('token'));
console.log('Role:', localStorage.getItem('role'));
console.log('User:', localStorage.getItem('user'));
```

### 4. Check PO Pages
1. Navigate to PO detail page
2. Check console for:
   ```
   PO Detail - User Role (from JWT util): [role]
   PO Detail - Permissions Check: { canSubmit: true, ... }
   ```
3. Verify "Request Approval" button appears

## Files Modified

1. ✅ `src/app/procurement/layout.tsx` - Removed NextAuth, use localStorage
2. ✅ `src/app/login/page.tsx` - Use custom signin route
3. ✅ `src/lib/jwt.ts` - JWT utility (already created)
4. ✅ `src/app/procurement/purchase-orders/[id]/page.tsx` - Use JWT utility
5. ✅ `src/app/procurement/purchase-orders/page.tsx` - Use JWT utility

## Files NOT Modified (Still Using NextAuth)

These files still reference NextAuth but are not critical for PO functionality:
- `src/middleware.ts` - Still uses NextAuth middleware (can be updated later)
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth API route (can be disabled)
- `src/components/providers/SessionProvider.tsx` - NextAuth provider (can be removed later)

## Next Steps (Optional)

1. **Update Middleware** - Replace NextAuth middleware with localStorage token check
2. **Remove NextAuth Provider** - Remove SessionProvider from root layout
3. **Disable NextAuth Route** - Comment out or remove NextAuth API route
4. **Add Route Protection** - Create custom middleware that checks localStorage token

## Important Notes

- ✅ All authentication now uses custom signin route
- ✅ JWT tokens stored in localStorage (not HTTP-only cookies)
- ✅ Role is always available from localStorage or JWT
- ✅ "Request Approval" button should now work
- ⚠️ Middleware still uses NextAuth (non-critical for now)
- ⚠️ SessionProvider still wraps app (non-critical for now)

## Troubleshooting

### If role is still empty:
1. **Sign out and sign back in** - This will use the new custom route
2. **Clear localStorage** - `localStorage.clear()` then sign in again
3. **Check console logs** - Look for storage confirmation messages
4. **Verify API response** - Check Network tab for `/api/auth/signin` response

### If "Request Approval" button still doesn't show:
1. Check console for `canSubmit: true` in permissions check
2. Verify role in localStorage: `localStorage.getItem('role')`
3. Check if PO status is 'DRAFT'
4. Verify user role is one of: BUYER, REQUESTOR, PROCUREMENT_OFFICER, etc.

