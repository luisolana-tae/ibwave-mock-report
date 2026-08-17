/* =============================================================================
   report-pdf.js — draws the report with jsPDF. No screenshots, so the text
   stays selectable and the file stays small.
   ========================================================================== */

const PDF = {
  // Manual de identidad corporativa IB Wave 2026.
  ink:   [11, 55, 80],     // Azul   #0B3750
  wave:  [0, 183, 212],    // Celeste #00B7D4
  amber: [250, 212, 33],   // Amarillo #FAD421
  green: [43, 176, 140],   // Verde  #2BB08C
  navy:  [19, 90, 123],
  deep:  [0, 128, 143],
  muted: [94, 114, 128],
  line:  [220, 227, 230],
  gris:  [237, 237, 237],
  wash:  [229, 247, 250],
  white: [255, 255, 255],

  logo:  'assets/img/logo-ibwave-pdf.png',
  logoRatio: 543 / 220,

  margin: 18,
  pageW: 210,
  pageH: 297
};

const contentW = PDF.pageW - PDF.margin * 2;

/* Loads the logo once and keeps it, since a report can span several pages. */
let LOGO_CACHE;
async function loadLogo() {
  if (LOGO_CACHE !== undefined) return LOGO_CACHE;
  try {
    const res = await fetch(PDF.logo);
    if (!res.ok) throw new Error(res.status);
    const blob = await res.blob();
    LOGO_CACHE = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch (err) {
    // A missing logo should never stop a teacher from producing a report.
    console.warn('Logo unavailable, falling back to text:', err);
    LOGO_CACHE = null;
  }
  return LOGO_CACHE;
}

async function generateReportPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const subject = getSubject();
  let y = 0;

  /* ------------------------------------------------------------ helpers */
  const setFill = c => doc.setFillColor(c[0], c[1], c[2]);
  const setText = c => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = c => doc.setDrawColor(c[0], c[1], c[2]);

  const ensureSpace = (needed, opts = {}) => {
    if (y + needed <= PDF.pageH - 22) return;
    doc.addPage();
    y = PDF.margin + 6;
    if (opts.repeatHeader) continuationHeader();
  };

  const continuationHeader = () => {
    setText(PDF.muted);
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text(`${t('brand')} · ${STATE.student} · ${subjectName(subject)} ${STATE.level}`, PDF.margin, y - 4);
    setDraw(PDF.line);
    doc.line(PDF.margin, y - 2, PDF.pageW - PDF.margin, y - 2);
    y += 4;
  };

  /* ------------------------------------------------------------- header */
  // The manual forbids the logo over gradients, so it sits on white and the
  // brand wave runs beneath it, matching the interface.
  const logoH = 16.5;
  const logo = await loadLogo();
  if (logo) {
    doc.addImage(logo, 'PNG', PDF.margin, 11, logoH * PDF.logoRatio, logoH, 'ibwave-logo', 'FAST');
  } else {
    doc.setFont('helvetica', 'bold').setFontSize(17);
    setText(PDF.ink);
    doc.text(t('brand'), PDF.margin, 22, { charSpace: 1 });
  }

  doc.setFont('helvetica', 'bold').setFontSize(10);
  setText(PDF.ink);
  doc.text(t('reportTitle'), PDF.pageW - PDF.margin, 19, { align: 'right', charSpace: 0.6 });

  doc.setFont('helvetica', 'normal').setFontSize(8.5);
  setText(PDF.muted);
  const issued = STATE.mockDate
    ? new Date(STATE.mockDate).toLocaleDateString(STATE.lang === 'es' ? 'es-ES' : 'en-GB',
        { day: '2-digit', month: 'long', year: 'numeric' })
    : '';
  doc.text(`${t('issuedOn')}: ${issued}`, PDF.pageW - PDF.margin, 24.5, { align: 'right' });

  // Brand band: the corporate gradient, faked with thin vertical strips.
  const bandY = 32, bandH = 7;
  const stops = [[0, PDF.ink], [0.38, [16, 81, 111]], [0.76, [0, 126, 153]], [1, PDF.wave]];
  const strips = 120;
  for (let i = 0; i < strips; i++) {
    const q = i / (strips - 1);
    let a = stops[0], b = stops[stops.length - 1];
    for (let k = 0; k < stops.length - 1; k++) {
      if (q >= stops[k][0] && q <= stops[k + 1][0]) { a = stops[k]; b = stops[k + 1]; break; }
    }
    const f = b[0] === a[0] ? 0 : (q - a[0]) / (b[0] - a[0]);
    setFill(a[1].map((ch, j) => Math.round(ch + (b[1][j] - ch) * f)));
    doc.rect((PDF.pageW / strips) * i - 0.2, bandY, PDF.pageW / strips + 0.4, bandH, 'F');
  }

  // Crests carved out of the band in white, closing it into a wave.
  const crest = (baseY, alpha, amp, depth) => {
    setFill(PDF.white);
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: alpha }));
    const pts = [];
    for (let x = 0; x <= PDF.pageW; x += 3) {
      pts.push([x, baseY + Math.sin((x / PDF.pageW) * Math.PI * 3) * amp]);
    }
    doc.lines(
      pts.slice(1).map((pt, i) => [pt[0] - pts[i][0], pt[1] - pts[i][1]]).concat([[0, depth], [-PDF.pageW, 0]]),
      pts[0][0], pts[0][1], [1, 1], 'F'
    );
    doc.restoreGraphicsState();
  };
  crest(bandY + 3.6, 0.30, 1.5, 4);
  crest(bandY + 5.4, 1, 1.0, 3);

  y = 50;

  /* ------------------------------------------------------------ section */
  const sectionTitle = label => {
    ensureSpace(16, { repeatHeader: true });
    doc.setFont('helvetica', 'bold').setFontSize(10);
    setText(PDF.ink);
    doc.text(label.toUpperCase(), PDF.margin, y, { charSpace: 0.8 });
    setDraw(PDF.ink);
    doc.setLineWidth(0.5);
    doc.line(PDF.margin, y + 2, PDF.pageW - PDF.margin, y + 2);
    y += 9;
  };

  const kvGrid = pairs => {
    const colW = contentW / 2;
    pairs.forEach((pair, i) => {
      const col = i % 2;
      if (col === 0) ensureSpace(12, { repeatHeader: true });
      const x = PDF.margin + col * colW;
      const rowY = y;
      doc.setFont('helvetica', 'normal').setFontSize(7.5);
      setText(PDF.muted);
      doc.text(String(pair[0]).toUpperCase(), x, rowY, { charSpace: 0.4 });
      doc.setFont('helvetica', 'bold').setFontSize(10.5);
      setText(PDF.ink);
      doc.text(String(pair[1] || '—'), x, rowY + 5.4);
      if (col === 1 || i === pairs.length - 1) y += 13;
    });
  };

  /* ------------------------------------------------------------- header block */
  sectionTitle(t('summary'));
  kvGrid([
    [t('student'), STATE.student],
    [t('teacher'), STATE.teacher],
    [t('subject'), `${subjectName(subject)} — ${STATE.level}`],
    [t('session'), `${sessionLabel(STATE.session)} · ${STATE.timezone}`]
  ]);
  y += 2;

  /* --------------------------------------------------------- papers table */
  sectionTitle(t('papersSat'));

  const cols = [
    { x: PDF.margin,       w: contentW - 96, align: 'left'  },
    { x: PDF.margin + contentW - 96, w: 32, align: 'right' },
    { x: PDF.margin + contentW - 64, w: 32, align: 'right' },
    { x: PDF.margin + contentW - 32, w: 32, align: 'right' }
  ];
  const cellX = c => (cols[c].align === 'right' ? cols[c].x + cols[c].w : cols[c].x);

  doc.setFont('helvetica', 'bold').setFontSize(7.5);
  setText(PDF.muted);
  [t('component'), t('markObtained'), t('weight'), t('paperPct')].forEach((h, i) =>
    doc.text(h.toUpperCase(), cellX(i), y, { align: cols[i].align, charSpace: 0.3 }));
  setDraw(PDF.line);
  doc.setLineWidth(0.3);
  doc.line(PDF.margin, y + 2, PDF.pageW - PDF.margin, y + 2);
  y += 8;

  satRows().forEach(r => {
    ensureSpace(10, { repeatHeader: true });
    doc.setFont('helvetica', 'normal').setFontSize(10);
    setText(PDF.ink);
    doc.text(localised(r.label), cellX(0), y);
    doc.text(`${r.mark} / ${r.max}`, cellX(1), y, { align: 'right' });
    doc.text(`${r.weight}%`, cellX(2), y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(fmtPct(r.pct), cellX(3), y, { align: 'right' });
    setDraw(PDF.line);
    doc.line(PDF.margin, y + 3, PDF.pageW - PDF.margin, y + 3);
    y += 9;
  });

  // Combined percentage strip
  ensureSpace(18, { repeatHeader: true });
  setFill(PDF.wash);
  doc.rect(PDF.margin, y - 1, contentW, 13, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(8);
  setText(PDF.deep);
  doc.text(t('combined').toUpperCase(), PDF.margin + 4, y + 6.5, { charSpace: 0.4 });
  doc.setFontSize(13);
  setText(PDF.navy);
  doc.text(fmtPct(combinedPct()), PDF.pageW - PDF.margin - 4, y + 7, { align: 'right' });
  y += 20;

  /* ------------------------------------------------------------ prediction */
  sectionTitle(t('prediction'));

  const boxW = (contentW - 8) / 3;
  const gradeBox = (i, label, value, accent) => {
    const x = PDF.margin + i * (boxW + 4);
    setDraw(PDF.line);
    doc.setLineWidth(0.3);
    setFill(accent ? PDF.ink : PDF.white);
    doc.roundedRect(x, y, boxW, 22, 1.5, 1.5, accent ? 'F' : 'FD');
    doc.setFont('helvetica', 'normal').setFontSize(7);
    setText(accent ? [170, 195, 215] : PDF.muted);
    doc.text(label.toUpperCase(), x + 4, y + 6.5, { charSpace: 0.3, maxWidth: boxW - 8 });
    doc.setFont('helvetica', 'bold').setFontSize(17);
    setText(accent ? PDF.white : PDF.ink);
    doc.text(String(value || '—'), x + 4, y + 17);
  };

  ensureSpace(28, { repeatHeader: true });
  gradeBox(0, t('ibPredictGrade'), STATE.predictGrade, true);
  gradeBox(1, t('teacherPrediction'), STATE.teacherGrade, false);
  gradeBox(2, t('predictTotalPct'), STATE.predictPct ? `${STATE.predictPct}%` : '—', false);
  y += 27;

  ensureSpace(12, { repeatHeader: true });
  doc.setFont('helvetica', 'normal').setFontSize(7.5);
  setText(PDF.muted);
  doc.text(t('gradeBoundary').toUpperCase(), PDF.margin, y, { charSpace: 0.4 });
  doc.setFont('helvetica', 'bold').setFontSize(10.5);
  setText(PDF.ink);
  doc.text(STATE.boundary || '—', PDF.margin, y + 5.4);
  y += 15;

  /* -------------------------------------------------------------- comments */
  sectionTitle(t('comments'));

  COMMENT_SECTIONS.forEach(sec => {
    const c = STATE.comments[sec.id] || { text: '', skipped: false };
    const body = c.skipped || !c.text.trim() ? t('skippedPdf') : c.text.trim();
    const lines = doc.splitTextToSize(body, contentW - 6);

    ensureSpace(14 + lines.length * 4.6, { repeatHeader: true });

    setFill(PDF.wave);
    doc.rect(PDF.margin, y - 3.5, 1.6, 5, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(9.5);
    setText(PDF.navy);
    doc.text(localised(sec.title), PDF.margin + 5, y);
    y += 6;

    doc.setFont('helvetica', c.skipped ? 'italic' : 'normal').setFontSize(9.5);
    setText(c.skipped ? PDF.muted : PDF.ink);
    doc.text(lines, PDF.margin + 5, y, { lineHeightFactor: 1.35 });
    y += lines.length * 4.6 + 9;
  });

  /* ---------------------------------------------------------------- footer */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    setDraw(PDF.line);
    doc.setLineWidth(0.3);
    doc.line(PDF.margin, PDF.pageH - 16, PDF.pageW - PDF.margin, PDF.pageH - 16);
    doc.setFont('helvetica', 'normal').setFontSize(6.8);
    setText(PDF.muted);
    doc.text(doc.splitTextToSize(t('confidential'), contentW - 22), PDF.margin, PDF.pageH - 12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${p} / ${pages}`, PDF.pageW - PDF.margin, PDF.pageH - 12, { align: 'right' });
  }

  const safe = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_');
  const filename = `${t('filename')}_${safe(STATE.student)}_${safe(subjectShort(subject, 'en'))}_${STATE.session}.pdf`;

  return { blob: doc.output('blob'), filename };
}
