/* =============================================================================
   api/send-report.js
   Emails the generated PDF through Resend's HTTP API.

   Resend rather than SMTP because the Workspace domain is shared with a large
   organisation and app passwords cannot be enabled on it. This route needs no
   mailbox credentials at all — just an API key — and no npm packages, since
   Node 18+ ships fetch.

   Environment variables (Vercel → Settings → Environment Variables):
     RESEND_API_KEY   re_xxxxxxxxxxxxxxxxxxxx
     MAIL_FROM        "IB Wave Reports <reports@thinkaheadeducation.com>"
                      Until the domain is verified, use "onboarding@resend.dev".
     MAIL_TO          luis.solana@thinkaheadeducation.com
     ALLOWED_ORIGIN   optional; only needed if the page is served elsewhere.
   ========================================================================== */

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const esc = s => String(s ?? '—').replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set.');
    return res.status(500).json({ error: 'Email is not configured on the server.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { student, teacher, subject, level, session, filename, pdfBase64, lang } = body || {};

    if (!student || !subject || !pdfBase64) {
      return res.status(400).json({ error: 'Missing student, subject or PDF.' });
    }
    if (Buffer.byteLength(pdfBase64, 'base64') > MAX_PDF_BYTES) {
      return res.status(413).json({ error: 'PDF too large.' });
    }

    const es = lang === 'es';
    const heading = es ? 'Reporte de examen mock' : 'Mock examination report';
    const rows = es
      ? [['Alumno', student], ['Profesor', teacher], ['Asignatura', `${subject} ${level}`], ['Convocatoria', session]]
      : [['Student', student], ['Teacher', teacher], ['Subject', `${subject} ${level}`], ['Session', session]];

    // MAIL_TO takes one address or several separated by commas, so recipients
    // can be changed without touching the code.
    const recipients = String(process.env.MAIL_TO || '')
      .split(',')
      .map(a => a.trim())
      .filter(Boolean);

    if (!recipients.length) {
      console.error('MAIL_TO is empty.');
      return res.status(500).json({ error: 'No recipient is configured on the server.' });
    }

    // reports@ is a send-only address with no mailbox behind it, so a reply
    // would bounce. REPLY_TO points those replies at a real person.
    const replyTo = String(process.env.REPLY_TO || '')
      .split(',')
      .map(a => a.trim())
      .filter(Boolean);

    const payload = {
      from: process.env.MAIL_FROM,
      to: recipients,
      ...(replyTo.length ? { reply_to: replyTo } : {}),
      subject: `${heading} — ${student} · ${subject} ${level}`,
      text: rows.map(([k, v]) => `${k}: ${v || '—'}`).join('\n'),
      html: `
        <div style="font-family:'Lato',Helvetica,Arial,sans-serif;color:#0B3750;max-width:560px">
          <div style="padding:20px 24px;border-bottom:4px solid #00B7D4">
            <div style="font-size:19px;font-weight:700;letter-spacing:.1em;color:#0B3750">IB WAVE</div>
            <div style="font-size:10px;letter-spacing:.14em;color:#5E7280;text-transform:uppercase">by Think Ahead Education</div>
          </div>
          <div style="padding:24px">
            <h2 style="margin:0 0 16px;font-size:16px;color:#0B3750">${esc(heading)}</h2>
            <table style="border-collapse:collapse;font-size:14px">
              ${rows.map(([k, v]) => `<tr>
                <td style="padding:6px 20px 6px 0;color:#5E7280">${esc(k)}</td>
                <td style="padding:6px 0;font-weight:700">${esc(v)}</td></tr>`).join('')}
            </table>
            <p style="margin:20px 0 0;font-size:13px;color:#5E7280">
              ${es ? 'El reporte completo va adjunto en PDF.' : 'The full report is attached as a PDF.'}
            </p>
          </div>
        </div>`,
      attachments: [{
        filename: filename || 'IBWave_Mock_Report.pdf',
        content: pdfBase64
      }]
    };

    const resend = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await resend.json().catch(() => ({}));

    if (!resend.ok) {
      // Resend explains refusals clearly; surface it in the log so the cause is
      // obvious (unverified domain, wrong from address, bad key).
      console.error('Resend refused the message:', resend.status, result);
      return res.status(502).json({ error: result.message || 'The email provider rejected the message.' });
    }

    console.log('Report sent, Resend id:', result.id);
    return res.status(200).json({ ok: true, id: result.id });
  } catch (err) {
    console.error('send-report failed:', err);
    return res.status(500).json({ error: 'Could not send the report.' });
  }
};
