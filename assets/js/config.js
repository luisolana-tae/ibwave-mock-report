/* =============================================================================
   IB WAVE — Mock Report Generator
   config.js  ·  SINGLE SOURCE OF TRUTH
   -----------------------------------------------------------------------------
   To add a subject in v2, append one object to SUBJECTS. Nothing else changes.
   All max marks are pre-filled defaults and remain editable by the teacher,
   because component totals vary between sessions. Weights come from the
   IB subject guides — verify before each exam cycle.
   ========================================================================== */

/* --- Global behaviour -------------------------------------------------- */
const APP_CONFIG = {
  // Comment length rules (characters). Change here, applies everywhere.
  commentMin: 300,
  commentMax: 1000,

  // Where the report is emailed to.
  recipient: 'luis.solana@thinkaheadeducation.com',

  // Backend endpoint that sends the email (see /api/send-report.js).
  // On Vercel the API sits on the same domain, so the relative path just works.
  // Leave as '' to disable sending and fall back to download + mail client.
  emailEndpoint: '/api/send-report',

  // External predictor.
  predictorUrl: 'https://ibpredict.org',

  // Exam sessions offered, newest first. Add new ones as they are released.
  allSessions: ['N25', 'M25', 'N24', 'M24', 'N23', 'M23', 'N22', 'M22'],

  timezones: ['TZ1', 'TZ2', 'No timezone']
};

/* --- Helpers used by config -------------------------------------------- */
const IA = (max, weight, esName) => ({
  id: 'IA',
  label: { en: 'Internal Assessment', es: 'Evaluación Interna' },
  max, weight,
  note: { en: esName || 'Enter the real IA mark if the student already has one.',
          es: 'Introduce la nota real de la EI si el alumno ya la tiene.' }
});

const P3 = (max, weight) => ({
  id: 'P3',
  label: { en: 'Paper 3', es: 'Paper 3' },
  max, weight,
  note: { en: 'Not sat in the mock — estimated from Papers 1 and 2.',
          es: 'No se realiza en el mock — se estima a partir de los Papers 1 y 2.' }
});

/* --- Subjects ----------------------------------------------------------- */
const SUBJECTS = [
  /* ---------------------------------------------------------------- BIOLOGY */
  {
    id: 'biology',
    name: { en: 'Biology', es: 'Biología' },
    syllabusNote: {
      en: 'First exams 2025. Only M25 and N25 past papers match the current syllabus.',
      es: 'Primeros exámenes 2025. Solo los papers de M25 y N25 corresponden al programa vigente.'
    },
    sessions: ['N25', 'M25'],
    levels: {
      HL: {
        sat: [
          { id: 'P1', label: { en: 'Paper 1 (1A + 1B)', es: 'Paper 1 (1A + 1B)' }, max: 75, weight: 36 },
          { id: 'P2', label: { en: 'Paper 2', es: 'Paper 2' }, max: 80, weight: 44 }
        ],
        estimated: [IA(24, 20)]
      },
      SL: {
        sat: [
          { id: 'P1', label: { en: 'Paper 1 (1A + 1B)', es: 'Paper 1 (1A + 1B)' }, max: 55, weight: 36 },
          { id: 'P2', label: { en: 'Paper 2', es: 'Paper 2' }, max: 50, weight: 44 }
        ],
        estimated: [IA(24, 20)]
      }
    }
  },

  /* -------------------------------------------------------------- CHEMISTRY */
  {
    id: 'chemistry',
    name: { en: 'Chemistry', es: 'Química' },
    syllabusNote: {
      en: 'First exams 2025. Only M25 and N25 past papers match the current syllabus.',
      es: 'Primeros exámenes 2025. Solo los papers de M25 y N25 corresponden al programa vigente.'
    },
    sessions: ['N25', 'M25'],
    levels: {
      HL: {
        sat: [
          { id: 'P1', label: { en: 'Paper 1 (1A + 1B)', es: 'Paper 1 (1A + 1B)' }, max: 75, weight: 36 },
          { id: 'P2', label: { en: 'Paper 2', es: 'Paper 2' }, max: 90, weight: 44 }
        ],
        estimated: [IA(24, 20)]
      },
      SL: {
        sat: [
          { id: 'P1', label: { en: 'Paper 1 (1A + 1B)', es: 'Paper 1 (1A + 1B)' }, max: 55, weight: 36 },
          { id: 'P2', label: { en: 'Paper 2', es: 'Paper 2' }, max: 50, weight: 44 }
        ],
        estimated: [IA(24, 20)]
      }
    }
  },

  /* ---------------------------------------------------------------- PHYSICS */
  {
    id: 'physics',
    name: { en: 'Physics', es: 'Física' },
    syllabusNote: {
      en: 'First exams 2025. Only M25 and N25 past papers match the current syllabus.',
      es: 'Primeros exámenes 2025. Solo los papers de M25 y N25 corresponden al programa vigente.'
    },
    sessions: ['N25', 'M25'],
    levels: {
      HL: {
        sat: [
          { id: 'P1', label: { en: 'Paper 1 (1A + 1B)', es: 'Paper 1 (1A + 1B)' }, max: 75, weight: 36 },
          { id: 'P2', label: { en: 'Paper 2', es: 'Paper 2' }, max: 90, weight: 44 }
        ],
        estimated: [IA(24, 20)]
      },
      SL: {
        sat: [
          { id: 'P1', label: { en: 'Paper 1 (1A + 1B)', es: 'Paper 1 (1A + 1B)' }, max: 55, weight: 36 },
          { id: 'P2', label: { en: 'Paper 2', es: 'Paper 2' }, max: 50, weight: 44 }
        ],
        estimated: [IA(24, 20)]
      }
    }
  },

  /* -------------------------------------------------- MATHEMATICS AA & AI */
  {
    id: 'maths-aa',
    name: { en: 'Mathematics: Analysis and Approaches', es: 'Matemáticas: Análisis y Enfoques' },
    short: { en: 'Maths AA', es: 'Matemáticas AA' },
    sessions: ['N25', 'M25', 'N24', 'M24', 'N23', 'M23'],
    levels: {
      HL: {
        sat: [
          { id: 'P1', label: { en: 'Paper 1 (no calculator)', es: 'Paper 1 (sin calculadora)' }, max: 110, weight: 30 },
          { id: 'P2', label: { en: 'Paper 2 (calculator)', es: 'Paper 2 (con calculadora)' }, max: 110, weight: 30 }
        ],
        estimated: [P3(55, 20), IA(20, 20)]
      },
      SL: {
        sat: [
          { id: 'P1', label: { en: 'Paper 1 (no calculator)', es: 'Paper 1 (sin calculadora)' }, max: 80, weight: 40 },
          { id: 'P2', label: { en: 'Paper 2 (calculator)', es: 'Paper 2 (con calculadora)' }, max: 80, weight: 40 }
        ],
        estimated: [IA(20, 20)]
      }
    }
  },
  {
    id: 'maths-ai',
    name: { en: 'Mathematics: Applications and Interpretation', es: 'Matemáticas: Aplicaciones e Interpretación' },
    short: { en: 'Maths AI', es: 'Matemáticas AI' },
    sessions: ['N25', 'M25', 'N24', 'M24', 'N23', 'M23'],
    levels: {
      HL: {
        sat: [
          { id: 'P1', label: { en: 'Paper 1', es: 'Paper 1' }, max: 110, weight: 30 },
          { id: 'P2', label: { en: 'Paper 2', es: 'Paper 2' }, max: 110, weight: 30 }
        ],
        estimated: [P3(55, 20), IA(20, 20)]
      },
      SL: {
        sat: [
          { id: 'P1', label: { en: 'Paper 1', es: 'Paper 1' }, max: 80, weight: 40 },
          { id: 'P2', label: { en: 'Paper 2', es: 'Paper 2' }, max: 80, weight: 40 }
        ],
        estimated: [IA(20, 20)]
      }
    }
  },

  /* -------------------------------------------------------------- ECONOMICS */
  {
    id: 'economics',
    name: { en: 'Economics', es: 'Economía' },
    sessions: ['N25', 'M25', 'N24', 'M24', 'N23', 'M23', 'N22', 'M22'],
    levels: {
      HL: {
        sat: [
          { id: 'P1', label: { en: 'Paper 1 (extended response)', es: 'Paper 1 (respuesta extensa)' }, max: 25, weight: 20 },
          { id: 'P2', label: { en: 'Paper 2 (data response)', es: 'Paper 2 (respuesta a datos)' }, max: 40, weight: 30 }
        ],
        estimated: [P3(60, 30), IA(45, 20)]
      },
      SL: {
        sat: [
          { id: 'P1', label: { en: 'Paper 1 (extended response)', es: 'Paper 1 (respuesta extensa)' }, max: 25, weight: 30 },
          { id: 'P2', label: { en: 'Paper 2 (data response)', es: 'Paper 2 (respuesta a datos)' }, max: 40, weight: 40 }
        ],
        estimated: [IA(45, 30)]
      }
    }
  },

  /* ---------------------------------------------------- BUSINESS MANAGEMENT */
  {
    id: 'business',
    name: { en: 'Business Management', es: 'Gestión Empresarial' },
    syllabusNote: {
      en: 'First exams 2024. Paper 1 uses a pre-released case study — hand it to students about a week before the mock.',
      es: 'Primeros exámenes 2024. El Paper 1 usa un caso de estudio previo — entrégalo a los alumnos una semana antes del mock.'
    },
    sessions: ['N25', 'M25', 'N24', 'M24'],
    levels: {
      HL: {
        sat: [
          { id: 'P1', label: { en: 'Paper 1 (pre-released case study)', es: 'Paper 1 (caso de estudio previo)' }, max: 40, weight: 25 },
          { id: 'P2', label: { en: 'Paper 2', es: 'Paper 2' }, max: 60, weight: 30 }
        ],
        estimated: [P3(25, 20), IA(25, 25)]
      },
      SL: {
        sat: [
          { id: 'P1', label: { en: 'Paper 1 (pre-released case study)', es: 'Paper 1 (caso de estudio previo)' }, max: 30, weight: 35 },
          { id: 'P2', label: { en: 'Paper 2', es: 'Paper 2' }, max: 50, weight: 40 }
        ],
        estimated: [IA(25, 25)]
      }
    }
  }
];

/* --- Comment sections --------------------------------------------------- */
const COMMENT_SECTIONS = [
  {
    id: 'attitude',
    title: { en: 'Attitude', es: 'Actitud' },
    hint: {
      en: 'Engagement, punctuality, response to feedback, independent work between sessions.',
      es: 'Implicación, puntualidad, respuesta al feedback, trabajo autónomo entre sesiones.'
    }
  },
  {
    id: 'theory',
    title: { en: 'Subject knowledge', es: 'Conocimientos teóricos' },
    hint: {
      en: 'Command of the syllabus, gaps by topic, accuracy of definitions and concepts.',
      es: 'Dominio del temario, lagunas por tema, precisión en definiciones y conceptos.'
    }
  },
  {
    id: 'technique',
    title: { en: 'Exam technique', es: 'Técnica de examen' },
    hint: {
      en: 'Timing, command terms, structure of answers, use of the mark scheme logic.',
      es: 'Gestión del tiempo, command terms, estructura de las respuestas, uso de la lógica del mark scheme.'
    }
  },
  {
    id: 'general',
    title: { en: 'Overall comment', es: 'Comentario general' },
    hint: {
      en: 'Where the student stands and the two or three things that will move the grade.',
      es: 'Situación del alumno y las dos o tres cosas que moverán la nota.'
    }
  }
];
