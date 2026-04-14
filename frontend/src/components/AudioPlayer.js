/* ============================================================
   SoulGPT — Audio Player Component
   File: frontend/src/components/AudioPlayer.js
   ============================================================ */

   export class AudioPlayer {
    constructor() {
      this.audio = null;
      this.playing = false;
      this.currentKey = null;
      this._simSecs = 0;
      this._simDur = 0;
      this._simTimer = null;
      this._simMode = false;
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
  
        <div id="plStatus" style="text-align:center;font-size:11px;color:#888;padding:4px 0;display:none;"></div>
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
      console.log('🎵 AudioPlayer.open:', { title, audioUrl });
  
      this._cleanupAudio();
      this._stopSim();
  
      this._simMode = !audioUrl;
      this._simSecs = 0;
      this._simDur = 0;
      this.currentKey = title;
      this.playing = false;
  
      const tradEl = document.getElementById('plTrad');
      const titleEl = document.getElementById('plTitle');
      const curEl = document.getElementById('curTime');
      const totalEl = document.getElementById('totTime');
      const playerEl = document.getElementById('audioPlayer');
  
      if (tradEl) tradEl.textContent = tradition || '';
      if (titleEl) titleEl.textContent = title || '';
      if (curEl) curEl.textContent = '0:00';
      if (totalEl) {
        totalEl.textContent = audioUrl
          ? 'Loading...'
          : this._fmt(Number(durationSecs) || 0);
      }
  
      this._updateProgress(0, 0);
      this._setPlayIcon();
      this._setStatus('');
  
      if (playerEl) playerEl.classList.add('show');
  
      if (!audioUrl) {
        console.warn('⚠️ No audioUrl — using simulation');
        this._simDur = Number(durationSecs) || 0;
        if (totalEl) totalEl.textContent = this._fmt(this._simDur);
        this._startSim();
        return;
      }
  
      this.audio = new Audio();
      this.audio.preload = 'metadata';
  
      this.audio.addEventListener('loadedmetadata', () => {
        if (!this.audio) return;
  
        const realDuration = Math.round(this.audio.duration || 0);
        if (realDuration > 0) {
          this._simDur = realDuration;
  
          const total = document.getElementById('totTime');
          if (total) total.textContent = this._fmt(realDuration);
  
          this._updateProgress(this.audio.currentTime || 0, realDuration);
          console.log('✅ Real audio duration:', realDuration);
        }
      });
  
      this.audio.addEventListener('timeupdate', () => {
        this._onTimeUpdate();
      });
  
      this.audio.addEventListener('play', () => {
        this.playing = true;
        this._setPauseIcon();
        this._setStatus('');
      });
  
      this.audio.addEventListener('pause', () => {
        if (!this.audio) return;
        if (!this.audio.ended) {
          this.playing = false;
          this._setPlayIcon();
        }
      });
  
      this.audio.addEventListener('ended', () => {
        this._onEnded();
      });
  
      this.audio.addEventListener('canplay', () => {
        console.log('✅ Audio ready to play');
        if (!this.playing) this._setStatus('');
      });
  
      this.audio.addEventListener('waiting', () => {
        if (this.playing) this._setStatus('Loading...');
      });
  
      this.audio.addEventListener('error', (e) => {
        console.error('❌ Audio error:', e, this.audio?.error);
        this.playing = false;
        this._setPlayIcon();
        this._setStatus('Audio failed to load');
      });
  
      this.audio.src = audioUrl;
      this.audio.load();
      this._playReal();
    }
  
    _playReal() {
      if (!this.audio) return;
  
      const playPromise = this.audio.play();
  
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Audio playing');
          })
          .catch((err) => {
            console.error('❌ Autoplay blocked:', err);
            this.playing = false;
            this._setPlayIcon();
            this._setStatus('Tap ▶ to play');
          });
      }
    }
  
    _startSim() {
      this.playing = true;
      this._setPauseIcon();
      this._setStatus('');
      this._stopSim();
  
      this._simTimer = setInterval(() => {
        this._simSecs = Math.min(this._simSecs + 1, this._simDur);
        this._updateProgress(this._simSecs, this._simDur);
  
        if (this._simSecs >= this._simDur) {
          this._onEnded();
        }
      }, 1000);
    }
  
    _stopSim() {
      clearInterval(this._simTimer);
      this._simTimer = null;
    }
  
    _cleanupAudio() {
      if (!this.audio) return;
  
      this.audio.pause();
      this.audio.src = '';
      this.audio.load();
      this.audio = null;
    }
  
    _setStatus(msg) {
      const el = document.getElementById('plStatus');
      if (!el) return;
  
      el.textContent = msg;
      el.style.display = msg ? 'block' : 'none';
    }
  
    close() {
      this._stopSim();
      this._cleanupAudio();
      this.playing = false;
      this._setPlayIcon();
      this._setStatus('');
  
      const playerEl = document.getElementById('audioPlayer');
      if (playerEl) playerEl.classList.remove('show');
    }
  
    play() {
      if (!this._simMode && this.audio) {
        this._playReal();
      } else {
        this._startSim();
      }
    }
  
    pause() {
      if (!this._simMode && this.audio) {
        this.audio.pause();
      } else {
        this.playing = false;
        this._setPlayIcon();
        this._stopSim();
      }
    }
  
    togglePlay() {
      this.playing ? this.pause() : this.play();
    }
  
    skip(secs) {
      if (!this._simMode && this.audio && !isNaN(this.audio.duration)) {
        const nextTime = this.audio.currentTime + secs;
        this.audio.currentTime = Math.max(0, Math.min(this.audio.duration, nextTime));
      } else {
        this._simSecs = Math.max(0, Math.min(this._simDur, this._simSecs + secs));
        this._updateProgress(this._simSecs, this._simDur);
      }
    }
  
    _seek(e) {
      const track = e.currentTarget.querySelector('.prog-track');
      if (!track) return;
  
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  
      if (!this._simMode && this.audio && !isNaN(this.audio.duration)) {
        this.audio.currentTime = pct * this.audio.duration;
      } else {
        this._simSecs = Math.round(pct * this._simDur);
        this._updateProgress(this._simSecs, this._simDur);
      }
    }
  
    _onTimeUpdate() {
      if (!this.audio) return;
  
      const current = this.audio.currentTime || 0;
      const total = !isNaN(this.audio.duration) ? this.audio.duration : this._simDur || 0;
      this._updateProgress(current, total);
    }
  
    _onEnded() {
      this.playing = false;
      this._setPlayIcon();
      this._setStatus('');
  
      this._stopSim();
  
      if (this.audio) {
        this.audio.currentTime = 0;
      }
  
      this._simSecs = 0;
      this._updateProgress(0, this._simDur || 0);
    }
  
    _updateProgress(current, total) {
      const pct = total > 0 ? (current / total) * 100 : 0;
      const fill = document.getElementById('progFill');
      const cur = document.getElementById('curTime');
  
      if (fill) fill.style.width = `${pct}%`;
      if (cur) cur.textContent = this._fmt(Math.round(current));
    }
  
    _fmt(secs) {
      const s = Math.max(0, Math.round(secs || 0));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }
  
    _setPlayIcon() {
      const ico = document.getElementById('playIco');
      if (ico) {
        ico.innerHTML = '<polygon points="5,3 19,12 5,21"/>';
      }
    }
  
    _setPauseIcon() {
      const ico = document.getElementById('playIco');
      if (ico) {
        ico.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
      }
    }
  }