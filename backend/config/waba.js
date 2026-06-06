/**
 * Arihant WABA configuration.
 * All secrets come from environment variables — never from source.
 *
 * Confirmed API details (hit-and-try, June 2026):
 *   Endpoint  : POST https://control.arihantglobal.in/fe/api/v1/iPMessage/One2Many
 *   Auth      : HTTP Basic  (username : password)
 *   API user  : bharatpacsind.otp  (WABA channel)
 *   Sender    : 918769919414
 *   Template  : 454115 (summ, Utility) — must be linked to API account by Arihant
 */

const dryRun = process.env.WABA_DRY_RUN === 'true';

const REQUIRED = [
  'ARIHANT_WABA_USERNAME',
  'ARIHANT_WABA_PASSWORD',
  'ARIHANT_WABA_SENDER',
  'ARIHANT_WABA_TEMPLATE_ID_SUMM',
];

if (!dryRun) {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`[WABA] Missing env vars: ${missing.join(', ')}. Set WABA_DRY_RUN=true to skip.`);
  }
}

const config = {
  dryRun,

  // Basic auth credentials — use "bharatpacsind" (NOT bharatpacsind.otp) for Utility templates
  apiUsername: process.env.ARIHANT_WABA_USERNAME || 'bharatpacsind',
  apiPassword: process.env.ARIHANT_WABA_PASSWORD || 'DRY_RUN_PASS',

  // WABA sender phone number — must include + prefix
  sender: process.env.ARIHANT_WABA_SENDER || '+918769919414',

  // Template IDs — must be activated for the API account by Arihant support
  // summ   (Utility / Transactional) : use for report-ready, study-received, etc.
  // summary(Marketing)               : do NOT use for transactional notifications
  templateIds: {
    summ:    process.env.ARIHANT_WABA_TEMPLATE_ID_SUMM    || '454115',
    summary: process.env.ARIHANT_WABA_TEMPLATE_ID_SUMMARY || '454114',
    loginOtp: process.env.ARIHANT_WABA_TEMPLATE_ID_OTP    || '',
  },

  // Template name → Arihant template name mapping
  templates: {
    reportReady:         process.env.TPL_REPORT_READY   || 'summ',
    studyReceived:       process.env.TPL_STUDY_RECEIVED || 'summ',
    appointmentReminder: process.env.TPL_APPOINTMENT    || 'summ',
    loginOtp:            process.env.TPL_LOGIN_OTP      || 'login_otp',
  },

  defaultLang: 'en',

  // Webhook
  webhookPath:   process.env.WABA_WEBHOOK_PATH   || '/api/webhooks/whatsapp',
  webhookSecret: process.env.WABA_WEBHOOK_SECRET || '',
};

export default config;
