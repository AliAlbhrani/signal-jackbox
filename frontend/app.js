import { h, render } from "https://esm.sh/preact@10.25.4";
import { useState, useEffect, useRef } from "https://esm.sh/preact@10.25.4/hooks";
import htm from "https://esm.sh/htm@3.1.1";

const html = htm.bind(h);

const API = `${window.location.protocol}//${window.location.hostname}:8080/api`;

// ─── API Helpers ─────────────────────────────────────────────────────────────

async function fetchSongs(query = "") {
  const url = query ? `${API}/songs?q=${encodeURIComponent(query)}` : `${API}/songs`;
  const res = await fetch(url, { credentials: "include" });
  return res.json();
}

async function toggleVote(songId, query = "") {
  const res = await fetch(`${API}/songs/${songId}/vote`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

async function fetchNowPlaying() {
  const res = await fetch(`${API}/now-playing`, { credentials: "include" });
  return res.json();
}

// ─── Components ──────────────────────────────────────────────────────────────

function SteamDecorations() {
  const steams = [
    { left: "15%", delay: "0s", duration: "4s", scale: 0.9 },
    { left: "45%", delay: "1.2s", duration: "3.5s", scale: 1.1 },
    { left: "75%", delay: "2.5s", duration: "4.2s", scale: 0.8 },
  ];
  const beans = [
    { top: "12%", left: "8%", size: 22, rotate: -15 },
    { top: "45%", left: "92%", size: 18, rotate: 30 },
    { top: "70%", left: "5%", size: 20, rotate: -8 },
    { top: "85%", left: "88%", size: 16, rotate: 45 },
  ];

  return html`
    <div class="board__steam" aria-hidden="true">
      <svg class="deco-cup" style="top:6%; left:4%; width:46px; height:46px; transform:rotate(-8deg)" viewBox="0 0 48 48" fill="none">
        <path d="M9 18h24v13a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9V18Z" stroke="currentColor" stroke-width="2"/>
        <path d="M33 21h3a5 5 0 0 1 0 10h-3" stroke="currentColor" stroke-width="2"/>
        <path d="M13 11c1-2 3-2 4 0s3 2 4 0M23 11c1-2 3-2 4 0s3 2 4 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <svg class="deco-cup" style="top:78%; left:88%; width:58px; height:58px; transform:rotate(6deg)" viewBox="0 0 48 48" fill="none">
        <path d="M9 18h24v13a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9V18Z" stroke="currentColor" stroke-width="2"/>
        <path d="M33 21h3a5 5 0 0 1 0 10h-3" stroke="currentColor" stroke-width="2"/>
        <path d="M13 11c1-2 3-2 4 0s3 2 4 0M23 11c1-2 3-2 4 0s3 2 4 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      ${beans.map(b => html`
        <svg class="deco-bean" style="top:${b.top}; left:${b.left}; width:${b.size}px; height:${b.size}px; transform:rotate(${b.rotate}deg)" viewBox="0 0 32 20" fill="none">
          <path d="M2 10c0-5 6-9 14-9s14 4 14 9-6 9-14 9S2 15 2 10Z" stroke="currentColor" stroke-width="1.6"/>
          <path d="M9 16c2-3 2-9 8-11.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      `)}
      ${steams.map(s => html`
        <svg class="steam-wisp" style="left:${s.left}; animation-delay:${s.delay}; animation-duration:${s.duration}; --s:${s.scale}" width="26" height="90" viewBox="0 0 26 90" fill="none">
          <path d="M13 88C13 88 3 74 13 62C23 50 3 40 13 28C23 16 3 8 13 2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      `)}
    </div>
  `;
}

function NowPlaying({ song }) {
  const isActive = song !== null;
  return html`
    <div class="now-playing${isActive ? " is-active" : ""}">
      ${isActive
        ? html`<span class="now-playing__dot"></span> Now playing: ${song.title} — ${song.artist}`
        : "Nothing playing right now"}
    </div>
  `;
}

function VoteButton({ song, onVote, loading }) {
  return html`
    <button
      class="vote-btn${song.voted ? " is-voted" : ""}${loading ? " is-loading" : ""}"
      onClick=${() => onVote(song.id)}
      aria-pressed=${song.voted ? "true" : "false"}
      aria-label=${song.voted ? "Remove vote" : "Vote for this song"}
    >
      <svg class="vote-btn__heart" width="20" height="20" viewBox="0 0 24 24" fill=${song.voted ? "currentColor" : "none"}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" stroke-width="2"/>
      </svg>
      <span class="vote-btn__count">${song.votes}</span>
    </button>
  `;
}

function SongRow({ song, onVote, loadingId }) {
  const hasCover = song.cover === "true";
  return html`
    <li class="row">
      <span class="row__rank">${song.rank}</span>
      <div class="row__cover">
        ${hasCover
          ? html`<img src=${`${API}/songs/${song.id}/cover`} alt="" />`
          : html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.5"/></svg>`}
      </div>
      <div class="row__body">
        <p class="row__title">${song.title}</p>
        <p class="row__artist">${song.artist}</p>
      </div>
      <${VoteButton} song=${song} onVote=${onVote} loading=${loadingId === song.id} />
    </li>
  `;
}

function SearchBar({ onSearch, loading }) {
  const [value, setValue] = useState("");
  const timerRef = useRef(null);

  function handleChange(e) {
    const val = e.target.value;
    setValue(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(val), 350);
  }

  return html`
    <div class="search">
      <input
        class="search__input"
        type="text"
        placeholder="Search songs or artists..."
        aria-label="Search songs or artists"
        value=${value}
        onInput=${handleChange}
      />
      <span class="search__spinner${loading ? " is-visible" : ""}">searching...</span>
    </div>
  `;
}

function App() {
  const [songs, setSongs] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [total, setTotal] = useState(0);
  const queryRef = useRef(query);
  queryRef.current = query;

  async function loadSongs(q = "") {
    setLoading(true);
    try {
      const data = await fetchSongs(q);
      setSongs(data.songs || []);
      setTotal(data.total || 0);
      setQuery(data.query || "");
    } catch (err) {
      console.error("failed to load songs:", err);
    }
    setLoading(false);
  }

  async function loadNowPlaying() {
    try {
      const data = await fetchNowPlaying();
      setNowPlaying(data.song || null);
    } catch (err) {
      console.error("failed to load now playing:", err);
    }
  }

  useEffect(() => {
    loadSongs();
    loadNowPlaying();
    const nowPlayingInterval = setInterval(loadNowPlaying, 3000);
    const songsInterval = setInterval(() => loadSongs(queryRef.current), 5000);
    return () => {
      clearInterval(nowPlayingInterval);
      clearInterval(songsInterval);
    };
  }, []);

  async function handleVote(songId) {
    setLoadingId(songId);
    try {
      const data = await toggleVote(songId, query);
      setSongs(data.songs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("vote failed:", err);
    }
    setLoadingId(null);
  }

  async function handleSearch(q) {
    loadSongs(q);
  }

  return html`
    <div class="board">
      <${SteamDecorations} />
      <div class="board__inner">
        <header class="board__header">
          <div class="board__heading">
            <h1 class="board__title">Request it. Feel it.</h1>
            <p class="board__subtitle">Control the vibe at signal cafe</p>
          </div>
          <div class="board__logo">
              <img  src="./assets/logo1.png" alt="logo" />
          </div>
        </header>

        <${NowPlaying} song=${nowPlaying} />

        <${SearchBar} onSearch=${handleSearch} loading=${loading} />

        <p class="count-line">
          ${total} song${total !== 1 ? "s" : ""}
          ${query ? ` matching "${query}"` : " in the queue"}
        </p>

        ${songs.length === 0
          ? html`<p class="empty">${query ? `No songs match "${query}". Try a different title or artist.` : "No songs in the queue."}</p>`
          : html`
            <ul class="list">
              ${songs.map(song => html`
                <${SongRow} key=${song.id} song=${song} onVote=${handleVote} loadingId=${loadingId} />
              `)}
            </ul>
          `}
      </div>
    </div>
  `;
}

render(html`<${App} />`, document.getElementById("app"));
