/* =============================================================================
   api/send-report.js
   Serverless function (Vercel-style) that emails the generated PDF.
   GitHub Pages serves static files only, so this half needs a host that runs
   Node: Vercel, Netlify Functions, Render, Railway or your own VPS.

   Required environment variables — never commit these:
     SMTP_HOST      smtp.gmail.com  ·  smtp.office365.com  ·  smtp.zoho.eu …
     SMTP_PORT      465 (SSL) or 587 (STARTTLS)
     SMTP_SECURE    "true" for port 465, "false" for 587
     SMTP_USER      the mailbox that authenticates
     SMTP_PASS      app password, not the account password
     MAIL_FROM      "IB Wave Reports <reports@thinkaheadeducation.com>"
     MAIL_TO        luis.solana@thinkaheadeducation.com
     ALLOWED_ORIGIN https://<your-github-user>.github.io
   ========================================================================== */

const nodemailer = require('nodemailer');

const MAX_PDF_BYTES = 8 * 1024 * 1024;

module.exports = async (req, res) => {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { student, teacher, subject, level, session, filename, pdfBase64, lang } = body || {};

    if (!student || !subject || !pdfBase64) {
      return res.status(400).json({ error: 'Missing student, subject or PDF.' });
    }

    const pdf = Buffer.from(pdfBase64, 'base64');
    if (pdf.length > MAX_PDF_BYTES) {
      return res.status(413).json({ error: 'PDF too large.' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE) === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const heading = lang === 'es' ? 'Reporte de examen mock' : 'Mock examination report';
    const rows = lang === 'es'
      ? [['Alumno', student], ['Profesor', teacher], ['Asignatura', `${subject} ${level}`], ['Convocatoria', session]]
      : [['Student', student], ['Teacher', teacher], ['Subject', `${subject} ${level}`], ['Session', session]];

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_TO,
      replyTo: process.env.MAIL_FROM,
      subject: `${heading} — ${student} · ${subject} ${level}`,
      text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
      html: `
        <div style="font-family:Helvetica,Arial,sans-serif;color:#0A1B33">
          <div style="background:#0A1B33;color:#fff;padding:18px 22px">
            <div style="font-size:17px;font-weight:700;letter-spacing:.14em">IB WAVE</div>
            <div style="font-size:11px;letter-spacing:.1em;color:#9FB6CC;text-transform:uppercase">Think Ahead Education</div>
          </div>
          <div style="border-bottom:3px solid #17B3C9"></div>
          <div style="padding:22px">
            <h2 style="margin:0 0 14px;font-size:16px">${heading}</h2>
            <table style="border-collapse:collapse;font-size:14px">
              ${rows.map(([k, v]) => `<tr>
                <td style="padding:5px 18px 5px 0;color:#5A6B7E">${k}</td>
                <td style="padding:5px 0;font-weight:600">${v || '—'}</td></tr>`).join('')}
            </table>
            <p style="margin:18px 0 0;font-size:13px;color:#5A6B7E">
              ${lang === 'es' ? 'El reporte completo va adjunto en PDF.' : 'The full report is attached as a PDF.'}
            </p>
          </div>
        </div>`,
      attachments: [{ filename: filename || 'IBWave_Mock_Report.pdf', content: pdf, contentType: 'application/pdf' }]
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-report failed:', err);
    return res.status(500).json({ error: 'Could not send the report.' });
  }
};
