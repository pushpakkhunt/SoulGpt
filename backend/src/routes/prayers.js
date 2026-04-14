/* ============================================================
   SoulGPT — Prayers Route
   File: backend/src/routes/prayers.js
   ============================================================ */

   const express = require('express');
   const router = express.Router();
   
   const PRAYER_CATALOG = [
     // ── Hindu ──────────────────────────────────────────────
     {
       key: 'hanuman-chalisa',
       searchKeys: ['hanuman chalisa', 'hanuman'],
       title: 'Hanuman Chalisa',
       tradition: 'Hindu',
       deity: 'Hanuman',
       language: 'Hindi / Sanskrit',
       description:
         '40-verse hymn to Lord Hanuman written by Tulsidas. Chanting removes obstacles, fear, and grants courage.',
       r2Key: 'Prayers/Hindu/hanuman-chalisa.mp3',
     },
     {
       key: 'gayatri-mantra',
       searchKeys: ['gayatri mantra', 'gayatri'],
       title: 'Gayatri Mantra',
       tradition: 'Hindu',
       deity: 'Savitr (Sun)',
       language: 'Sanskrit',
       description:
         'One of the most sacred Vedic mantras. A prayer for divine wisdom and enlightenment.',
       r2Key: 'Prayers/Hindu/gayatri-mantra.mp3',
     },
     {
       key: 'om-namah-shivaya',
       searchKeys: ['om namah shivaya', 'shiva mantra'],
       title: 'Om Namah Shivaya',
       tradition: 'Hindu',
       deity: 'Shiva',
       language: 'Sanskrit',
       description:
         'The Panchakshara — five-syllable mantra devoted to Shiva. Purifies mind and grants liberation.',
       r2Key: 'Prayers/Hindu/om-namah-shivaya.mp3',
     },
     {
       key: 'ganesh-aarti',
       searchKeys: ['ganesh aarti', 'ganpati'],
       title: 'Ganesh Aarti',
       tradition: 'Hindu',
       deity: 'Ganesha',
       language: 'Hindi',
       description:
         'Devotional hymn to Lord Ganesha, remover of obstacles. Sung before any new beginning.',
       r2Key: 'Prayers/Hindu/ganesh-aarti.mp3',
     },
   
     // ── Islam ──────────────────────────────────────────────
     {
       key: 'surah-al-fatiha',
       searchKeys: ['surah al fatiha', 'al fatiha', 'fatiha'],
       title: 'Surah Al-Fatiha',
       tradition: 'Islam',
       deity: null,
       language: 'Arabic',
       description:
         'The Opening — first chapter of the Quran. Recited in every unit of Islamic prayer.',
       r2Key: 'Prayers/Islam/surah-al-fatiha.mp3',
     },
     {
       key: 'ayatul-kursi',
       searchKeys: ['ayatul kursi', 'ayat ul kursi'],
       title: 'Ayatul Kursi',
       tradition: 'Islam',
       deity: null,
       language: 'Arabic',
       description:
         'The Throne Verse — Quran 2:255. Protection prayer recited morning and evening.',
       r2Key: 'Prayers/Islam/ayatul-kursi.mp3',
     },
   
     // ── Christian ─────────────────────────────────────────
     {
       key: 'lords-prayer',
       searchKeys: ["lord's prayer", 'lords prayer', 'our father'],
       title: "Lord's Prayer",
       tradition: 'Christian',
       deity: null,
       language: 'English',
       description: 'The prayer Jesus taught his disciples. Matthew 6:9–13.',
       r2Key: 'Prayers/Christian/lords-prayer.mp3',
     },
   
     // ── Jain ──────────────────────────────────────────────
     {
       key: 'navkar-mantra',
       searchKeys: ['navkar mantra', 'namokar mantra'],
       title: 'Navkar Mantra',
       tradition: 'Jain',
       deity: null,
       language: 'Prakrit',
       description:
         'The most sacred Jain prayer, saluting the five supreme beings (Pancha Paramesthi).',
       r2Key: 'Prayers/Jain/navkar-mantra.mp3',
     },
   
     // ── Sikh ──────────────────────────────────────────────
     {
       key: 'waheguru-simran',
       searchKeys: ['waheguru', 'waheguru simran'],
       title: 'Waheguru Simran',
       tradition: 'Sikh',
       deity: null,
       language: 'Punjabi',
       description:
         'Meditative repetition of the divine name Waheguru. Calms the mind and connects to the divine.',
       r2Key: 'Prayers/Sikh/waheguru-simran.mp3',
     },
     {
       key: 'japji-sahib',
       searchKeys: ['japji sahib', 'japji'],
       title: 'Japji Sahib',
       tradition: 'Sikh',
       deity: null,
       language: 'Punjabi',
       description:
         'Opening bani of the Guru Granth Sahib by Guru Nanak Dev Ji. Recited every morning.',
       r2Key: 'Prayers/Sikh/japji-sahib.mp3',
     },
   ];
   
   // ── Cloudflare R2 public base URL ─────────────────────────
   const R2_PUBLIC_URL =
     process.env.CLOUDFLARE_R2_PUBLIC_URL ||
     'https://pub-75e25c6afc484778a41fc8dde483222b.r2.dev';
   
   /**
    * GET /api/prayers
    * Get full prayer catalog, optionally filtered by tradition.
    */
   router.get('/', (req, res) => {
     const { tradition } = req.query;
   
     const list = tradition
       ? PRAYER_CATALOG.filter(
           (p) => p.tradition.toLowerCase() === tradition.toLowerCase()
         )
       : PRAYER_CATALOG;
   
     const safe = list.map(({ r2Key, ...prayer }) => prayer);
     res.json({ prayers: safe });
   });
   
   /**
    * GET /api/prayers/:key/stream
    * Returns the public Cloudflare R2 URL for the prayer audio.
    *
    * Important:
    * Do not send hardcoded duration here.
    * The frontend player should read the real duration from audio metadata.
    */
   router.get('/:key/stream', async (req, res, next) => {
     try {
       const prayer = PRAYER_CATALOG.find((p) => p.key === req.params.key);
   
       if (!prayer) {
         return res.status(404).json({ error: 'Prayer not found' });
       }
   
       const audioUrl = prayer.r2Key
         ? `${R2_PUBLIC_URL}/${prayer.r2Key}`
         : null;
   
       res.json({
         key: prayer.key,
         title: prayer.title,
         tradition: prayer.tradition,
         audioUrl,
       });
     } catch (err) {
       next(err);
     }
   });
   
   module.exports = router;
   module.exports.PRAYER_CATALOG = PRAYER_CATALOG;