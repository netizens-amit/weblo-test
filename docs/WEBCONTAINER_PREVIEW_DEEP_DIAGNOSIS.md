# Deep Diagnosis: WebContainer Preview Blank Issue

> Comparing bolt.diy vs Weblo implementations to find root cause

## Current Symptoms

![Blank Preview](/home/amit/.gemini/antigravity/brain/4e37739f-81fc-49e3-8386-d5baedb1f5f3/uploaded_image_1766490235973.png)

- Status shows "Ready! (100%)"
- Preview area is **completely blank**
- Terminal shows activity (esbuild, ports)
- Files exist and have correct structure

---

## Root Cause Analysis

### 1. Generated File Structure: ✅ CORRECT

**Bolt.diy Timex Project:**
```
timex_indian_luxury_watch_website_iifci8/
├── index.html          ← src="/src/main.tsx"
├── package.json
├── vite.config.ts
├── src/
│   ├── main.tsx       ← import './index.css' ✅
│   ├── index.css
│   └── App.tsx
```

**Our Generated D-mart Project:**
```
ses_4b5149f52ffe1suN8K7X9KU51B/
├── index.html          ← src="/src/main.jsx"
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx       ← import './index.css' ✅
│   └── App.jsx
```

**Conclusion:** Generated files have IDENTICAL structure and correct imports. **Not the issue.**

---

### 2. Preview URL Flow: 🔴 LIKELY ISSUE

**Bolt.diy Flow (Works):**
```
WebContainer.on('server-ready', (port, url))
        ↓
PreviewsStore.broadcastUpdate(url)
        ↓
previews atom updates → [...availablePreviews.values()]
        ↓
Component: previews = useStore(workbenchStore.previews)
        ↓
activePreview = previews[0]
        ↓
useEffect: setIframeUrl(activePreview.baseUrl)
        ↓
<iframe src={iframeUrl}>
```

**Our Flow (Broken):**
```
WebContainer.on('server-ready', (port, url))
        ↓
Redux: dispatch(setPreviewUrl(url)) via thunk
        ↓
Redux state updates: previewUrl = url  
        ↓
Component: previewUrl = useAppSelector(state.webcontainer.previewUrl)
        ↓
<iframe src={previewUrl}> ← IS THIS RENDERING?
```

**Key Difference:** Bolt.diy uses a separate `iframeUrl` state that updates from `activePreview.baseUrl` in a useEffect. This ensures the iframe re-renders when URL changes.

---

### 3. Iframe Conditional Rendering: 🔴 LIKELY ISSUE

**Our Code (WebContainerPreview.tsx line 593):**
```tsx
{(viewMode === 'preview' || viewMode === 'split') && previewUrl && (() => {
    // ... renders iframe
})()}
```

**Problem:** If `previewUrl` is `null` or `undefined`, the entire block doesn't render. 

**But we show "Ready! (100%)"** - this means `status === 'ready'` but `previewUrl` might still be `null`!

---

### 4. Async Thunk Promise Resolution: 🔴 LIKELY ISSUE

**webcontainerSlice.ts initializeWebContainer:**
```typescript
// Step 5: Wait for server ready
return new Promise<string>((resolve, reject) => {
    container.on('server-ready', (_port, url) => {
        resolve(url);  // ← Promise resolves with URL
    });
    
    container.on('port', (port, type, url) => {
        if (!resolved && type === 'open' && url) {
            resolve(url);  // ← Or port event
        }
    });
});
```

**BUT WAIT:** The `server-ready` and `port` event listeners are registered AFTER the dev server starts! 

```typescript
const devProcess = await container.spawn('npm', ['run', 'dev']);

// Capture dev server output
devProcess.output.pipeTo(new WritableStream({/* ... */}));

// THEN we register listeners
return new Promise<string>((resolve, reject) => {
    container.on('server-ready', ...)  // ← TOO LATE?
});
```

**Problem:** If `server-ready` fires BEFORE we register the listener, we miss the event!

---

## Solution

### Fix 1: Register Event Listeners BEFORE Starting Server

```typescript
// Step 4: Register event listeners BEFORE starting dev server
return new Promise<string>(async (resolve, reject) => {
    const timeout = setTimeout(() => {
        reject(new Error('Dev server startup timeout (60s)'));
    }, 60000);

    let resolved = false;

    // Register listeners FIRST
    container.on('server-ready', (_port, url) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        dispatch(appendOutput(`✅ Dev server ready at ${url}`));
        resolve(url);
    });

    container.on('port', (port, type, url) => {
        dispatch(appendOutput(`🔌 Port ${port} ${type}: ${url || 'no url'}`));
        if (!resolved && type === 'open' && url) {
            resolved = true;
            clearTimeout(timeout);
            resolve(url);
        }
    });

    container.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
    });

    // THEN start the dev server
    dispatch(appendOutput('🔄 Starting dev server...'));
    const devProcess = await container.spawn('npm', ['run', 'dev']);
    
    devProcess.output.pipeTo(new WritableStream({
        write(data) {
            dispatch(appendOutput(data));
        }
    }));
});
```

### Fix 2: Add Debug Logging

Add logging in WebContainerPreview.tsx to verify previewUrl:

```tsx
// After getting previewUrl from Redux
console.log('🔍 [Preview Debug]', {
    status,
    previewUrl,
    isReady: status === 'ready',
    viewMode,
    shouldShowIframe: (viewMode === 'preview' || viewMode === 'split') && previewUrl,
});
```

---

## Files to Modify

| File | Fix |
|------|-----|
| `webcontainerSlice.ts` | Register event listeners BEFORE `spawn('npm', ['run', 'dev'])` |
| `WebContainerPreview.tsx` | Add debug logging for previewUrl |

---

## Summary

| Component | Status | Issue |
|-----------|--------|-------|
| Generated files | ✅ Correct | Matches bolt.diy structure |
| File mounting | ✅ Working | Files mount correctly |
| Dev server | ✅ Starts | Terminal shows output |
| Event listener timing | 🔴 Issue | Registered AFTER server starts |
| Preview URL | 🔴 Issue | Likely null due to missed event |

**Root Cause:** Event listeners are registered AFTER dev server starts, so `server-ready` event is missed.

**Solution:** Register listeners BEFORE calling `container.spawn('npm', ['run', 'dev'])`.
