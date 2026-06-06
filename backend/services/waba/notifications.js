/**
 * WABA Notification Service
 *
 * Maps BharatPACS events to approved WhatsApp templates and calls the provider adapter.
 * Callers (controllers, routes) use these functions — never the adapter directly.
 *
 * Active approved templates (from Arihant panel):
 *
 *  "summ"    (Utility) — report ready, preferred for transactional sends
 *    Header : "Your report are ready"
 *    Body   : Dear {{name}}, thank you for visiting {{hospital}} on {{date}}.
 *             Your diagnostic scan images and report are now available on BharatPACS.
 *             🖥️ View Images: Open here {{imageurl}} securely.
 *             📄 View Report: Access here {{reporturl}} securely.
 *             For assistance, please contact us at {{number}} anytime.
 *             Thank you for choosing BharatPACS.
 *    Footer : – Powered by BharatPACS
 *
 *  "summary" (Marketing) — same content but with {{urllink}}/{{weburl}} instead
 *    Use only for marketing campaigns, not transactional notifications.
 *
 * Privacy: No PHI in message bodies. Links must be tokenized and require auth.
 */

import { sendTemplateMessage } from './arihantProvider.js';
import wabaConfig from '../../config/waba.js';
import WabaMessageLog from '../../models/wabaMessageLog.js';

const sendAndLog = async ({ to, templateName, templateId, variables, patientRef, triggeredBy }) => {
  const result = await sendTemplateMessage({
    to,
    templateName,
    templateId,
    variables,
  });

  const log = new WabaMessageLog({
    providerMessageId: result.providerMessageId || null,
    recipientPhone:    to,
    patientRef:        patientRef || null,
    templateName,
    variables:         Object.entries(variables).map(([k, v]) => `${k}=${v}`),
    status:            result.ok ? 'sent' : 'failed',
    statusHistory:     [{ status: result.ok ? 'sent' : 'failed', at: new Date(), raw: result.raw }],
    triggeredBy,
    error:             result.ok ? undefined : result.error,
  });

  await log.save();
  return { ...result, logId: log._id };
};

/**
 * Report ready notification — uses the "summ" (Utility) template.
 *
 * Template variables:
 *   {{name}}      — patient name (no clinical detail, identifier only)
 *   {{hospital}}  — org/hospital name
 *   {{date}}      — study date, human-readable (e.g. "15 Jun 2025")
 *   {{imageurl}}  — short-lived tokenized viewer link (must require auth)
 *   {{reporturl}} — short-lived tokenized report link (must require auth)
 *   {{number}}    — support contact number
 *
 * @param {object} p
 * @param {string} p.phone
 * @param {string} p.patientName
 * @param {string} p.hospitalName
 * @param {string} p.studyDate        — formatted date string
 * @param {string} p.imageUrl         — tokenized viewer URL
 * @param {string} p.reportUrl        — tokenized report URL
 * @param {string} [p.supportNumber]  — defaults to sender number
 * @param {string} [p.patientRef]
 * @param {string} [p.triggeredBy]
 */
export const sendReportReady = ({
  phone, patientName, hospitalName, studyDate,
  imageUrl, reportUrl,
  supportNumber,
  patientRef, triggeredBy,
}) =>
  sendAndLog({
    to:           phone,
    templateName: wabaConfig.templates.reportReady,
    templateId:   wabaConfig.templateIds.summ,
    variables: {
      name:       patientName,
      hospital:   hospitalName,
      date:       studyDate,
      imageurl:   imageUrl,
      reporturl:  reportUrl,
      number:     supportNumber || wabaConfig.sender,
    },
    patientRef,
    triggeredBy,
  });

/**
 * Study received notification.
 * No dedicated template yet — reuses "summ" with report links omitted as placeholder.
 * Replace templateName with the actual approved template name once created.
 *
 * @param {object} p
 * @param {string} p.phone
 * @param {string} p.patientName
 * @param {string} p.hospitalName
 * @param {string} p.studyDate
 * @param {string} [p.patientRef]
 * @param {string} [p.triggeredBy]
 */
export const sendStudyReceived = ({ phone, patientName, hospitalName, studyDate, patientRef, triggeredBy }) =>
  sendAndLog({
    to:           phone,
    templateName: wabaConfig.templates.studyReceived,
    templateId:   wabaConfig.templateIds.summ,
    variables: {
      name:     patientName,
      hospital: hospitalName,
      date:     studyDate,
    },
    patientRef,
    triggeredBy,
  });

/**
 * Appointment reminder notification.
 * Replace templateName + variables once the template is approved.
 */
export const sendAppointmentReminder = ({ phone, patientName, hospitalName, dateTime, patientRef, triggeredBy }) =>
  sendAndLog({
    to:           phone,
    templateName: wabaConfig.templates.appointmentReminder,
    templateId:   wabaConfig.templateIds.summ,
    variables: {
      name:     patientName,
      hospital: hospitalName,
      date:     dateTime,
    },
    patientRef,
    triggeredBy,
  });

/**
 * Login OTP (Authentication template).
 * Replace templateName + variables once the OTP template is approved.
 */
export const sendLoginOtp = ({ phone, otp, triggeredBy }) =>
  sendAndLog({
    to:           phone,
    templateName: wabaConfig.templates.loginOtp,
    templateId:   wabaConfig.templateIds.loginOtp,
    variables:    { otp: String(otp) },
    triggeredBy,
  });

export default { sendReportReady, sendStudyReceived, sendAppointmentReminder, sendLoginOtp };
