# StudyDocumentsManager — Preview Context

## How Preview Works

### 1. Thumbnails (`DocThumbnail` component)
Each document card shows a large thumbnail before the user opens the full preview.

- **Images**: fetches presigned URL via `GET /documents/:id/url?action=view`, sets it directly as `<img src>`.
- **PDFs**: fetches presigned URL, uses `pdfjs-dist` to render page 1 onto a `<canvas>`, converts to JPEG dataURL via `canvas.toDataURL('image/jpeg', 0.7)`.
- **Cache**: module-level `Map` keyed by `doc._id` — persists across re-renders so presigned URLs and rendered PDF pages aren't re-fetched on every render.
- **Race condition guard**: a `cancelled` flag in the `useEffect` cleanup prevents setting state after the component unmounts.

### 2. Full Preview (`handlePreview`)
Clicking a thumbnail or the "View" button opens the full-screen preview modal.

- Calls `GET /documents/:id/url?action=view` for a fresh presigned URL.
- **Images**: uses the presigned URL directly as `previewBlobUrl` (no blob fetch needed).
- **PDFs**: fetches the URL as a `fetch()` blob, creates an object URL (`URL.createObjectURL`), renders in an `<iframe>`.
- State: `previewDocument` (the doc object) + `previewBlobUrl` (the URL to render).

### 3. Image Zoom & Pan
The image viewer supports mouse-wheel zoom toward cursor + drag to pan.

- **State vs Refs**: `imageZoom` / `panOffset` are React state (trigger re-renders). `zoomRef` / `panRef` are mirrors of those values as refs — event handlers read refs to avoid stale closures during rapid interactions.
- **Wheel zoom**: registered with `{ passive: false }` so `e.preventDefault()` can block page scroll. Zoom is multiplicative (×1.1 / ÷1.1 per tick) for perceptually uniform steps. Pan is adjusted so the point under the cursor stays fixed.
- **Drag to pan**: `mousedown` → `mousemove` → `mouseup`/`mouseleave`. Only active when zoom > 1.
- **GPU acceleration**: `transform: translate() scale()` with `willChange: transform`. Transition runs only on button clicks, not wheel/drag (checked via `isDragging.current`).

### 4. Cleanup
- PDF blob URLs are revoked on `closePreview()` via `URL.revokeObjectURL()` to prevent memory leaks.
- Image presigned URLs are used directly — no revocation needed.
- Zoom and pan reset to defaults on every close.

---

## Issues Fixed

| Issue | Fix |
|---|---|
| Stale zoom value in wheel/drag handlers | Handlers read `zoomRef` / `panRef` (refs) instead of `imageZoom` / `panOffset` (state) |
| Page scrolled while zooming image | Wheel listener registered with `{ passive: false }` so `e.preventDefault()` works |
| Memory leak from PDF blob URLs | `URL.revokeObjectURL(previewBlobUrl)` called in `closePreview()` (skipped for images) |
| Race condition: async thumbnail after unmount | `cancelled = true` set in `useEffect` cleanup; callbacks check it before calling `setState` |
| PDF.js worker not found on CDN | Using bundled worker: `pdfjs-dist/build/pdf.worker.min.mjs?url` (v5.6.205 not on CDN) |
| Redundant presigned URL fetches | Module-level `thumbnailCache` Map caches both image URLs and rendered PDF dataURLs |

---

## Key Files & Endpoints

- Component: `client/src/components/StudyDocuments/StudyDocumentsManager.jsx`
- View URL: `GET /api/documents/:id/url?action=view` — returns `{ data: { url } }`
- Download URL: `GET /api/documents/:id/url?action=download`
- Upload: `POST /api/documents/study/:studyId/upload` (multipart, max 10MB)
- Delete: `DELETE /api/documents/:documentId`
- List: `GET /api/documents/study/:studyId`
