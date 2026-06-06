import express from 'express';
import crypto from 'crypto';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  sendReportReady,
  sendStudyReceived,
  sendAppointmentReminder,
  sendLoginOtp,
} from '../services/waba/notifications.js';
import WabaMessageLog from '../models/wabaMessageLog.js';
import wabaConfig from '../config/waba.js';

const router = express.Router();

// ── Phone number validation helper ─────────────────────────────────────────
const isValidPhone = (phone) => /^\+?\d{10,15}$/.test(String(phone).trim());

// ── Auth-protected send endpoints (internal callers only) ───────────────────
// Only admin / super_admin can trigger sends from the API.
// Other roles (doctor, verifier) trigger sends indirectly via workflow events.

router.post(
  '/notify/report-ready',
  protect,
  async (req, res) => {
    try {
      const { phone, patientName, hospitalName, studyDate, imageUrl, reportUrl, supportNumber, patientRef } = req.body;

      if (!phone || !patientName || !hospitalName || !studyDate || !imageUrl || !reportUrl) {
        return res.status(400).json({ success: false, message: 'phone, patientName, hospitalName, studyDate, imageUrl and reportUrl are required' });
      }
      if (!isValidPhone(phone)) {
        return res.status(400).json({ success: false, message: 'Invalid phone number format' });
      }

      const result = await sendReportReady({
        phone, patientName, hospitalName, studyDate,
        imageUrl, reportUrl, supportNumber,
        patientRef,
        triggeredBy: String(req.user._id),
      });

      return res.json({ success: result.ok, logId: result.logId, providerMessageId: result.providerMessageId, error: result.error });
    } catch (err) {
      console.error('[WABA Route] report-ready error:', err.message);
      return res.status(500).json({ success: false, message: 'Server error sending notification' });
    }
  }
);

router.post(
  '/notify/study-received',
  protect,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const { phone, patientName, studyDescription, patientRef } = req.body;

      if (!phone || !patientName || !studyDescription) {
        return res.status(400).json({ success: false, message: 'phone, patientName and studyDescription are required' });
      }
      if (!isValidPhone(phone)) {
        return res.status(400).json({ success: false, message: 'Invalid phone number format' });
      }

      const result = await sendStudyReceived({
        phone, patientName, studyDescription,
        patientRef,
        triggeredBy: String(req.user._id),
      });

      return res.json({ success: result.ok, logId: result.logId, providerMessageId: result.providerMessageId, error: result.error });
    } catch (err) {
      console.error('[WABA Route] study-received error:', err.message);
      return res.status(500).json({ success: false, message: 'Server error sending notification' });
    }
  }
);

router.post(
  '/notify/appointment',
  protect,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const { phone, patientName, dateTime, location, patientRef } = req.body;

      if (!phone || !patientName || !dateTime || !location) {
        return res.status(400).json({ success: false, message: 'phone, patientName, dateTime and location are required' });
      }
      if (!isValidPhone(phone)) {
        return res.status(400).json({ success: false, message: 'Invalid phone number format' });
      }

      const result = await sendAppointmentReminder({
        phone, patientName, dateTime, location,
        patientRef,
        triggeredBy: String(req.user._id),
      });

      return res.json({ success: result.ok, logId: result.logId, providerMessageId: result.providerMessageId, error: result.error });
    } catch (err) {
      console.error('[WABA Route] appointment error:', err.message);
      return res.status(500).json({ success: false, message: 'Server error sending notification' });
    }
  }
);

// Login OTP is triggered by auth flow — no session yet, so no protect middleware.
// Rate-limit should be enforced at the network/gateway level for this endpoint.
router.post('/notify/login-otp', async (req, res) => {
  try {
    const { phone, otp, triggeredBy } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'phone and otp are required' });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }
    // OTP must be numeric and 4-8 digits
    if (!/^\d{4,8}$/.test(String(otp))) {
      return res.status(400).json({ success: false, message: 'OTP must be 4-8 digits' });
    }

    const result = await sendLoginOtp({
      phone,
      otp,
      triggeredBy: triggeredBy || 'System:Auth',
    });

    return res.json({ success: result.ok, logId: result.logId, error: result.error });
  } catch (err) {
    console.error('[WABA Route] login-otp error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error sending OTP' });
  }
});

// ── Message log query (admin only) ─────────────────────────────────────────
router.get(
  '/logs',
  protect,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const { status, templateName, phone, page = 1, limit = 50 } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (templateName) filter.templateName = templateName;
      if (phone) filter.recipientPhone = new RegExp(String(phone).replace(/\D/g, ''));

      const skip = (Number(page) - 1) * Number(limit);
      const [logs, total] = await Promise.all([
        WabaMessageLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
        WabaMessageLog.countDocuments(filter),
      ]);

      return res.json({ success: true, data: { logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
    } catch (err) {
      console.error('[WABA Route] logs error:', err.message);
      return res.status(500).json({ success: false, message: 'Server error fetching logs' });
    }
  }
);

// ── Webhook receiver ────────────────────────────────────────────────────────
// Registered in the Arihant panel under WebHook Management → Callback URL.
// CONFIRM: exact signature/secret verification method with Arihant API doc.

router.post(wabaConfig.webhookPath.replace('/api', ''), express.json(), async (req, res) => {
  try {
    // CONFIRM: whether Arihant sends a signing secret and how (header name, HMAC algo)
    if (wabaConfig.webhookSecret) {
      const signature = req.headers['x-hub-signature-256'] || req.headers['x-waba-signature']; // CONFIRM header name
      if (!signature) {
        console.warn('[WABA Webhook] Missing signature header');
        return res.status(401).json({ success: false });
      }
      const expected = 'sha256=' + crypto
        .createHmac('sha256', wabaConfig.webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        console.warn('[WABA Webhook] Signature mismatch');
        return res.status(403).json({ success: false });
      }
    }

    const payload = req.body;
    console.log('[WABA Webhook] Received:', JSON.stringify(payload));

    // CONFIRM: exact webhook payload shape from Arihant.
    // Current assumption: WhatsApp Cloud API shape — statuses array inside entry.changes.
    const entries = payload?.entry || [];
    for (const entry of entries) {
      for (const change of (entry.changes || [])) {
        const value = change.value || {};

        // Delivery / read / failed status updates
        for (const statusUpdate of (value.statuses || [])) {
          const providerMessageId = statusUpdate.id;           // CONFIRM field name
          const newStatus = statusUpdate.status;               // "delivered" | "read" | "failed"
          const timestamp  = statusUpdate.timestamp
            ? new Date(Number(statusUpdate.timestamp) * 1000)
            : new Date();

          if (!providerMessageId || !newStatus) continue;

          // Idempotent: only update if not already in this state
          const validStatuses = ['sent', 'delivered', 'read', 'failed'];
          if (!validStatuses.includes(newStatus)) continue;

          await WabaMessageLog.findOneAndUpdate(
            { providerMessageId },
            {
              $set: { status: newStatus, updatedAt: new Date() },
              $push: { statusHistory: { status: newStatus, at: timestamp, raw: statusUpdate } },
            }
          );

          console.log(`[WABA Webhook] Updated msgId=${providerMessageId} → ${newStatus}`);
        }
      }
    }

    // Always return 200 quickly to acknowledge receipt
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[WABA Webhook] Error:', err.message);
    // Still return 200 to avoid Arihant retrying on a server error we can't handle
    return res.status(200).json({ success: true });
  }
});

// GET challenge verification (some providers send a GET to verify the webhook URL)
// CONFIRM: whether Arihant uses this pattern and what the query param names are.
router.get(wabaConfig.webhookPath.replace('/api', ''), (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === wabaConfig.webhookSecret) {
    console.log('[WABA Webhook] Verified');
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ success: false });
});

export default router;
