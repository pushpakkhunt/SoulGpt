/* ============================================================
   SoulGPT — Prayers Route
   File: backend/src/routes/prayers.js

   In production:
   - Audio files are stored in AWS S3 / Cloudflare R2
   - Signed URLs are generated per-request (15-minute expiry)
   - Metadata is stored in MongoDB
   ============================================================ */

const express = require('express');
const router  = express.Router();

// ── Prayer Catalog ───────────────────────────────────────
// In production, load this from MongoDB.
// For now it's a static catalog — easy to expand.
const PRAYER_CATALOG = [
  // ── Hindu ──────────────────────────────────────────────
  {
    key:         'hanuman-chalisa',
    searchKeys:  ['hanuman chalisa', 'hanuman'],
    title:       'Hanuman Chalisa',
    tradition:   'Hindu',
    deity:       'Hanuman',
    language:    'Hindi / Sanskrit',
    durationSecs: 503,
    duration:    '8:23',
    description: '40-verse hymn to Lord Hanuman written by Tulsidas. Chanting removes obstacles, fear, and grants courage.',
    s3Key:       'prayers/hindu/hanuman-chalisa.mp3',
  },
  {
    key:         'gayatri-mantra',
    searchKeys:  ['gayatri mantra', 'gayatri'],
    title:       'Gayatri Mantra',
    tradition:   'Hindu',
    deity:       'Savitr (Sun)',
    language:    'Sanskrit',
    durationSecs: 255,
    duration:    '4:15',
    description: 'One of the most sacred Vedic mantras. A prayer for divine wisdom and enlightenment.',
    s3Key:       'prayers/hindu/gayatri-mantra.mp3',
  },
  {
    key:         'om-namah-shivaya',
    searchKeys:  ['om namah shivaya', 'shiva mantra'],
    title:       'Om Namah Shivaya',
    tradition:   'Hindu',
    deity:       'Shiva',
    language:    'Sanskrit',
    durationSecs: 360,
    duration:    '6:00',
    description: 'The Panchakshara — five-syllable mantra devoted to Shiva. Purifies mind and grants liberation.',
    s3Key:       'prayers/hindu/om-namah-shivaya.mp3',
  },
  {
    key:         'ganesh-aarti',
    searchKeys:  ['ganesh aarti', 'ganpati'],
    title:       'Ganesh Aarti',
    tradition:   'Hindu',
    deity:       'Ganesha',
    language:    'Hindi',
    durationSecs: 190,
    duration:    '3:10',
    description: 'Devotional hymn to Lord Ganesha, remover of obstacles. Sung before any new beginning.',
    s3Key:       'prayers/hindu/ganesh-aarti.mp3',
  },
  // ── Islam ──────────────────────────────────────────────
  {
    key:         'surah-al-fatiha',
    searchKeys:  ['surah al fatiha', 'al fatiha', 'fatiha'],
    title:       'Surah Al-Fatiha',
    tradition:   'Islam',
    deity:       null,
    language:    'Arabic',
    durationSecs: 72,
    duration:    '1:12',
    description: 'The Opening — first chapter of the Quran. Recited in every unit of Islamic prayer.',
    s3Key:       'prayers/islam/surah-al-fatiha.mp3',
  },
  {
    key:         'ayatul-kursi',
    searchKeys:  ['ayatul kursi', 'ayat ul kursi'],
    title:       'Ayatul Kursi',
    tradition:   'Islam',
    deity:       null,
    language:    'Arabic',
    durationSecs: 150,
    duration:    '2:30',
    description: 'The Throne Verse — Quran 2:255. Protection prayer recited morning and evening.',
    s3Key:       'prayers/islam/ayatul-kursi.mp3',
  },
  // ── Christian ─────────────────────────────────────────
  {
    key:         'lords-prayer',
    searchKeys:  ["lord's prayer", 'lords prayer', 'our father'],
    title:       "Lord's Prayer",
    tradition:   'Christian',
    deity:       null,
    language:    'English',
    durationSecs: 105,
    duration:    '1:45',
    description: 'The prayer Jesus taught his disciples. Matthew 6:9–13.',
    s3Key:       'prayers/christian/lords-prayer.mp3',
  },
  // ── Jain ──────────────────────────────────────────────
  {
    key:         'navkar-mantra',
    searchKeys:  ['navkar mantra', 'namokar mantra'],
    title:       'Navkar Mantra',
    tradition:   'Jain',
    deity:       null,
    language:    'Prakrit',
    durationSecs: 120,
    duration:    '2:00',
    description: 'The most sacred Jain prayer, saluting the five supreme beings (Pancha Paramesthi).',
    s3Key:       'prayers/jain/navkar-mantra.mp3',
  },
  // ── Sikh ──────────────────────────────────────────────
  {
    key:         'waheguru-simran',
    searchKeys:  ['waheguru', 'waheguru simran'],
    title:       'Waheguru Simran',
    tradition:   'Sikh',
    deity:       null,
    language:    'Punjabi',
    durationSecs: 300,
    duration:    '5:00',
    description: 'Meditative repetition of the divine name Waheguru. Calms the mind and connects to the divine.',
    s3Key:       'prayers/sikh/waheguru-simran.mp3',
  },
  {
    key:         'japji-sahib',
    searchKeys:  ['japji sahib', 'japji'],
    title:       'Japji Sahib',
    tradition:   'Sikh',
    deity:       null,
    language:    'Punjabi',
    durationSecs: 720,
    duration:    '12:00',
    description: 'Opening bani of the Guru Granth Sahib by Guru Nanak Dev Ji. Recited every morning.',
    s3Key:       'prayers/sikh/japji-sahib.mp3',
  },
];

/**
 * GET /api/prayers
 * Get full prayer catalog, optionally filtered by tradition.
 */
router.get('/', (req, res) => {
  const { tradition } = req.query;
  const list = tradition
    ? PRAYER_CATALOG.filter(p => p.tradition.toLowerCase() === tradition.toLowerCase())
    : PRAYER_CATALOG;

  // Don't expose S3 keys in the list response
  const safe = list.map(({ s3Key, ...p }) => p);
  res.json({ prayers: safe });
});

/**
 * GET /api/prayers/:key/stream
 * Get a signed streaming URL for a prayer audio file.
 *
 * In production: generate a 15-minute signed AWS S3 / Cloudflare R2 URL.
 * In development: return a placeholder.
 */
router.get('/:key/stream', async (req, res, next) => {
  try {
    const prayer = PRAYER_CATALOG.find(p => p.key === req.params.key);
    if (!prayer) return res.status(404).json({ error: 'Prayer not found' });

    let audioUrl;

    if (process.env.AWS_S3_BUCKET) {
      // Production: generate signed S3 URL
      const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
      const { getSignedUrl }               = require('@aws-sdk/s3-request-presigner');

      const s3 = new S3Client({ region: process.env.AWS_REGION });
      const cmd = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key:    prayer.s3Key,
      });
      audioUrl = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 min
    } else {
      // Development: return null (frontend simulates playback)
      audioUrl = null;
    }

    res.json({
      key:         prayer.key,
      title:       prayer.title,
      tradition:   prayer.tradition,
      durationSecs: prayer.durationSecs,
      audioUrl,
    });
  } catch (err) { next(err); }
});

module.exports = router;
module.exports.PRAYER_CATALOG = PRAYER_CATALOG;
