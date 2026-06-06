/**
 * Arihant WABA Provider Adapter
 *
 * ALL Arihant HTTP logic lives here and ONLY here.
 *
 * Confirmed working spec (hit-and-try verified, June 2026):
 *
 *   Endpoint : POST https://control.arihantglobal.in/fe/api/v1/iPMessage/One2Many
 *   Auth     : Basic  bharatpacsind : Xcentic@123
 *              (CRITICAL: username is "bharatpacsind", NOT "bharatpacsind.otp")
 *   Sender   : "+918769919414"  (+ prefix is mandatory)
 *   Template : 454115 (summ, Utility) | 454114 (summary, Marketing)
 *
 *   Context quirk: Arihant's gateway parser requires EACH variable to appear
 *   TWICE in the context object — once with the raw template name and once with
 *   a "waba_" prefix. Both must carry the same value or the gateway silently fails.
 *
 *   Working context example:
 *     { "name": "John", "waba_name": "John",
 *       "hospital": "BharatPACS", "waba_hospital": "BharatPACS", ... }
 *
 *   Success response:
 *     { submitResponses: [{ transactionId: 9492011827, state: "SUBMIT_ACCEPTED",
 *                           statusCode: 200, description: "Message accepted successfully" }] }
 */

import axios from 'axios';
import wabaConfig from '../../config/waba.js';

const ENDPOINT   = 'https://control.arihantglobal.in/fe/api/v1/iPMessage/One2Many';
const TIMEOUT_MS = 12_000;
const FAKE_DRY_ID = () => `DRY_${Date.now()}`;

/**
 * Strip non-digits from phone, then ensure 12-digit format (91XXXXXXXXXX).
 * recipient must NOT have a + prefix per Arihant's rules.
 */
const normalizeRecipient = (phone) => {
  const digits = String(phone).replace(/\D/g, '');
  // If already 12 digits starting with 91, use as-is
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  // If 10 digits (local Indian), prepend 91
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

/**
 * Build the context object.
 *
 * Arihant's parser requires each template variable to appear TWICE:
 *   1. Raw name matching the Meta template placeholder (e.g. "name")
 *   2. Same name with "waba_" prefix (e.g. "waba_name")
 *
 * Confirmed working variable names for the "summ" template:
 *   name, hospital, date, imageurl, reporturl, number
 */
const buildContext = (variables = {}) => {
  const ctx = {};
  for (const [key, value] of Object.entries(variables)) {
    if (value === undefined || value === null) continue;
    const v = String(value);
    ctx[key]          = v;   // raw — e.g. "name"
    ctx[`waba_${key}`] = v;  // prefixed — e.g. "waba_name"
  }
  return ctx;
};

/**
 * Send a single template message to one recipient.
 *
 * @param {object} params
 * @param {string} params.to            - recipient phone (auto-normalized to 91XXXXXXXXXX)
 * @param {string} params.templateName  - e.g. "summ"
 * @param {string} params.templateId    - Arihant template ID, e.g. "454115"
 * @param {Object} params.variables     - { name, hospital, date, imageurl, reporturl, number }
 * @returns {Promise<{ ok: boolean, providerMessageId?: string, raw?: any, error?: string }>}
 */
export const sendTemplateMessage = async ({
  to,
  templateName,
  templateId,
  variables = {},
}) => {
  const recipient = normalizeRecipient(to);

  const body = {
    mode: 'waba',
    wabaPhoneNumber: wabaConfig.sender,   // must have + prefix
    wabaTemplateId: templateId,
    template_name: templateName,
    campId: 1,
    unicode: false,
    shortMessages: [
      {
        recipient,
        corelationId: `bp_${Date.now()}`,
        context: buildContext(variables),
      },
    ],
  };

  if (wabaConfig.dryRun) {
    console.log('[WABA DRY-RUN] Would POST:', JSON.stringify({
      endpoint: ENDPOINT,
      auth: `Basic ${wabaConfig.apiUsername}:***`,
      body,
    }, null, 2));
    return { ok: true, providerMessageId: FAKE_DRY_ID(), raw: { dryRun: true } };
  }

  const basicAuth = 'Basic ' + Buffer.from(
    `${wabaConfig.apiUsername}:${wabaConfig.apiPassword}`
  ).toString('base64');

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await axios.post(ENDPOINT, body, {
        timeout: TIMEOUT_MS,
        headers: {
          Authorization: basicAuth,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      const r0 = response.data?.submitResponses?.[0];
      const ok = r0?.state === 'SUBMIT_ACCEPTED';
      const providerMessageId = r0?.transactionId ? String(r0.transactionId) : null;

      if (ok) {
        console.log(`[WABA] ✓ sent template="${templateName}" to=${recipient} txId=${providerMessageId}`);
        return { ok: true, providerMessageId, raw: response.data };
      }

      const errMsg = r0?.description || 'Unknown failure from Arihant';
      console.error(`[WABA] Attempt ${attempt} rejected: template="${templateName}" desc="${errMsg}"`);

      // Don't retry on validation errors
      if (['Invalid WABA TemplateId', 'WABA Template not found', 'Invalid WABA Sender']
          .some(e => errMsg.includes(e))) {
        return { ok: false, error: errMsg, raw: response.data };
      }

      if (attempt === 2) return { ok: false, error: errMsg, raw: response.data };
      await new Promise(r => setTimeout(r, 1500));

    } catch (err) {
      const isRetryable = !err.response || err.response.status >= 500;
      const errMsg = err.response?.data?.submitResponses?.[0]?.description || err.message;
      console.error(`[WABA] Attempt ${attempt} error: ${errMsg}`);
      if (attempt === 2 || !isRetryable) {
        return { ok: false, error: errMsg, raw: err.response?.data };
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }
};

export default { sendTemplateMessage };
