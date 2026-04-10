/* ============================================================
   SoulGPT — Utility Functions
   File: frontend/src/lib/utils.js
   ============================================================ */

/** Maps tradition name → CSS badge class */
export const TRADITION_BADGE_MAP = {
  hindu:     't-h',
  hinduism:  't-h',
  islam:     't-i',
  muslim:    't-i',
  christian: 't-c',
  christianity: 't-c',
  jain:      't-j',
  jainism:   't-j',
  sikh:      't-s',
  sikhism:   't-s',
  buddhist:  't-a',
  buddhism:  't-a',
  all:       't-a',
};

/**
 * Convert raw response text into safe HTML:
 * - *text* → <em>text</em>  (italics for scripture quotes)
 * - \n     → <br>
 * - Escapes < > &
 */
export function formatMessage(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

/**
 * Detect intent from user message (client-side fast path).
 * The real detection happens on the backend; this is used for
 * optimistic UI only.
 */
export function detectIntent(text) {
  const l = text.toLowerCase();

  // Prayer / audio requests
  const PRAYERS = [
    'hanuman chalisa', 'gayatri mantra', 'om namah shivaya', 'ganesh aarti',
    'surah al fatiha', 'al fatiha', 'ayatul kursi',
    "lord's prayer", 'lords prayer', 'amazing grace',
    'navkar mantra', 'waheguru', 'japji sahib',
  ];
  for (const p of PRAYERS) {
    if (l.includes(p)) return { type: 'prayer', key: p };
  }
  if (l.includes('play') && (l.includes('mantra') || l.includes('chalisa') || l.includes('prayer'))) {
    return { type: 'prayer', key: 'hanuman chalisa' };
  }

  // Topic intents
  if (l.includes('purpose') || l.includes('meaning of life') || l.includes('what should i do'))
    return { type: 'purpose' };
  if (l.includes('anxiet') || l.includes('worry') || l.includes('stress') || l.includes('fear'))
    return { type: 'anxiety' };
  if (l.includes('grief') || l.includes('loss') || l.includes('death') || l.includes('died') || l.includes('sad'))
    return { type: 'grief' };
  if (l.includes('lost') || l.includes('confused') || l.includes("don't know") || l.includes('direction'))
    return { type: 'lost' };

  return { type: 'general' };
}

/** Format seconds as M:SS */
export function formatTime(secs) {
  const s = Math.round(secs);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Debounce utility */
export function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
