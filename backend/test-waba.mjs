/**
 * WABA live-fire test — confirmed working payload (June 2026)
 * Run: node test-waba.mjs
 */

import https from 'https';

// CONFIRMED: username = bharatpacsind (NOT bharatpacsind.otp)
const BASIC = 'Basic ' + Buffer.from('bharatpacsind:Xcentic@123').toString('base64');
const TO    = '919044947403';   // test recipient

const body = JSON.stringify({
  mode: 'waba',
  wabaPhoneNumber: '+918769919414',   // + prefix is mandatory
  wabaTemplateId: '454115',
  template_name: 'summ',
  campId: 1,
  unicode: false,
  shortMessages: [{
    recipient: TO,                    // 12 digits, no + prefix
    corelationId: `bp_${Date.now()}`,
    context: {
      // Each variable must appear TWICE: raw name + waba_ prefix
      name:           'Test Patient',
      waba_name:      'Test Patient',
      hospital:       'BharatPACS',
      waba_hospital:  'BharatPACS',
      date:           '07-Jun-2026',
      waba_date:      '07-Jun-2026',
      imageurl:       'https://viewer.bharatpacs.com/test',
      waba_imageurl:  'https://viewer.bharatpacs.com/test',
      reporturl:      'https://bharatpacs.com/report/test',
      waba_reporturl: 'https://bharatpacs.com/report/test',
      number:         '+918769919414',
      waba_number:    '+918769919414',
    },
  }],
});

const res = await new Promise((resolve) => {
  const r = https.request(
    {
      hostname: 'control.arihantglobal.in', port: 443,
      path: '/fe/api/v1/iPMessage/One2Many', method: 'POST',
      headers: {
        Authorization: BASIC, 'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body), Accept: 'application/json',
      },
    },
    (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d })); }
  );
  r.on('error', e => resolve({ status: 0, body: e.message }));
  r.setTimeout(15000, () => { r.destroy(); resolve({ status: 0, body: 'TIMEOUT' }); });
  r.write(body); r.end();
});

const parsed = JSON.parse(res.body);
const r0 = parsed?.submitResponses?.[0];

console.log('\nHTTP', res.status);
console.log(JSON.stringify(parsed, null, 2));
console.log(r0?.state === 'SUBMIT_ACCEPTED'
  ? `\n✅ SENT! transactionId=${r0.transactionId}`
  : `\n❌ FAILED: ${r0?.description}`);
