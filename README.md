# IB Wave · Mock Report Generator

Four-step web app for teachers: student details → paper marks → IB Predict → written report → corporate PDF, emailed to the academy.

Runs entirely in the browser. No build step, no framework. English and Spanish, switchable at any point without losing what has been typed.

---

## Deploy

### Vercel — recommended

The code stays on GitHub; Vercel builds from it and redeploys on every push. One
domain serves both the page and the SMTP endpoint, so there is no CORS to
configure and `emailEndpoint: '/api/send-report'` works as shipped.

1. Push this folder to a GitHub repository.
2. vercel.com → **Add New → Project → Import** the repo. No build settings to change.
3. **Settings → Environment Variables**: add the SMTP values in the table below.
4. Redeploy.

Or from the terminal:

```bash
npm i -g vercel
vercel
vercel env add SMTP_HOST     # repeat for each variable
```

### GitHub Pages — static only

Works fine, but Pages cannot open an SMTP connection. The app falls back to
downloading the PDF and opening the teacher's mail client with the address
pre-filled, which needs no setup at all. Set `emailEndpoint: ''` in
`assets/js/config.js` to skip the failed request. `.nojekyll` is included so
GitHub serves `assets/` untouched.

### Hosts to avoid

| Host | Why |
|---|---|
| Cloudflare Workers | No raw TCP sockets, so SMTP is impossible. Needs an email API instead. |
| PythonAnywhere free | Outbound traffic is proxied to a whitelist; SMTP is blocked. Paid plans are fine, but the endpoint would need rewriting in Flask. |
| Render free | Works, but the instance sleeps after 15 minutes and takes ~50s to wake — bad when a teacher hits send. |

Netlify Functions and Fly.io both work with this file as-is.

### SMTP settings needed

| Variable | What it is | Example |
|---|---|---|
| `SMTP_HOST` | Mail server | `smtp.gmail.com` · `smtp.office365.com` · `smtp.zoho.eu` |
| `SMTP_PORT` | `465` (SSL) or `587` (STARTTLS) | `465` |
| `SMTP_SECURE` | `true` for 465, `false` for 587 | `true` |
| `SMTP_USER` | Mailbox that authenticates | `reports@thinkaheadeducation.com` |
| `SMTP_PASS` | **App password**, never the account password | — |
| `MAIL_FROM` | Sender shown in the inbox | `IB Wave Reports <reports@thinkaheadeducation.com>` |
| `MAIL_TO` | Destination | `luis.solana@thinkaheadeducation.com` |
| `ALLOWED_ORIGIN` | The Pages URL, so nobody else can call the endpoint | `https://user.github.io` |

Google Workspace and Microsoft 365 both refuse plain passwords. Create a dedicated sending mailbox and generate an app password for it — that keeps personal accounts out of the deployment and makes the sender address look institutional.

---

## Brand

Everything comes from *Manual de identidad corporativa IB Wave 2026*.

| Token | Hex | Manual name |
|---|---|---|
| `--azul` | `#0B3750` | Azul |
| `--celeste` | `#00B7D4` | Celeste |
| `--amarillo` | `#FAD421` | Amarillo |
| `--verde` | `#2BB08C` | Verde |
| `--gris` | `#EDEDED` | Gris |

Typography is **Work Sans** for headings and figures, **Lato** for body text,
both from Google Fonts, with system fallbacks if the network blocks them. Marks
use Work Sans with `tabular-nums` so columns of digits line up — the manual
specifies no third face, so no monospace is used.

Three tints are derived from the two primaries because the manual's own values
fail text contrast at small sizes: `--celeste-dk #00808F` for cyan text on
white, `--navy #135A7B` for mid-tone rules, and `--ok #1E8A6C` for the green
"valid" state. Backgrounds and large type use the manual values unchanged.

The logo sits on white in both the interface and the PDF, per the manual's rule
against placing it over gradients or busy grounds. The corporate gradient runs
beneath it as a wave band.

`assets/img/logo-ibwave.png` (900px, transparent) is for the page;
`logo-ibwave-pdf.png` (543px, flattened on white) is for the PDF, sized to what
13–17mm of print actually needs. Both were extracted from the manual. **Ask
marketing for the original SVG or AI file** and swap them in when you have it —
these are raster.

---

## Adding a subject (v2)

Everything lives in `assets/js/config.js`. Append one object to `SUBJECTS`:

```js
{
  id: 'psychology',
  name: { en: 'Psychology', es: 'Psicología' },
  sessions: ['N25', 'M25', 'N24'],
  levels: {
    HL: {
      sat: [
        { id: 'P1', label: { en: 'Paper 1', es: 'Paper 1' }, max: 49, weight: 40 },
        { id: 'P2', label: { en: 'Paper 2', es: 'Paper 2' }, max: 44, weight: 20 }
      ],
      estimated: [P3(24, 20), IA(22, 20)]
    },
    SL: { /* … */ }
  }
}
```

The subject dropdown, session list, mark fields, IB Predict table and PDF all pick it up. Nothing else to touch.

Other knobs in the same file: `commentMin` / `commentMax`, `recipient`, `allSessions`, `predictorUrl`.

---

## How the estimated marks work

Only two papers are sat. IB Predict still wants every component, so the app fills the rest.

1. Each paper is scored on its own: `mark ÷ max`.
2. The two are combined using the official component weightings, renormalised over the papers sat.
3. Every missing component (IA, Paper 3) is set to that same percentage of its own maximum.

A student at 57.3% across Papers 1 and 2 gets an IA at 57.3% of the IA maximum. Missing components neither lift nor drag the predicted grade — the grade reflects what the student actually did.

If the real IA mark is available, tick **I have the student's real IA mark** and the estimate is replaced. Worth doing: for most subjects the IA is 20–30% of the total, and a real mark makes the prediction noticeably sharper.

Component maximums are pre-filled but editable on the marks screen, because totals shift between sessions. Weightings come from the current subject guides and should be checked once per exam cycle.

---

## Files

```
index.html                 four screens plus the confirmation
assets/css/styles.css      palette, type, layout
assets/js/config.js        subjects, weightings, limits   ← edit this one
assets/js/i18n.js          every EN/ES string
assets/js/state.js         state and all calculations
assets/js/app.js           rendering, validation, delivery
assets/js/report-pdf.js    the PDF
assets/vendor/             jsPDF 4.2.1, bundled — no CDN needed
api/send-report.js         SMTP sender (deploy separately)
```

jsPDF ships inside the repo rather than loading from a CDN, so the app keeps
working on school networks that block third-party scripts. Google Fonts is the
only external request and the type falls back cleanly without it.
