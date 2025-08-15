# FFmpeg Core Files - URGENT FIX NEEDED

## Current Issue
The `ffmpeg-core.wasm` file contains a URL instead of the actual WebAssembly binary, causing the error:
"expected magic word 00 61 73 6d, found 68 74 74 70"

## Required Action
You need to manually download and replace these files:

### Step 1: Download ffmpeg-core.js
1. Go to: https://unpkg.com/@ffmpeg/core@0.12.16/dist/umd/ffmpeg-core.js
2. Save the entire JavaScript content
3. Replace the content of `public/ffmpeg-core/ffmpeg-core.js` with this content

### Step 2: Download ffmpeg-core.wasm
1. Go to: https://unpkg.com/@ffmpeg/core@0.12.16/dist/umd/ffmpeg-core.wasm
2. Download the binary file (right-click → Save As)
3. Replace `public/ffmpeg-core/ffmpeg-core.wasm` with this binary file

### Step 3: Verify Files
- `ffmpeg-core.js` should be ~500KB of JavaScript code
- `ffmpeg-core.wasm` should be ~25MB WebAssembly binary

### Step 4: Rebuild and Deploy
After replacing the files:
```bash
npm run build
```
Then redeploy to Netlify.

## Alternative Solution
If manual download doesn't work, you can modify the useFFmpeg hook to load directly from CDN:

```typescript
// In src/hooks/useFFmpeg.ts, change the load call to:
await ffmpeg.load({
  coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.16/dist/umd/ffmpeg-core.js',
  wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.16/dist/umd/ffmpeg-core.wasm',
});
```

This will load directly from unpkg.com instead of local files.