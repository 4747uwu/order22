# Eye Button & Viewer Flow — bharatpacs.com

## Origins & CORS

Both origins are already in `allowedOrigins` in `backend/server.js` (both prod + dev blocks):

| Origin | Status |
|---|---|
| `https://pacs.bharatpacs.com` | ✅ In CORS |
| `https://portal.bharatpacs.com` | ✅ In CORS |

---

## 1. Eye Button (`handleViewOnlyClick`) — UnifiedWorklistTable.jsx

### URL decision (lines 1015–1025)

```js
const isPortal = window.location.origin === 'https://portal.bharatpacs.com';
const isPacs   = window.location.origin === 'https://pacs.bharatpacs.com';

// Default (local / other origins)
let finalUrl = `/ohif/viewer?StudyInstanceUIDs=${studyUIDs}`;

if (isPacs) {
    // pacs.bharatpacs.com always uses viewer1
    finalUrl = `https://viewer.bharatpacs.com/viewer?StudyInstanceUIDs=${studyUIDs}`;

} else if (isPortal) {
    // portal.bharatpacs.com respects the viewer switcher
    finalUrl = selectedViewer === 'viewer2'
        ? `https://viewer2.bharatpacs.com/viewer/${studyUIDs}`          // path format
        : `https://portalviewer.bharatpacs.com/viewer?StudyInstanceUIDs=${studyUIDs}`;  // query format
}
```

**Summary by origin:**

| Origin | viewer1 (default) | viewer2 |
|---|---|---|
| `pacs.bharatpacs.com` | `viewer.bharatpacs.com` | same (no switcher logic) |
| `portal.bharatpacs.com` | `portalviewer.bharatpacs.com` | `viewer2.bharatpacs.com` |
| Local / other | `/ohif/viewer` (internal) | `/ohif/viewer` (internal) |

---

## 2. Restore Flow (shared by Eye and Reporting buttons)

After the URL is decided, both buttons run the same restore check:

```
strategy = getStudyOpenStrategy(study.studyDate)

if diffDays <= 1:   strategy = 'today'  → open directly (no checks)
if diffDays >= 2:   strategy = 'check'  → check Orthanc → restore if missing
```

### 'check' path (study is 2+ days old)

```
1. window.open('about:blank')  → show "Checking availability…" spinner in new tab
2. GET /api/backup/check-availability/:studyId
   → pings Orthanc, returns { available: true|false }
   → on network error: returns false (fail → triggers restore)

3. if available === true:
       newWindow.location.href = finalUrl   → done

4. if available === false:
       POST /api/backup/restore { studyId }
       → R2 GetObjectCommand → streams ZIP to /tmp/restore_<id>_<ts>.zip
       → uploads to Orthanc via streaming POST /instances
       → deletes temp file
       → waits 2s for Orthanc indexing
       → newWindow.location.href = finalUrl
```

---

## 3. Reporting Button (`handleOHIFReporting`)

Opens a reporting tab at `/online-reporting/:studyId?openOHIF=true&viewer=viewer1`.

Inside `OnlineReportingSystemWithOHIF.jsx` the OHIF iframe URL is built:

```js
const OHIF_VIEWERS = {
    viewer1: 'https://viewer.bharatpacs.com/viewer',
    viewer2: 'https://viewer2.bharatpacs.com/viewer',
};
const viewerPref = urlParams.get('viewer') || localStorage.getItem('preferredOhifViewer') || 'viewer1';

// viewer1 → query format: viewer.bharatpacs.com/viewer?StudyInstanceUIDs=...
// viewer2 → path format:  viewer2.bharatpacs.com/viewer/<studyUIDs>
```

Note: the reporting button uses the same restore flow (check → restore if missing), **except** for verifiers and studies already in final states (`report_completed`, `final_report_downloaded`, `verification_pending`) — those skip straight to opening the tab.

---

## 4. Viewer Switcher (portal.bharatpacs.com only)

Stored in `localStorage('preferredOhifViewer')`, initialised to `'viewer1'`.

A dropdown next to the eye button in the row shows `viewer1` / `viewer2`. Changing it updates `selectedViewer` state and persists to localStorage.

**Only `portal.bharatpacs.com` has different URLs per viewer.**  
On `pacs.bharatpacs.com` the switcher exists in the UI but the eye button always uses `viewer.bharatpacs.com` regardless.

---

## 5. StudyInstanceUID Sanitization

Before building any viewer URL:

```js
studyUIDs = sanitizeStudyInstanceUID(studyUIDs);
// Strips `_COPY_<timestamp>` suffix added when a study is copied cross-org
```

Source: `client/src/utils/studyInstanceUID.js`

---

## 6. Key Constants

| Item | Value |
|---|---|
| pacs viewer | `https://viewer.bharatpacs.com/viewer` |
| portal viewer 1 | `https://portalviewer.bharatpacs.com/viewer` |
| portal viewer 2 | `https://viewer2.bharatpacs.com/viewer` |
| local/internal viewer | `/ohif/viewer` |
| Restore age threshold | 2+ calendar days (`getStudyOpenStrategy` → `'check'`) |
| Availability check | `GET /api/backup/check-availability/:studyId` |
| Restore endpoint | `POST /api/backup/restore { studyId }` |
| Viewer pref key | `localStorage('preferredOhifViewer')` default `'viewer1'` |

---

## 7. Files Involved

| File | Role |
|---|---|
| `UnifiedWorklistTable.jsx` | Eye button, reporting button, viewer switcher UI |
| `WorklistTable.jsx` | Same handlers (older component) |
| `OnlineReportingSystemWithOHIF.jsx` | Reporting page — builds OHIF iframe URL from viewer pref |
| `utils/backupRestoreHelper.js` | `getStudyOpenStrategy`, `checkOrthancAvailability`, `checkAndRestoreStudy` |
| `utils/studyInstanceUID.js` | `sanitizeStudyInstanceUID` |
| `backend/controllers/backupOhifSwitch.controller.js` | Availability check + restore logic |
| `backend/server.js` | CORS `allowedOrigins` |
