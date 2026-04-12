/* ============================================================
   SoulGPT — Audio Player Component
   File: frontend/src/components/AudioPlayer.js
   ============================================================ */

export class AudioPlayer {
  constructor() {
    this.audio      = null;   // HTMLAudioElement
    this.playing    = false;
    this.currentKey = null;

    // Fallback simulated player (used when actual audio URL not available)
    this._simSecs   = 0;
    this._simDur    = 0;
    this._simTimer  = null;
    this._simMode   = false;
  }

  render() {
    const el = document.createElement('div');
    el.className = 'player';
    el.id = 'audioPlayer';
    el.innerHTML = `
      <div class="pl-header">
        <div>
          <div class="pl-trad" id="plTrad">Hindu</div>
          <div class="pl-title" id="plTitle">Hanuman Chalisa</div>
        </div>
        <button class="pl-close" id="plClose">✕</button>
      </div>

      <div class="prog-wrap" id="progWrap">
        <div class="prog-track">
          <div class="prog-fill" id="progFill" style="width:0%"></div>
        </div>
        <div class="prog-times">
          <span id="curTime">0:00</span>
          <span id="totTime">0:00</span>
        </div>
      </div>

      <div class="controls">
        <button class="ctrl" id="skipBack">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 19l-7-7 7-7M19 19l-7-7 7-7"/>
          </svg>
        </button>
        <button class="playbtn" id="playBtn">
          <svg id="playIco" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        </button>
        <button class="ctrl" id="skipFwd">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 19l7-7-7-7M5 19l7-7-7-7"/>
          </svg>
        </button>
      </div>
    `;

    this._bindEvents(el);
    return el;
  }

  _bindEvents(el) {
    el.querySelector('#plClose').addEventListener('click', () => this.close());
    el.querySelector('#playBtn').addEventListener('click', () => this.togglePlay());
    el.querySelector('#skipBack').addEventListener('click', () => this.skip(-15));
    el.querySelector('#skipFwd').addEventListener('click', () => this.skip(15));
    el.querySelector('#progWrap').addEventListener('click', (e) => this._seek(e));
  }

  open({ title, tradition, durationSecs, audioUrl }) {
    this._stop();
    this._simMode   = !audioUrl;
    this._simSecs   = 0;
    this._simDur    = durationSecs;
    this.currentKey = title;

    document.getElementById('plTrad').textContent = tradition;
    document.getElementById('plTitle').textContent = title;
    document.getElementById('totTime').textContent = this._fmt(durationSecs);
    this._updateProgress(0, durationSecs);

    if (audioUrl && !this._simMode) {
      this.audio = new Audio(audioUrl);
      this.audio.addEventListener('timeupdate', () => this._onTimeUpdate());
      this.audio.addEventListener('ended',      () => this._onEnded());
    }

    document.getElementById('audioPlayer').classList.add('show');
    setTimeout(() => this.play(), 350);
  }

  close() {
    this._stop();
    document.getElementById('audioPlayer').classList.remove('show');
    this.audio = null;
  }

  play() {
    this.playing = true;
    this._setPauseIcon();

    if (!this._simMode && this.audio) {
      this.audio.play().catch(console.warn);
    } else {
      this._simTimer = setInterval(() => {
        this._simSecs = Math.min(this._simSecs + 1, this._simDur);
        this._updateProgress(this._simSecs, this._simDur);
        if (this._simSecs >= this._simDur) this._onEnded();
      }, 1000);
    }
  }

  pause() {
    this.playing = false;
    this._setPlayIcon();

    if (!this._simMode && this.audio) {
      this.audio.pause();
    } else {
      clearInterval(this._simTimer);
    }
  }

  togglePlay() {
    this.playing ? this.pause() : this.play();
  }

  skip(secs) {
    if (!this._simMode && this.audio) {
      this.audio.currentTime = Math.max(0, Math.min(this.audio.duration, this.audio.currentTime + secs));
    } else {
      this._simSecs = Math.max(0, Math.min(this._simDur, this._simSecs + secs));
      this._updateProgress(this._simSecs, this._simDur);
    }
  }

  _stop() {
    this.playing = false;
    clearInterval(this._simTimer);
    if (this.audio) { this.audio.pause(); this.audio.currentTime = 0; }
    this._setPlayIcon();
  }

  _seek(e) {
    const track = e.currentTarget.querySelector('.prog-track');
    const rect  = track.getBoundingClientRect();
    const pct   = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (!this._simMode && this.audio) {
      this.audio.currentTime = pct * this.audio.duration;
    } else {
      this._simSecs = Math.round(pct * this._simDur);
      this._updateProgress(this._simSecs, this._simDur);
    }
  }

  _onTimeUpdate() {
    if (!this.audio) return;
    this._updateProgress(this.audio.currentTime, this.audio.duration);
  }

  _onEnded() {
    this._stop();
    this._simSecs = 0;
    this._updateProgress(0, this._simDur);
  }

  _updateProgress(current, total) {
    const pct = total > 0 ? (current / total) * 100 : 0;
    const fill = document.getElementById('progFill');
    const cur  = document.getElementById('curTime');
    if (fill) fill.style.width = pct + '%';
    if (cur)  cur.textContent  = this._fmt(Math.round(current));
  }

  _fmt(secs) {
    const s = Math.round(secs);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  _setPlayIcon() {
    const ico = document.getElementById('playIco');
    if (ico) ico.innerHTML = '<polygon points="5,3 19,12 5,21"/>';
  }

  _setPauseIcon() {
    const ico = document.getElementById('playIco');
    if (ico) ico.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  }
}
