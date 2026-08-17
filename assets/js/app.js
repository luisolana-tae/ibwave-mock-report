/* =============================================================================
   app.js — rendering, navigation, validation, delivery.
   ========================================================================== */

const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const TOTAL_STEPS = 4;   // step 5 is the confirmation screen

/* ==========================================================  TRANSLATION  */
function applyLanguage() {
  document.documentElement.lang = STATE.lang;

  $$('[data-i18n]').forEach(el => {
    const vars = el.dataset.i18nVars ? JSON.parse(el.dataset.i18nVars) : {};
    el.textContent = t(el.dataset.i18n, vars);
  });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });

  $('#s4Lead').textContent = t('s4Lead', { min: APP_CONFIG.commentMin, max: APP_CONFIG.commentMax });
  $('#footRecipient').textContent = APP_CONFIG.recipient;

  renderStepper();
  renderSubjectSelect();
  renderSessionSelect();
  renderTimezoneSelect();
  renderGradeSelects();
  renderSyllabusNotice();
  renderPapers();
  renderPredict();
  renderComments();
  if (STATE.step === 5) renderRecap();
}

function setLanguage(lang) {
  STATE.lang = lang;
  localStorage.setItem('ibwave-lang', lang);
  applyLanguage();

  // A report already built in the other language would no longer match the
  // interface, so rebuild it quietly.
  if (STATE.pdfBlob) {
    buildPdf().catch(err => console.error('PDF rebuild failed:', err));
  }
}

/* =============================================================  STEPPER  */
function renderStepper() {
  const labels = STRINGS[STATE.lang].steps;
  const shown = Math.min(STATE.step, TOTAL_STEPS);
  $('#stepper').innerHTML = labels.map((label, i) => {
    const n = i + 1;
    const state = STATE.step === 5 ? 'done' : n < shown ? 'done' : n === shown ? 'current' : 'todo';
    return `<button type="button" class="step-pip" data-state="${state}" data-step="${n}"
              ${state === 'done' ? '' : 'disabled aria-disabled="true"'}>
              <span class="step-pip-bar"></span>
              <span class="step-pip-label">${label}</span>
            </button>`;
  }).join('');

  // The swell deepens as the teacher advances.
  const depth = (Math.min(STATE.step, TOTAL_STEPS) - 1) / (TOTAL_STEPS - 1);
  const swell = $('#swell');
  swell.querySelector('.swell-front').style.transform = `translateY(${-8 * depth}px)`;
  swell.querySelector('.swell-mid').style.transform = `translateY(${-5 * depth}px)`;
  swell.querySelector('.swell-back').style.transform = `translateY(${-3 * depth}px)`;
}

function goTo(step) {
  if (step > STATE.step && !validateStep(STATE.step)) return;
  STATE.step = step;
  for (let n = 1; n <= 5; n++) $(`#panel-${n}`).hidden = n !== step;
  if (step === 3) renderPredict();
  if (step === 5) renderRecap();
  renderStepper();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==============================================================  STEP 1  */
function renderSubjectSelect() {
  const sel = $('#subject');
  sel.innerHTML = `<option value="">${t('subjectPh')}</option>` +
    SUBJECTS.map(s => `<option value="${s.id}">${s.name[STATE.lang]}</option>`).join('');
  sel.value = STATE.subjectId;
}

function renderSessionSelect() {
  const subject = getSubject();
  const list = subject ? subject.sessions : APP_CONFIG.allSessions;
  const sel = $('#session');
  sel.innerHTML = `<option value="">${t('sessionPh')}</option>` +
    list.map(code => `<option value="${code}">${sessionLabel(code)}</option>`).join('');
  sel.value = list.includes(STATE.session) ? STATE.session : '';
  STATE.session = sel.value;
}

function renderTimezoneSelect() {
  const sel = $('#timezone');
  const labels = { 'TZ1': 'TZ1', 'TZ2': 'TZ2', 'No timezone': STATE.lang === 'es' ? 'Sin timezone' : 'No timezone' };
  sel.innerHTML = APP_CONFIG.timezones.map(z => `<option value="${z}">${labels[z] || z}</option>`).join('');
  sel.value = STATE.timezone;
}

function renderGradeSelects() {
  ['#predictGrade', '#teacherGrade'].forEach(id => {
    const sel = $(id);
    const current = sel.value;
    sel.innerHTML = `<option value="">${t('gradePh')}</option>` +
      [7, 6, 5, 4, 3, 2, 1].map(g => `<option value="${g}">${g}</option>`).join('');
    sel.value = current;
  });
  $('#predictGrade').value = STATE.predictGrade;
  $('#teacherGrade').value = STATE.teacherGrade;
}

function renderSyllabusNotice() {
  const subject = getSubject();
  const box = $('#syllabusNotice');
  if (subject && subject.syllabusNote) {
    box.querySelector('span').textContent = localised(subject.syllabusNote);
    box.hidden = false;
  } else {
    box.hidden = true;
  }
}

/* ==============================================================  STEP 2  */
function renderPapers() {
  const cfg = getLevelConfig();
  const host = $('#paperRows');
  if (!cfg) { host.innerHTML = ''; $('#combinedValue').textContent = '—'; return; }

  host.innerHTML = cfg.sat.map(p => {
    const entry = STATE.marks[p.id] || { mark: '', max: p.max };
    return `
      <div class="paper-row" data-paper="${p.id}">
        <div class="paper-head">
          <p class="paper-name">${localised(p.label)}</p>
          <span class="paper-meta">${t('weight')} ${p.weight}%</span>
        </div>
        <div class="field">
          <label for="mark-${p.id}">${t('markObtained')}</label>
          <input type="number" id="mark-${p.id}" class="mark-input" data-paper="${p.id}"
                 min="0" step="1" value="${entry.mark}">
        </div>
        <div class="field">
          <label for="max-${p.id}">${t('outOf')}</label>
          <input type="number" id="max-${p.id}" class="max-input" data-paper="${p.id}"
                 min="1" step="1" value="${entry.max}">
        </div>
        <div class="paper-pct" data-pct="${p.id}">—</div>
      </div>`;
  }).join('');

  host.querySelectorAll('.mark-input, .max-input').forEach(input => {
    input.addEventListener('input', e => {
      const id = e.target.dataset.paper;
      const key = e.target.classList.contains('mark-input') ? 'mark' : 'max';
      STATE.marks[id] = STATE.marks[id] || { mark: '', max: 0 };
      STATE.marks[id][key] = e.target.value;
      e.target.closest('.paper-row').classList.remove('has-error');
      refreshPercentages();
    });
  });

  refreshPercentages();
}

function refreshPercentages() {
  const cfg = getLevelConfig();
  if (!cfg) return;
  cfg.sat.forEach(p => {
    const cell = document.querySelector(`[data-pct="${p.id}"]`);
    if (cell) cell.textContent = fmtPct(paperPct(p.id));
  });
  $('#combinedValue').textContent = fmtPct(combinedPct());
}

/* ==============================================================  STEP 3  */
function renderPredict() {
  const subject = getSubject();
  if (!subject) return;

  $('#setupList').innerHTML = [
    [t('subject'), subjectName(subject)],
    [t('level'), STATE.level],
    [t('session'), sessionLabel(STATE.session)],
    [t('timezone'), STATE.timezone]
  ].map(([k, v]) => `<li><span class="k">${k}</span><span class="v">${v}</span></li>`).join('');

  const rows = [
    ...satRows().map(r => ({
      label: localised(r.label), mark: `${r.mark} / ${r.max}`, sat: true
    })),
    ...estimatedRows().map(r => ({
      label: localised(r.label), mark: `${r.mark} / ${r.max}`, sat: false
    }))
  ];

  $('#predictRows').innerHTML = rows.map(r => `
    <tr>
      <td>${r.label}</td>
      <td class="num">${r.mark}</td>
      <td><span class="tag ${r.sat ? 'tag-sat' : 'tag-est'}">${r.sat ? t('sourceSat') : t('sourceEstimated')}</span></td>
    </tr>`).join('');

  const cfg = getLevelConfig();
  const hasIA = cfg && cfg.estimated.some(c => c.id === 'IA');
  $('#realIALine').hidden = !hasIA;
  $('#realIAField').hidden = !(hasIA && STATE.useRealIA);
  if (hasIA) {
    const ia = cfg.estimated.find(c => c.id === 'IA');
    $('#realIAMark').max = ia.max;
    $('#realIAMark').placeholder = `0 – ${ia.max}`;
  }
}

/* ==============================================================  STEP 4  */
function renderComments() {
  const host = $('#commentBlocks');
  host.innerHTML = COMMENT_SECTIONS.map(sec => {
    const c = STATE.comments[sec.id] || { text: '', skipped: false };
    return `
      <div class="comment-block ${c.skipped ? 'is-skipped' : ''}" data-comment="${sec.id}">
        <div class="comment-head">
          <h3 class="comment-title">${localised(sec.title)}</h3>
          <label class="skip-toggle">
            <input type="checkbox" class="skip-input" data-comment="${sec.id}" ${c.skipped ? 'checked' : ''}>
            <span>${t('skip')}</span>
          </label>
        </div>
        <p class="comment-hint">${localised(sec.hint)}</p>
        <textarea class="comment-input" data-comment="${sec.id}"
                  maxlength="${APP_CONFIG.commentMax}">${c.text}</textarea>
        <span class="counter" data-counter="${sec.id}"></span>
      </div>`;
  }).join('');

  host.querySelectorAll('.comment-input').forEach(area => {
    area.addEventListener('input', e => {
      const id = e.target.dataset.comment;
      STATE.comments[id] = STATE.comments[id] || { text: '', skipped: false };
      STATE.comments[id].text = e.target.value;
      e.target.closest('.comment-block').classList.remove('has-error');
      updateCounter(id);
    });
    updateCounter(area.dataset.comment);
  });

  host.querySelectorAll('.skip-input').forEach(box => {
    box.addEventListener('change', e => {
      const id = e.target.dataset.comment;
      STATE.comments[id] = STATE.comments[id] || { text: '', skipped: false };
      STATE.comments[id].skipped = e.target.checked;
      const block = e.target.closest('.comment-block');
      block.classList.toggle('is-skipped', e.target.checked);
      block.classList.remove('has-error');
      updateCounter(id);
    });
  });
}

function updateCounter(id) {
  const el = document.querySelector(`[data-counter="${id}"]`);
  if (!el) return;
  const c = STATE.comments[id] || { text: '', skipped: false };
  const n = c.text.trim().length;
  const min = APP_CONFIG.commentMin, max = APP_CONFIG.commentMax;

  el.classList.remove('is-ok', 'is-over');
  if (n < min) {
    el.textContent = t('charsLeft', { n: min - n });
  } else if (n > max) {
    el.textContent = t('charsOver', { n: n - max });
    el.classList.add('is-over');
  } else {
    el.textContent = t('charsOk', { n, max });
    el.classList.add('is-ok');
  }
}

/* ===========================================================  VALIDATION  */
function markError(field, on) {
  const wrap = field.closest('.field');
  if (wrap) wrap.classList.toggle('has-error', on);
}

function validateStep(step) {
  let ok = true;

  if (step === 1) {
    [['#teacher', 'teacher'], ['#student', 'student'], ['#subject', 'subjectId'], ['#session', 'session']]
      .forEach(([sel, key]) => {
        const el = $(sel);
        const empty = !String(el.value).trim();
        markError(el, empty);
        if (empty) ok = false; else STATE[key] = el.value.trim();
      });
  }

  if (step === 2) {
    const cfg = getLevelConfig();
    cfg.sat.forEach(p => {
      const entry = STATE.marks[p.id] || {};
      const mark = Number(entry.mark), max = Number(entry.max);
      const bad = entry.mark === '' || !Number.isFinite(mark) || mark < 0 || !max || mark > max;
      const row = document.querySelector(`.paper-row[data-paper="${p.id}"]`);
      if (row) row.classList.toggle('has-error', bad);
      if (bad) ok = false;
    });
    if (!ok) alert(t('fixErrors'));
  }

  if (step === 3) {
    [['#predictGrade', 'predictGrade'], ['#boundary', 'boundary'], ['#teacherGrade', 'teacherGrade']]
      .forEach(([sel, key]) => {
        const el = $(sel);
        const empty = !String(el.value).trim();
        markError(el, empty);
        if (empty) ok = false; else STATE[key] = el.value.trim();
      });
    STATE.predictPct = $('#predictPct').value;
  }

  if (step === 4) {
    COMMENT_SECTIONS.forEach(sec => {
      const c = STATE.comments[sec.id] || { text: '', skipped: false };
      const bad = !c.skipped && c.text.trim().length < APP_CONFIG.commentMin;
      const block = document.querySelector(`[data-comment="${sec.id}"].comment-block`);
      if (block) block.classList.toggle('has-error', bad);
      if (bad) ok = false;
    });
    if (!ok) alert(t('commentShort', { min: APP_CONFIG.commentMin }));
  }

  return ok;
}

/* ================================================================  STEP 5 */
function renderRecap() {
  const subject = getSubject();
  const rows = [
    [t('student'), STATE.student],
    [t('subject'), `${subjectName(subject)} ${STATE.level}`],
    [t('session'), `${sessionLabel(STATE.session)} · ${STATE.timezone}`],
    ...satRows().map(r => [localised(r.label), `${r.mark} / ${r.max} · ${fmtPct(r.pct)}`]),
    [t('combined'), fmtPct(combinedPct())],
    [t('ibPredictGrade'), STATE.predictGrade],
    [t('gradeBoundary'), STATE.boundary],
    [t('teacherPrediction'), STATE.teacherGrade]
  ];
  $('#recap').innerHTML = rows.map(([k, v]) =>
    `<div class="recap-row"><span class="k">${k}</span><span class="v num">${v}</span></div>`).join('');

  $('#doneLead').textContent = `${STATE.student} · ${subjectName(subject)} ${STATE.level}`;
}

function setStatus(kind, message) {
  const el = $('#sendStatus');
  if (!kind) { el.hidden = true; return; }
  el.hidden = false;
  el.className = `status ${kind}`;
  el.textContent = message;
}

async function buildPdf() {
  const { blob, filename } = await generateReportPdf();
  STATE.pdfBlob = blob;
  STATE.pdfFilename = filename;
}

function downloadPdf() {
  if (!STATE.pdfBlob) return;
  const url = URL.createObjectURL(STATE.pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = STATE.pdfFilename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const blobToBase64 = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

async function emailPdf() {
  if (!APP_CONFIG.emailEndpoint) {
    setStatus('bad', t('mailFallbackHelp'));
    downloadPdf();
    const subject = getSubject();
    const body = encodeURIComponent(
      `${t('reportTitle')}\n${STATE.student} — ${subjectName(subject)} ${STATE.level}\n${sessionLabel(STATE.session)}`
    );
    window.location.href =
      `mailto:${APP_CONFIG.recipient}?subject=${encodeURIComponent(`${t('reportTitle')} — ${STATE.student}`)}&body=${body}`;
    return;
  }

  const btn = $('#emailBtn');
  btn.disabled = true;
  setStatus('busy', t('sending'));

  try {
    const subject = getSubject();
    const res = await fetch(APP_CONFIG.emailEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: APP_CONFIG.recipient,
        student: STATE.student,
        teacher: STATE.teacher,
        subject: subjectName(subject, 'en'),
        level: STATE.level,
        session: sessionLabel(STATE.session, 'en'),
        lang: STATE.lang,
        filename: STATE.pdfFilename,
        pdfBase64: await blobToBase64(STATE.pdfBlob)
      })
    });
    if (!res.ok) throw new Error(await res.text());
    setStatus('ok', t('sentOk', { email: APP_CONFIG.recipient }));
  } catch (err) {
    console.error(err);
    setStatus('bad', t('sendFail', { email: APP_CONFIG.recipient }));
  } finally {
    btn.disabled = false;
  }
}

/* ==================================================================  WIRE */
function wire() {
  $('#predictLink').href = APP_CONFIG.predictorUrl;
  $('#langBtn').addEventListener('click', () => setLanguage(STATE.lang === 'en' ? 'es' : 'en'));

  $('#stepper').addEventListener('click', e => {
    const pip = e.target.closest('.step-pip');
    if (pip && pip.dataset.state === 'done') goTo(Number(pip.dataset.step));
  });

  $$('[data-go]').forEach(btn =>
    btn.addEventListener('click', () => goTo(Number(btn.dataset.go))));

  $('#subject').addEventListener('change', e => {
    STATE.subjectId = e.target.value;
    markError(e.target, false);
    renderSessionSelect();
    renderSyllabusNotice();
    seedMarks();
    renderPapers();
  });

  $$('input[name="level"]').forEach(radio =>
    radio.addEventListener('change', e => {
      STATE.level = e.target.value;
      seedMarks();
      renderPapers();
    }));

  ['#teacher', '#student', '#boundary', '#predictPct'].forEach(sel =>
    $(sel).addEventListener('input', e => {
      const key = sel.replace('#', '');
      STATE[key === 'predictPct' ? 'predictPct' : key] = e.target.value;
      markError(e.target, false);
    }));

  $('#session').addEventListener('change', e => { STATE.session = e.target.value; markError(e.target, false); });
  $('#timezone').addEventListener('change', e => { STATE.timezone = e.target.value; });
  $('#mockDate').addEventListener('change', e => { STATE.mockDate = e.target.value; });
  $('#predictGrade').addEventListener('change', e => { STATE.predictGrade = e.target.value; markError(e.target, false); });
  $('#teacherGrade').addEventListener('change', e => { STATE.teacherGrade = e.target.value; markError(e.target, false); });

  $('#useRealIA').addEventListener('change', e => {
    STATE.useRealIA = e.target.checked;
    $('#realIAField').hidden = !e.target.checked;
    renderPredict();
  });
  $('#realIAMark').addEventListener('input', e => {
    STATE.realIAMark = e.target.value;
    renderPredict();
  });

  $('#generateBtn').addEventListener('click', async () => {
    if (!validateStep(4)) return;
    const btn = $('#generateBtn');
    btn.disabled = true;
    try {
      await buildPdf();
      goTo(5);
      setStatus(null);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  $('#downloadBtn').addEventListener('click', downloadPdf);
  $('#emailBtn').addEventListener('click', emailPdf);
  $('#resetBtn').addEventListener('click', () => {
    if (confirm(STATE.lang === 'es' ? '¿Empezar un reporte nuevo?' : 'Start a new report?')) location.reload();
  });
}

/* ==================================================================  BOOT */
$('#mockDate').value = STATE.mockDate;
COMMENT_SECTIONS.forEach(s => { STATE.comments[s.id] = { text: '', skipped: false }; });
wire();
applyLanguage();
goTo(1);
