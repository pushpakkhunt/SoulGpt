/* ============================================================
   SoulGPT — Utility Functions
   File: frontend/src/lib/utils.js
   ============================================================ */

/** Maps tradition name → CSS badge class */
export const TRADITION_BADGE_MAP = {
  hindu: 't-h',
  hinduism: 't-h',
  islam: 't-i',
  muslim: 't-i',
  christian: 't-c',
  christianity: 't-c',
  jain: 't-j',
  jainism: 't-j',
  sikh: 't-s',
  sikhism: 't-s',
  buddhist: 't-a',
  buddhism: 't-a',
  all: 't-a',
};

/**
 * Escape unsafe HTML characters
 */
function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Lightweight rich formatting for assistant messages:
 * - Escapes unsafe HTML
 * - *text* → <em>text</em>
 * - Preserves paragraph spacing
 * - Makes simple headings stand out
 * - Keeps essay-style responses readable
 */
export function formatMessage(text) {
  const safe = escapeHtml(text).trim();
  if (!safe) return '';

  const blocks = safe
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const html = blocks.map((block) => {
    const line = block
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    // Simple heading detection
    const plainLine = block.replace(/\*/g, '').trim();

    const isHeading =
      plainLine.length > 0 &&
      plainLine.length <= 80 &&
      !plainLine.includes('.') &&
      !plainLine.includes('?') &&
      !plainLine.includes('!') &&
      (
        /^[A-Z0-9\s:—\-]+$/.test(plainLine) ||
        /^part\s+\w+/i.test(plainLine) ||
        /^introduction$/i.test(plainLine) ||
        /^conclusion$/i.test(plainLine)
      );

    if (isHeading) {
      return `<div class="msg-heading">${line}</div>`;
    }

    return `<div class="msg-para">${line}</div>`;
  });

  return html.join('');
}

/**
 * Detect intent from user message (client-side fast path).
 * The real detection happens on the backend; this is used for
 * optimistic UI only.
 */
export function detectIntent(text) {
  const l = String(text || '').toLowerCase();

  // Prayer / audio requests
  const PRAYERS = [
    'hanuman chalisa',
    'gayatri mantra',
    'om namah shivaya',
    'ganesh aarti',
    'surah al fatiha',
    'al fatiha',
    'ayatul kursi',
    "lord's prayer",
    'lords prayer',
    'amazing grace',
    'navkar mantra',
    'waheguru',
    'waheguru simran',
    'japji sahib',
  ];

  for (const p of PRAYERS) {
    if (l.includes(p)) return { type: 'prayer', key: p };
  }

  if (
    l.includes('play') &&
    (
      l.includes('mantra') ||
      l.includes('chalisa') ||
      l.includes('prayer') ||
      l.includes('aarti') ||
      l.includes('simran')
    )
  ) {
    return { type: 'prayer', key: 'hanuman chalisa' };
  }

  // Topic intents
  if (
    l.includes('purpose') ||
    l.includes('meaning of life') ||
    l.includes('what should i do') ||
    l.includes('calling')
  ) {
    return { type: 'purpose' };
  }

  if (
    l.includes('anxiet') ||
    l.includes('worry') ||
    l.includes('stress') ||
    l.includes('fear') ||
    l.includes('panic')
  ) {
    return { type: 'anxiety' };
  }

  if (
    l.includes('grief') ||
    l.includes('loss') ||
    l.includes('death') ||
    l.includes('died') ||
    l.includes('sad')
  ) {
    return { type: 'grief' };
  }

  if (
    l.includes('lost') ||
    l.includes('confused') ||
    l.includes("don't know") ||
    l.includes('direction')
  ) {
    return { type: 'lost' };
  }

  if (
    l.includes('compare') ||
    l.includes('difference between') ||
    l.includes('which religion')
  ) {
    return { type: 'comparison' };
  }

  if (
    l.includes('essay') ||
    l.includes('2 page') ||
    l.includes('two page') ||
    l.includes('write about')
  ) {
    return { type: 'longform' };
  }

  return { type: 'general' };
}

/** Format seconds as M:SS */
export function formatTime(secs) {
  const s = Math.max(0, Math.round(Number(secs) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Debounce utility */
export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}