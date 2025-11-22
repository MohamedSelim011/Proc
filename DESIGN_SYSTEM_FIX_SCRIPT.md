# 🚀 Wujha Design System - Automated Fix Script

## Overview
This script provides automated commands to fix ALL remaining design system violations across the Wujha Procurement application.

---

## ✅ COMPLETED (Already Fixed)

1. ✅ **Toast Component** - Created `src/components/ui/Toast.tsx`
2. ✅ **ToastProvider** - Added to `src/app/procurement/layout.tsx`
3. ✅ **Wujha Colors** - Added to `src/app/globals.css`
4. ✅ **Requisitions Page** - Full compliance (primary colors, focus states, toasts, loading)
5. ✅ **Purchase Orders Page** - Full compliance (primary colors, focus states, toasts, loading)

---

## 🔧 REMAINING FIXES NEEDED

### Critical Files with alert() Usage (Must Fix)

Run these PowerShell commands in the project root to automatically fix all violations:

### 1. FIX ALL PRIMARY COLOR VIOLATIONS (bg-blue-600 → bg-wujha-primary)

```powershell
# Fix all primary buttons
Get-ChildItem -Path "src/app/procurement" -Filter "*.tsx" -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace 'bg-blue-600', 'bg-wujha-primary' | Set-Content $_.FullName
}

# Fix all hover states
Get-ChildItem -Path "src/app/procurement" -Filter "*.tsx" -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace 'hover:bg-blue-500', 'hover:bg-wujha-primary-hover' | Set-Content $_.FullName
}

# Fix all focus outlines
Get-ChildItem -Path "src/app/procurement" -Filter "*.tsx" -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace 'focus-visible:outline-blue-600', 'focus-visible:outline-wujha-primary' | Set-Content $_.FullName
}
```

### 2. FIX ALL FOCUS STATES (orange-500/blue-500 → wujha-primary)

```powershell
# Fix orange focus states
Get-ChildItem -Path "src/app/procurement" -Filter "*.tsx" -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace 'focus:ring-orange-500', 'focus:ring-wujha-primary' | Set-Content $_.FullName
}

Get-ChildItem -Path "src/app/procurement" -Filter "*.tsx" -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace 'focus:border-orange-500', 'focus:border-wujha-primary' | Set-Content $_.FullName
}

# Fix blue focus states
Get-ChildItem -Path "src/app/procurement" -Filter "*.tsx" -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace 'focus:ring-blue-500', 'focus:ring-wujha-primary' | Set-Content $_.FullName
}

Get-ChildItem -Path "src/app/procurement" -Filter "*.tsx" -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace 'focus:ring-offset-2 focus:ring-blue-500', 'focus:ring-offset-2 focus:ring-wujha-primary' | Set-Content $_.FullName
}
```

### 3. FIX ALL TEXT LINK COLORS

```powershell
# Fix text link colors
Get-ChildItem -Path "src/app/procurement" -Filter "*.tsx" -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace 'text-blue-600 hover:text-blue-900', 'text-wujha-primary hover:text-wujha-primary-hover' | Set-Content $_.FullName
}
```

### 4. FIX PAGINATION ACTIVE STATES

```powershell
# Fix pagination active states
Get-ChildItem -Path "src/app/procurement" -Filter "*.tsx" -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace "bg-blue-50 border-blue-500 text-blue-600", "bg-orange-50 border-wujha-primary text-wujha-primary" | Set-Content $_.FullName
}
```

---

## 📋 MANUAL FIXES REQUIRED (Files with alert())

The following files need manual updates to replace `alert()` and `confirm()` with toast notifications:

### Service Module Files (High Priority)

1. **src/app/procurement/services/vendors/new/page.tsx**
   - Line 156: Replace `alert('Vendor created successfully!')` with `showToast('success', 'Vendor created successfully!')`
   - Add import: `import { useToast } from '@/components/ui/Toast';`
   - Add hook: `const { showToast } = useToast();`

2. **src/app/procurement/services/vendors/[id]/edit/page.tsx**
   - Line 219: Replace `alert('Vendor updated successfully!')` with `showToast('success', 'Vendor updated successfully!')`

3. **src/app/procurement/services/payments/page.tsx**
   - Lines 354, 358, 362: Replace all `alert()` with `showToast()`

4. **src/app/procurement/services/payments/new/page.tsx**
   - Lines 159, 163, 167: Replace all `alert()` with `showToast()`

5. **src/app/procurement/services/performance/new/page.tsx**
   - Line 232: Replace `alert()` with `showToast()`

6. **src/app/procurement/services/invoices/page.tsx**
   - Lines 191, 200, 449: Replace all `alert()` with `showToast()`

7. **src/app/procurement/services/invoices/[id]/page.tsx**
   - Lines 112, 115, 119: Replace all `alert()` with `showToast()`

8. **src/app/procurement/services/invoices/[id]/edit/page.tsx**
   - Lines 80, 85, 148, 152, 156: Replace all `alert()` with `showToast()`

### Core Procurement Files

9. **src/app/procurement/settings/page.tsx**
   - Lines 61, 64: Replace `alert()` with `showToast()`

10. **src/app/procurement/rfq/new/page.tsx**
    - Lines 141, 146, 151, 182, 186: Replace all `alert()` with `showToast()`

11. **src/app/procurement/rfq/[id]/page.tsx**
    - Lines 117, 121: Replace `alert()` with `showToast()`

12. **src/app/procurement/purchase-orders/[id]/page.tsx**
    - Lines 167, 171: Replace `alert()` with `showToast()`

13. **src/app/procurement/purchase-orders/[id]/edit/page.tsx**
    - Lines 302, 306: Replace `alert()` with `showToast()`

14. **src/app/procurement/invoices/page.tsx**
    - Lines 241, 245: Replace `alert()` with `showToast()`

15. **src/app/procurement/automation/page.tsx**
    - Lines 144, 148: Replace `alert()` with `showToast()`

16. **src/app/procurement/dynamic-dashboard/page.tsx**
    - Line 185: Replace `alert()` with `showToast()`

---

## 🔍 VERIFICATION COMMANDS

After running the automated fixes, verify compliance:

```powershell
# Check for remaining blue color violations
Select-String -Path "src/app/procurement/**/*.tsx" -Pattern "bg-blue-600|hover:bg-blue-500|text-blue-600" -CaseSensitive

# Check for remaining orange-500 violations
Select-String -Path "src/app/procurement/**/*.tsx" -Pattern "focus:ring-orange-500|focus:border-orange-500" -CaseSensitive

# Check for remaining alert() calls
Select-String -Path "src/app/procurement/**/*.tsx" -Pattern "alert\(|confirm\(" -CaseSensitive

# Check for pulse loading animations (should use Loader2)
Select-String -Path "src/app/procurement/**/*.tsx" -Pattern "animate-pulse" -CaseSensitive
```

---

## 📝 TEMPLATE FOR MANUAL FIXES

For each file with `alert()`, follow this pattern:

### BEFORE:
```typescript
'use client';

import { useState } from 'react';

export default function ExamplePage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/example', { method: 'POST' });
      if (response.ok) {
        alert('Success!');  // ❌ WRONG
      } else {
        alert('Error!');  // ❌ WRONG
      }
    } catch (error) {
      alert('Failed!');  // ❌ WRONG
    }
  };

  return <div>...</div>;
}
```

### AFTER:
```typescript
'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';  // ✅ ADD THIS

export default function ExamplePage() {
  const { showToast } = useToast();  // ✅ ADD THIS
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/example', { method: 'POST' });
      if (response.ok) {
        showToast('success', 'Operation completed successfully!');  // ✅ CORRECT
      } else {
        const data = await response.json();
        showToast('error', data.error || 'Operation failed. Please try again.');  // ✅ CORRECT
      }
    } catch (error) {
      showToast('error', 'An error occurred. Please try again.');  // ✅ CORRECT
    }
  };

  return <div>...</div>;
}
```

### For confirm() dialogs:
```typescript
// BEFORE ❌
if (confirm('Are you sure?')) {
  // do action
}

// AFTER ✅ (use window.confirm temporarily or create a proper modal)
if (window.confirm('Are you sure?')) {  // Better: Create a confirmation modal
  // do action
  showToast('success', 'Action completed!');
}
```

---

## 🎨 LOADING STATE TEMPLATE

Replace pulse animations with Loader2:

### BEFORE:
```typescript
{loading ? (
  <div className="p-6">
    <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 rounded"></div>
      ))}
    </div>
  </div>
) : (
  // content
)}
```

### AFTER:
```typescript
import { Loader2 } from 'lucide-react';  // ✅ ADD THIS

{loading ? (
  <div className="p-12 flex flex-col items-center justify-center text-gray-500">
    <Loader2 className="w-8 h-8 animate-spin text-wujha-primary mb-4" />
    <p>Loading data...</p>
  </div>
) : (
  // content
)}
```

---

## 🚀 EXECUTION PLAN

### Phase 1: Automated Fixes (5 minutes)
1. Run all PowerShell scripts above
2. Verify changes with verification commands
3. Commit: `git commit -m "fix: Apply Wujha design system colors globally"`

### Phase 2: Manual Toast Replacements (2-3 hours)
1. Fix service module files (8 files, ~30 min)
2. Fix core procurement files (8 files, ~30 min)
3. Test each screen after fixing
4. Commit: `git commit -m "fix: Replace alert() with toast notifications"`

### Phase 3: Loading State Updates (1 hour)
1. Search for `animate-pulse` usage
2. Replace with Loader2 component
3. Commit: `git commit -m "fix: Standardize loading states with Loader2"`

### Phase 4: Testing (1 hour)
1. Test all list pages
2. Test all create/edit forms
3. Test all detail pages
4. Verify toasts appear correctly
5. Verify colors match design system

---

## ✅ COMPLETION CHECKLIST

- [ ] Toast component created and working
- [ ] ToastProvider added to layout
- [ ] Wujha colors added to CSS
- [ ] All `bg-blue-600` replaced with `bg-wujha-primary`
- [ ] All `hover:bg-blue-500` replaced with `hover:bg-wujha-primary-hover`
- [ ] All `focus:ring-orange-500` replaced with `focus:ring-wujha-primary`
- [ ] All `focus:ring-blue-500` replaced with `focus:ring-wujha-primary`
- [ ] All `text-blue-600` replaced with `text-wujha-primary`
- [ ] All pagination active states use wujha-primary
- [ ] All `alert()` calls replaced with `showToast()`
- [ ] All `confirm()` calls updated (use window.confirm or modal)
- [ ] All loading states use Loader2 component
- [ ] No `animate-pulse` without Loader2
- [ ] All service module screens updated
- [ ] All core procurement screens updated
- [ ] Comprehensive testing completed
- [ ] Design system audit passed

---

## 📞 SUPPORT

If you encounter issues:
1. Check `DESIGN_SYSTEM_COMPLIANCE_AUDIT.md` for detailed violations
2. Reference `WUJHA_DESIGN_SYSTEM.md` for design patterns
3. Review `src/app/procurement/requisitions/page.tsx` as reference implementation
4. Review `src/app/procurement/purchase-orders/page.tsx` as reference implementation

---

**Total Estimated Time**: 4-5 hours
**Priority**: 🔴 CRITICAL - Must complete before production
**Status**: ✅ 30% Complete (Toast component + 2 core pages fixed)

