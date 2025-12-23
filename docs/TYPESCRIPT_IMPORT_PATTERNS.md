# TypeScript Import Patterns - Why Bolt.diy Doesn't Have These Issues

> Root cause analysis of import errors and how to prevent them

## The Problem

```
SyntaxError: The requested module '@reduxjs/toolkit' 
does not provide an export named 'PayloadAction'
```

This error occurred because `PayloadAction` is a **TypeScript type**, not a runtime value.

---

## Root Cause: `verbatimModuleSyntax`

Your `tsconfig.app.json` has this setting:

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true  // 🔴 This is the key!
  }
}
```

### What Does `verbatimModuleSyntax` Do?

| Without It | With It |
|------------|---------|
| TypeScript auto-removes type-only imports | TypeScript **preserves imports exactly as written** |
| `import { A, B }` → both kept in JS | `import { A, B }` → ERROR if B is type-only |
| Lenient, can cause runtime issues | Strict, catches errors at compile time |

**Bolt.diy also uses this setting** (line 21 of their tsconfig.json).

---

## Why Bolt.diy Doesn't Have These Issues

### Pattern: Always Use `import type` for Types

**Bolt.diy code (previews.ts line 1):**
```typescript
// ✅ CORRECT - bolt.diy pattern
import type { WebContainer } from '@webcontainer/api';
import { atom } from 'nanostores';
```

**Our incorrect code (webcontainerSlice.ts):**
```typescript
// ❌ WRONG - we mixed types with runtime values
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
```

**Fixed code:**
```typescript
// ✅ CORRECT - separate type imports
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
```

---

## The Rule (Simple)

```
┌─────────────────────────────────────────────────────────────┐
│  IF it's a TYPE (interface, type alias, generic parameter) │
│  THEN use:  import type { X } from 'module';               │
│                                                             │
│  IF it's a VALUE (function, class, constant)               │
│  THEN use:  import { X } from 'module';                    │
└─────────────────────────────────────────────────────────────┘
```

### How to Know?

1. **Hover in VS Code** - types show as `(type alias)` or `(interface)`
2. **Can you call it/use it at runtime?** → VALUE (regular import)
3. **Only used in type annotations?** → TYPE (use `import type`)

---

## Quick Reference: Redux Toolkit

```typescript
// ✅ CORRECT Redux Toolkit imports
import { 
  createSlice,        // VALUE - it's a function
  createAsyncThunk,   // VALUE - it's a function
  configureStore,     // VALUE - it's a function
} from '@reduxjs/toolkit';

import type { 
  PayloadAction,      // TYPE - only used as PayloadAction<X>
  ThunkAction,        // TYPE - only used as ThunkAction<...>
  Action,             // TYPE - only used as Action
} from '@reduxjs/toolkit';
```

---

## Why Bolt.diy Developers Are Consistent

1. **Team convention**: They established `import type` as a pattern early
2. **IDE enforcement**: ESLint rules can auto-fix type-only imports
3. **Code review**: Inconsistencies are caught in review
4. **Experience**: They've hit this error before and learned

---

## How to Prevent This in Your Project

### Option 1: Add ESLint Rule (Recommended)

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports" }
    ]
  }
}
```

This will:
- ✅ Auto-warn when you forget `import type`
- ✅ Auto-fix with `eslint --fix`

### Option 2: VS Code Setting

Add to `.vscode/settings.json`:
```json
{
  "typescript.preferences.preferTypeOnlyAutoImports": true
}
```

This makes auto-imports use `import type` automatically.

### Option 3: Remove `verbatimModuleSyntax` (Not Recommended)

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": false  // ⚠️ Removes protection
  }
}
```

This "fixes" the error but hides the problem - types may leak into JS bundles.

---

## Summary

| Issue | Root Cause | Solution |
|-------|------------|----------|
| `PayloadAction` not exported | Mixed type + value import | Use `import type` |
| Why bolt.diy works | They always use `import type` for types | Follow same pattern |
| Future prevention | Add ESLint rule | Auto-fix type imports |

---

## Key Takeaway

```typescript
// 🎯 THE GOLDEN RULE
// If you ONLY use it in type annotations (: Type, <Type>, as Type)
// then use: import type { X }
```

*This documentation applies to all TypeScript projects with `verbatimModuleSyntax: true`*
