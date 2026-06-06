/**
 * WhatsApp notification API client.
 * Talks only to the BharatPACS backend — never to Arihant directly.
 * Uses the shared axios instance so Bearer token auth is automatic.
 */
import api from '../services/api';

const r = (res) => res.data;

export const notifyReportReady  = (params) => api.post('/waba/notify/report-ready', params).then(r);
export const notifyStudyReceived = (params) => api.post('/waba/notify/study-received', params).then(r);
export const notifyAppointment   = (params) => api.post('/waba/notify/appointment', params).then(r);
export const sendLoginOtp        = (params) => api.post('/waba/notify/login-otp', params).then(r);

export const getMessageLogs = ({ status, templateName, phone, page = 1, limit = 50 } = {}) => {
  const params = {};
  if (status)       params.status = status;
  if (templateName) params.templateName = templateName;
  if (phone)        params.phone = phone;
  params.page  = page;
  params.limit = limit;
  return api.get('/waba/logs', { params }).then(r);
};

export default { notifyReportReady, notifyStudyReceived, notifyAppointment, sendLoginOtp, getMessageLogs };
