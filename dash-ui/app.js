import { h, render } from "https://esm.sh/preact@10.25.4";
import { useState, useEffect, useRef } from "https://esm.sh/preact@10.25.4/hooks";
import htm from "https://esm.sh/htm@3.1.1";

const html = htm.bind(h);

const API = `${window.location.protocol}//${window.location.hostname}:8080/api`;

// ─── API Helpers ─────────────────────────────────────────────────────────────

async function fetchNowPlaying() {
  const res = await fetch(`${API}/now-playing`);
  return res.json();
}

async function fetchSongs() {
  const res = await fetch(`${API}/admin/songs`);
  return res.json();
}

async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/admin/upload`, { method: "POST", body: form });
  return res.json();
}

async function deleteSong(id) {
  const res = await fetch(`${API}/admin/songs/${id}`, { method: "DELETE" });
  return res.json();
}

async function playSong(id) {
  const res = await fetch(`${API}/admin/play/${id}`, { method: "POST" });
  return res.json();
}

async function playTop() {
  const res = await fetch(`${API}/admin/play`, { method: "POST" });
  return res.json();
}

async function playNext() {
  const res = await fetch(`${API}/admin/play-next`, { method: "POST" });
  return res.json();
}

async function stopPlayback() {
  const res = await fetch(`${API}/admin/stop`, { method: "POST" });
  return res.json();
}

async function setAutoPlay(enabled) {
  const res = await fetch(`${API}/admin/autoplay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  return res.json();
}

async function toggleHidden(id) {
  const res = await fetch(`${API}/admin/songs/${id}`, {
    method: "POST",
  });
  return res.json();
}

// ─── Components ──────────────────────────────────────────────────────────────

function NowPlayingCard({ song }) {
  const isActive = song !== null;
  const hasCover = isActive && song.cover === "true";
  return html`
    <div class="now-card${isActive ? " is-active" : ""}">
      ${isActive
        ? html`
          <div class="now-card__cover">
            ${hasCover
              ? html`<img src=${`${API}/songs/${song.id}/cover`} alt="" />`
              : html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.5"/></svg>`}
          </div>
          <div class="now-card__body">
            <p class="now-card__label">Now Playing</p>
            <p class="now-card__title">${song.title}</p>
            <p class="now-card__artist">${song.artist}</p>
          </div>
        `
        : html`<p class="now-card__empty">Nothing playing right now</p>`}
    </div>
  `;
}

function Controls({ onPlayTop, onPlayNext, onStop, onToggleAutoPlay, nowPlaying, autoPlay }) {
  return html`
    <div class="controls">
      <button class="btn btn--primary" onClick=${onPlayTop}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
        Play Top Voted
      </button>
      <button class="btn" onClick=${onPlayNext}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 4l10 8-10 8V4z" fill="currentColor"/><path d="M19 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        Next
      </button>
      ${nowPlaying && html`
        <button class="btn btn--danger" onClick=${onStop}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/></svg>
          Stop
        </button>
      `}
      <button
        class="btn ${autoPlay ? "btn--primary" : ""}"
        onClick=${() => onToggleAutoPlay(!autoPlay)}
        style="margin-left: auto;"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12h16M12 4v16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
        Auto-Play: ${autoPlay ? "ON" : "OFF"}
      </button>
    </div>
  `;
}

function UploadZone({ onUpload }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastUploaded, setLastUploaded] = useState(null);
  const fileRef = useRef(null);

  async function handleFiles(files) {
    for (const file of files) {
      setUploading(true);
      try {
        const result = await uploadFile(file);
        if (result.songs) onUpload(result.songs);
        setLastUploaded(file.name);
        setTimeout(() => setLastUploaded(null), 3000);
      } catch (err) {
        console.error("upload failed:", err);
      }
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleClick() {
    fileRef.current?.click();
  }

  function handleChange(e) {
    handleFiles(e.target.files);
    e.target.value = "";
  }

  return html`
    <div
      class="upload-zone ${dragging ? "upload-zone--active" : ""} ${uploading ? "upload-zone--uploading" : ""}"
      onDrop=${handleDrop}
      onDragOver=${handleDragOver}
      onDragLeave=${handleDragLeave}
      onClick=${handleClick}
    >
      <input
        ref=${fileRef}
        type="file"
        accept=".mp3,.flac,.ogg,.m4a,.wav"
        multiple
        style="display:none"
        onChange=${handleChange}
      />
      ${uploading
        ? html`
          <svg class="upload-zone__icon" width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="31.4" stroke-dashoffset="10">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
          <p class="upload-zone__text">Uploading...</p>
        `
        : html`
          <svg class="upload-zone__icon" width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 16V4M12 4l4 4M12 4L8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p class="upload-zone__text">
            ${dragging ? "Drop files here" : "Drag & drop MP3s here, or click to browse"}
          </p>
          <p class="upload-zone__hint">Supports MP3, FLAC, OGG, M4A, WAV — metadata extracted automatically</p>
        `}
      ${lastUploaded && html`
        <p class="upload-zone__success">Uploaded ${lastUploaded}</p>
      `}
    </div>
  `;
}

function SongRow({ song, onPlay, onDelete, onToggleHidden, isPlaying }) {
  const hasCover = song.cover === "true";
  return html`
    <li class="song-row${isPlaying ? " song-row--playing" : ""}${song.hidden ? " song-row--hidden" : ""}">
      <span class="song-row__rank">${song.rank}</span>
      <div class="song-row__cover">
        ${hasCover
          ? html`<img src=${`${API}/songs/${song.id}/cover`} alt="" />`
          : html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.5"/></svg>`}
      </div>
      <div class="song-row__body">
        <p class="song-row__title">
          ${song.title}
          ${song.hidden && html`<span class="song-row__badge">Hidden</span>`}
        </p>
        <p class="song-row__artist">${song.artist}</p>
      </div>
      <span class="song-row__votes">${song.votes} votes</span>
      <div class="song-row__actions">
        ${!isPlaying && html`
          <button class="btn btn--sm btn--primary" onClick=${() => onPlay(song.id)}>
            Play
          </button>
        `}
        ${isPlaying && html`
          <span class="btn btn--sm btn--primary" style="opacity:0.6;cursor:default;">
            Playing
          </span>
        `}
        <button class="btn btn--sm" onClick=${() => onToggleHidden(song.id)}>
          ${song.hidden ? "Unhide" : "Hide"}
        </button>
        <button class="btn btn--sm btn--danger" onClick=${() => onDelete(song.id)}>
          Delete
        </button>
      </div>
    </li>
  `;
}

function SongList({ songs, onPlay, onDelete, onToggleHidden, playingId }) {
  return html`
    <div>
      <div class="list-header">
        <h3 class="list-header__title">Songs</h3>
        <span class="list-header__count">${songs.length} total</span>
      </div>
      ${songs.length === 0
        ? html`<p class="empty">No songs yet. Upload some above.</p>`
        : html`
          <ul class="song-list">
            ${songs.map((song, i) => html`
              <${SongRow}
                key=${song.id}
                song=${{ ...song, rank: i + 1 }}
                onPlay=${onPlay}
                onDelete=${onDelete}
                onToggleHidden=${onToggleHidden}
                isPlaying=${song.id === playingId}
              />
            `)}
          </ul>
        `}
    </div>
  `;
}

function App() {
  const [songs, setSongs] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [autoPlay, setAutoPlayState] = useState(false);

  async function loadSongs() {
    try {
      const data = await fetchSongs();
      setSongs(data.songs || []);
    } catch (err) {
      console.error("failed to load songs:", err);
    }
  }

  async function loadNowPlaying() {
    try {
      const data = await fetchNowPlaying();
      setNowPlaying(data.song || null);
      setAutoPlayState(data.autoplay || false);
    } catch (err) {
      console.error("failed to load now playing:", err);
    }
  }

  useEffect(() => {
    loadSongs();
    loadNowPlaying();
    const nowPlayingInterval = setInterval(loadNowPlaying, 3000);
    const songsInterval = setInterval(loadSongs, 5000);
    return () => {
      clearInterval(nowPlayingInterval);
      clearInterval(songsInterval);
    };
  }, []);

  async function handleUpload(updatedSongs) {
    setSongs(updatedSongs);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this song?")) return;
    try {
      const result = await deleteSong(id);
      setSongs(result.songs || []);
    } catch (err) {
      console.error("delete failed:", err);
    }
  }

  async function handleToggleHidden(id) {
    try {
      const result = await toggleHidden(id);
      setSongs(result.songs || []);
    } catch (err) {
      console.error("toggle hidden failed:", err);
    }
  }

  async function handlePlay(id) {
    try {
      await playSong(id);
      loadNowPlaying();
    } catch (err) {
      console.error("play failed:", err);
    }
  }

  async function handlePlayTop() {
    try {
      await playTop();
      loadNowPlaying();
    } catch (err) {
      console.error("play top failed:", err);
    }
  }

  async function handlePlayNext() {
    try {
      await playNext();
      loadNowPlaying();
    } catch (err) {
      console.error("play next failed:", err);
    }
  }

  async function handleStop() {
    try {
      await stopPlayback();
      loadNowPlaying();
    } catch (err) {
      console.error("stop failed:", err);
    }
  }

  async function handleToggleAutoPlay(enabled) {
    try {
      const result = await setAutoPlay(enabled);
      setAutoPlayState(result.autoplay);
    } catch (err) {
      console.error("autoplay toggle failed:", err);
    }
  }

  return html`
    <div class="dash">
      <header class="dash__header">
        <h1 class="dash__title">Cafe Jackbox</h1>
        <p class="dash__subtitle">Admin Dashboard</p>
      </header>

      <${NowPlayingCard} song=${nowPlaying} />
      <${Controls}
        onPlayTop=${handlePlayTop}
        onPlayNext=${handlePlayNext}
        onStop=${handleStop}
        onToggleAutoPlay=${handleToggleAutoPlay}
        nowPlaying=${nowPlaying}
        autoPlay=${autoPlay}
      />
      <${UploadZone} onUpload=${handleUpload} />
      <${SongList} songs=${songs} onPlay=${handlePlay} onDelete=${handleDelete} onToggleHidden=${handleToggleHidden} playingId=${nowPlaying?.id} />
    </div>
  `;
}

render(html`<${App} />`, document.getElementById("app"));
