/* =============================================================================
   state.js — the single mutable object plus every calculation in the app.
   ========================================================================== */

const STATE = {
  lang: (localStorage.getItem('ibwave-lang') === 'es' || localStorage.getItem('ibwave-lang') === 'en')
    ? localStorage.getItem('ibwave-lang')
    : (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en',
  step: 1,

  teacher: '',
  student: '',
  subjectId: '',
  level: 'HL',
  session: '',
  timezone: 'TZ1',
  mockDate: new Date().toISOString().slice(0, 10),

  marks: {},        // { P1: {mark, max}, P2: {mark, max} }
  useRealIA: false,
  realIAMark: null,

  predictGrade: '',
  predictPct: '',
  boundary: '',
  teacherGrade: '',

  comments: {},     // { attitude: {text, skipped}, ... }

  pdfBlob: null,
  pdfFilename: ''
};

/* --- Lookups ------------------------------------------------------------ */
const getSubject = () => SUBJECTS.find(s => s.id === STATE.subjectId) || null;

const getLevelConfig = () => {
  const s = getSubject();
  return s ? s.levels[STATE.level] : null;
};

const subjectName = (subject, lang = STATE.lang) =>
  subject ? subject.name[lang] : '';

const subjectShort = (subject, lang = STATE.lang) =>
  subject ? (subject.short ? subject.short[lang] : subject.name[lang]) : '';

const localised = (obj, lang = STATE.lang) =>
  obj && typeof obj === 'object' ? (obj[lang] ?? obj.en) : obj;

/* --- Session label ------------------------------------------------------
   'M25' -> 'May 2025' / 'Mayo 2025'                                       */
function sessionLabel(code, lang = STATE.lang) {
  if (!code) return '';
  const month = code[0] === 'M'
    ? (lang === 'es' ? 'Mayo' : 'May')
    : (lang === 'es' ? 'Noviembre' : 'November');
  return `${month} 20${code.slice(1)}`;
}

/* --- Percentages --------------------------------------------------------
   Each paper is scored on its own, then the two are combined using the
   official component weightings, renormalised over the papers actually sat.
   This keeps the combined figure on the same scale IB uses, so it can be
   applied straight to the components the student did not sit.            */
function paperPct(id) {
  const entry = STATE.marks[id];
  if (!entry || entry.mark === '' || entry.mark === null || !entry.max) return null;
  const pct = (Number(entry.mark) / Number(entry.max)) * 100;
  return Number.isFinite(pct) ? pct : null;
}

function combinedPct() {
  const cfg = getLevelConfig();
  if (!cfg) return null;
  let num = 0, den = 0;
  for (const p of cfg.sat) {
    const pct = paperPct(p.id);
    if (pct === null) return null;
    num += pct * p.weight;
    den += p.weight;
  }
  return den ? num / den : null;
}

/* --- Marks to type into IB Predict ------------------------------------- */
function estimatedRows() {
  const cfg = getLevelConfig();
  const pct = combinedPct();
  if (!cfg || pct === null) return [];

  return cfg.estimated.map(c => {
    const isRealIA = c.id === 'IA' && STATE.useRealIA
      && STATE.realIAMark !== null && STATE.realIAMark !== '';
    const mark = isRealIA
      ? Math.min(Number(STATE.realIAMark), c.max)
      : Math.round((pct / 100) * c.max);
    return { ...c, mark, isReal: isRealIA };
  });
}

function satRows() {
  const cfg = getLevelConfig();
  if (!cfg) return [];
  return cfg.sat.map(p => ({
    ...p,
    mark: STATE.marks[p.id]?.mark ?? '',
    max: STATE.marks[p.id]?.max ?? p.max,
    pct: paperPct(p.id)
  }));
}

/* --- Reset ------------------------------------------------------------- */
function seedMarks() {
  const cfg = getLevelConfig();
  STATE.marks = {};
  if (!cfg) return;
  for (const p of cfg.sat) STATE.marks[p.id] = { mark: '', max: p.max };
}

const fmtPct = v => (v === null || v === undefined ? '—' : `${v.toFixed(1)}%`);
