# WebContainer Preview Issue - Diagnosis & Solution

> Comprehensive analysis of why preview isn't showing and how bolt.diy solves this

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Bolt.diy Architecture Analysis](#boltdiy-architecture-analysis)
4. [Key Differences](#key-differences)
5. [Recommended Solution](#recommended-solution)
6. [Implementation Plan](#implementation-plan)

---

## Problem Statement

**Symptoms:**
- Website generates successfully (status shows "Ready!")
- Preview panel is blank/white
- Terminal shows activity (`main.runService`, esbuild output)
- Files exist in backend storage

![Current Issue](/home/amit/.gemini/antigravity/brain/4e37739f-81fc-49e3-8386-d5baedb1f5f3/uploaded_image_1766484976751.png)

---

## Root Cause Analysis

### Issue 1: Preview URL Not Being Captured Correctly

**Our Implementation (weblo-html):**
```typescript
// useWebContainer.ts
container.on('server-ready', (_port, url) => {
    safeSetPreviewUrl(url);  // ❌ URL may be set before component
mounts
});
```

**Problem:** The `server-ready` event may fire before the component is fully mounted, or the URL state may not propagate correctly to the iframe.

### Issue 2: Files May Not Be Mounted Properly

**Our Implementation:**
```typescript
// EditorPage.tsx - processFiles function
for (const file of list) {
    if (file.filename && file.content !== undefined) {
        loadedFiles[file.filename] = file.content;
    }
}
```

**Problem:** If files are loaded but WebContainer has already initialized with empty files, the preview will fail.

### Issue 3: Initialization Race Condition

**Sequence Issue:**
1. WebContainerPreview mounts with empty `files={}`
2. useWebContainer sees no files, waits
3. EditorPage fetches files from API
4. Files update, but WebContainer may not reinitialize

---

## Bolt.diy Architecture Analysis

### 1. Singleton WebContainer (Crucial!)

**File:** `bolt.diy/app/lib/webcontainer/index.ts`

```typescript
// Boot WebContainer ONCE at app startup (not per component)
export let webcontainer: Promise<WebContainer> = new Promise(() => {});

if (!import.meta.env.SSR) {
    webcontainer = WebContainer.boot({
        coep: 'credentialless',          // ✅ Enable cross-origin isolation
        workdirName: WORK_DIR_NAME,       // ✅ Consistent working directory
        forwardPreviewErrors: true,       // ✅ Forward errors from iframe
    });
}
```

**Key Insight:** bolt.diy boots WebContainer **once globally**, not in a React hook. This prevents:
- Multiple boot attempts
- Race conditions
- Lost event listeners

### 2. Reactive Store for Previews

**File:** `bolt.diy/app/lib/stores/previews.ts`

```typescript
export class PreviewsStore {
    #webcontainer: Promise<WebContainer>;
    previews = atom<PreviewInfo[]>([]);  // ✅ Reactive state using nanostores

    async #init() {
        const webcontainer = await this.#webcontainer;

        // ✅ Listen for server startup
        webcontainer.on('server-ready', (port, url) => {
            console.log('[Preview] Server ready on port:', port, url);
            this.broadcastUpdate(url);
        });

        // ✅ Listen for port open/close
        webcontainer.on('port', (port, type, url) => {
            if (type === 'close') {
                this.#availablePreviews.delete(port);
            } else {
                this.#availablePreviews.set(port, { port, ready: true, baseUrl: url });
            }
            this.previews.set([...this.#availablePreviews.values()]);
        });
    }
}
```

**Key Insight:** Preview URLs are stored in a **global reactive store** (nanostores), not component state. This means:
- URLs persist across component remounts
- Multiple components can access the same preview URLs
- Events are captured even if no component is mounted

### 3. File Store with Watching

**File:** `bolt.diy/app/lib/stores/files.ts`

```typescript
export class FilesStore {
    files: MapStore<FileMap> = map({});  // ✅ Reactive file map

    async #init() {
        const webcontainer = await this.#webcontainer;

        // ✅ Watch for file changes in WebContainer
        webcontainer.internal.watchPaths(
            {
                include: [`${WORK_DIR}/**`],
                exclude: ['**/node_modules', '.git'],
                includeContent: true,
            },
            bufferWatchEvents(100, this.#processEventBuffer.bind(this))
        );
    }

    // ✅ Handle file events and update store
    #processEventBuffer(events) {
        for (const { type, path, buffer } of events) {
            switch (type) {
                case 'add_file':
                case 'change':
                    const content = this.#decodeFileContent(buffer);
                    this.files.setKey(path, { type: 'file', content });
                    break;
                case 'remove_file':
                    this.files.setKey(path, undefined);
                    break;
            }
        }
    }
}
```

**Key Insight:** bolt.diy **watches the WebContainer filesystem** and keeps a reactive store in sync. We can query this store anytime.

### 4. Coordinated Workbench Store

**File:** `bolt.diy/app/lib/stores/workbench.ts`

```typescript
export class WorkbenchStore {
    // All stores share the SAME webcontainer promise
    #previewsStore = new PreviewsStore(webcontainer);
    #filesStore = new FilesStore(webcontainer);
    #terminalStore = new TerminalStore(webcontainer);

    get previews() {
        return this.#previewsStore.previews;  // ✅ Access reactive previews
    }

    get files() {
        return this.#filesStore.files;  // ✅ Access reactive files
    }
}
```

**Key Insight:** A single "workbench" store coordinates all sub-stores. They all share the same WebContainer instance.

### 5. Preview Component

**File:** `bolt.diy/app/components/workbench/Preview.tsx`

```typescript
export const Preview = memo(() => {
    const previews = useStore(workbenchStore.previews);  // ✅ Subscribe to reactive store
    const [activePreviewIndex, setActivePreviewIndex] = useState(0);
    const activePreview = previews[activePreviewIndex];
    const [iframeUrl, setIframeUrl] = useState<string>();

    useEffect(() => {
        if (!activePreview) {
            setIframeUrl(undefined);
            return;
        }
        setIframeUrl(activePreview.baseUrl);  // ✅ URL from global store
    }, [activePreview]);

    return (
        <iframe
            src={iframeUrl}
            sandbox="allow-scripts allow-forms..."
            allow="cross-origin-isolated"
        />
    );
});
```

**Key Insight:** Preview component **subscribes to the global store** and reacts when previews become available.

---

## Key Differences

| Aspect | bolt.diy | weblo-html |
|--------|----------|------------|
| **WebContainer Init** | Global singleton, booted once at app start | Per-component hook, may boot multiple times |
| **Preview URL Storage** | Global reactive store (nanostores) | Component state (useState) |
| **Event Handling** | Listeners attached to global WebContainer | Listeners attached in useEffect (may miss events) |
| **File Sync** | WebContainer file watcher → reactive store | API fetch → component state |
| **Boot Options** | `coep: 'credentialless'` for cross-origin | None specified |

---

## Recommended Solution

### Phase 1: Fix Immediate Issue (Quick Win)

1. **Add `coep: 'credentialless'` to WebContainer boot**
2. **Ensure preview URL is captured correctly**
3. **Add debug logging to trace the issue**

```typescript
// useWebContainer.ts - QUICK FIX
const container = await WebContainer.boot({
    coep: 'credentialless',  // ✅ ADD THIS
});

container.on('server-ready', (port, url) => {
    console.log('🌐 Server ready:', port, url);  // ✅ Debug log
    safeSetPreviewUrl(url);
});

// Also listen for port events
container.on('port', (port, type, url) => {
    console.log('🔌 Port event:', { port, type, url });  // ✅ Debug log
    if (type === 'open') {
        safeSetPreviewUrl(url);
    }
});
```

### Phase 2: Adopt bolt.diy Architecture (Long-term)

1. **Create global WebContainer singleton**
2. **Create reactive stores for files and previews**
3. **Refactor components to use stores**

---

## Implementation Plan

### Step 1: Add coep Option (Immediate)

```diff
// frontend/src/hooks/useWebContainer.ts
- const container = await WebContainer.boot();
+ const container = await WebContainer.boot({
+     coep: 'credentialless',
+ });
```

### Step 2: Add Port Event Listener

```typescript
// Add after server-ready listener
container.on('port', (port, type, url) => {
    appendOutput(`🔌 Port ${port} ${type}: ${url}`);
    if (type === 'open' && !previewUrl) {
        safeSetPreviewUrl(url);
    }
});
```

### Step 3: Ensure Preview URL in Iframe

```typescript
// WebContainerPreview.tsx
// Make sure iframe renders when previewUrl is available
{status.phase === 'ready' && previewUrl ? (
    <iframe
        src={previewUrl}
        allow="cross-origin-isolated"
        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
    />
) : (
    <LoadingScreen status={status} />
)}
```

### Step 4: Debug Current State

Add these logs to trace the issue:
```typescript
console.log('📊 Preview State:', {
    phase: status.phase,
    previewUrl,
    filesCount: Object.keys(files).length,
    hasPackageJson: !!files['package.json'],
});
```

---

## Files to Modify

| File | Change |
|------|--------|
| `useWebContainer.ts` | Add `coep` option, add `port` event listener |
| `WebContainerPreview.tsx` | Ensure iframe has correct attributes |
| `EditorPage.tsx` | Add debug logging for file loading |

---

## Expected Outcome

After applying these fixes:
1. WebContainer will work in cross-origin-isolated mode
2. Preview URL will be captured via `port` event if `server-ready` is missed
3. Debug logs will help trace any remaining issues

---

*Generated for Weblo HTML project - December 2024*
