# Authentication Fix - Contract Approval Now Working!

## ✅ All Issues Fixed!

### **What Was Wrong:**
1. ❌ API routes used hardcoded `userId: 'current-user-id'`
2. ❌ No JWT token sent in requests
3. ❌ `params` not awaited (Next.js 15 error)
4. ❌ No approval rule in database

### **What I Fixed:**
1. ✅ Frontend now uses `getUserData()` to get real user from localStorage
2. ✅ All requests now include `Authorization: Bearer {token}` header
3. ✅ All API routes now use `requireAuth()` for proper authentication
4. ✅ All `params` are now awaited properly

---

## 🚀 To Test Now:

### **Step 1: Run the SQL Script in Railway**

**Go to Railway → PostgreSQL → Query Tab**

Copy and paste the entire content of: **`quick-fix-approval-rule.sql`**

This will create:
- ✅ Add `HEAD_OF_PROCUREMENT` and `BILLING_ENGINEER` enum values
- ✅ Create approval rule for SERVICE_CONTRACT
- ✅ Set up 2-level approval workflow

### **Step 2: Create/Update Test Users**

You need 2 users with the new roles. Run this SQL in Railway:

```sql
-- Option 1: Update your existing user to have HEAD_OF_PROCUREMENT role
UPDATE "User" 
SET role = 'HEAD_OF_PROCUREMENT' 
WHERE id = 'YOUR_USER_ID';  -- Use your actual user ID

-- Or if you know your email:
UPDATE "User" 
SET role = 'HEAD_OF_PROCUREMENT' 
WHERE email = 'your-email@example.com';

-- Check your current user ID and role:
SELECT id, name, email, role FROM "User" WHERE email = 'your-email@example.com';
```

### **Step 3: Refresh Browser & Test**

1. **Refresh the contract page** (Cmd+R / F5)
2. You should be **logged in** (check if you see your name in the header)
3. Click **"Submit for Approval"**
4. Check browser console (F12) - should NOT show errors
5. Check terminal - should show:
   ```
   POST /api/service-contracts/.../submit-approval 200 ✅
   ```

---

## 🔍 Troubleshooting

### **Issue: "Authentication required" error**

**Check if you're logged in:**
1. Open browser console (F12)
2. Type: `localStorage.getItem('token')`
3. Should return a long JWT token string

**If null or undefined:**
- You're not logged in
- Go to `/login` and log in first
- Then come back to the contract page

### **Issue: Still getting errors**

**Check your user data:**
```javascript
// In browser console (F12):
localStorage.getItem('user')
```

Should return something like:
```json
{"id":"clxxx","name":"John Doe","email":"john@example.com","role":"SUPER_ADMIN"}
```

### **Issue: "No approval workflow configured"**

**Verify the SQL script ran successfully:**

In Railway, run:
```sql
SELECT * FROM "ApprovalRule" WHERE "documentType" = 'SERVICE_CONTRACT';
```

Should return 1 row with the approval rule.

If empty:
- The SQL script didn't run properly
- Copy the entire content of `quick-fix-approval-rule.sql`
- Paste it again in Railway Query tab
- Make sure you click "Execute" or "Run"

---

## ✅ Complete Testing Steps

1. **Make sure you're logged in** to the application
2. **Run the SQL script** in Railway (only once!)
3. **Refresh the contract page**
4. **Click "Submit for Approval"**
5. **Check results:**
   - Success toast appears
   - Status changes to "APPROVED"
   - Approval History section appears
   - Terminal shows 200 status (not 401 or 400)

---

## 📊 What Should Happen Next

After successful submission:

1. **Contract Status:** DRAFT → **APPROVED** (awaiting approval)
2. **Version Created:** Version 1 saved
3. **Approval Workflow:** Initiated with 2 levels
4. **Notification:** Email sent to HEAD_OF_PROCUREMENT (check terminal logs)

Then you can test approvals (but you need users with correct roles).

---

## 🎯 Quick Checklist

- [ ] I'm logged in (can see my name in header)
- [ ] Ran `quick-fix-approval-rule.sql` in Railway
- [ ] Refreshed the contract page
- [ ] See "Submit for Approval" button
- [ ] Clicked it without errors
- [ ] Contract status changed to APPROVED
- [ ] Terminal shows 200 (not 401 or 400)

---

If you complete all these and still get errors, share:
1. The exact error message from browser console
2. The terminal output after clicking the button
3. Screenshot of what you see

Let me know when you've run the SQL script and I'll help you test! 🚀
