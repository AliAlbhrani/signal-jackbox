import { useEffect, useRef, useState } from "react";
import { apiBase, fetchNowPlaying, fetchSongs, toggleVote } from "../api.js";

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

  return (
    <div className="board__steam" aria-hidden="true">
      <svg
        className="deco-cup"
        style={{ top: "6%", left: "4%", width: 46, height: 46, transform: "rotate(-8deg)" }}
        viewBox="0 0 48 48"
        fill="none"
      >
        <path d="M9 18h24v13a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9V18Z" stroke="currentColor" strokeWidth="2" />
        <path d="M33 21h3a5 5 0 0 1 0 10h-3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M13 11c1-2 3-2 4 0s3 2 4 0M23 11c1-2 3-2 4 0s3 2 4 0"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <svg
        className="deco-cup"
        style={{ top: "78%", left: "88%", width: 58, height: 58, transform: "rotate(6deg)" }}
        viewBox="0 0 48 48"
        fill="none"
      >
        <path d="M9 18h24v13a9 9 0 0 1-9 9h-6a9 9 0 0 1-9-9V18Z" stroke="currentColor" strokeWidth="2" />
        <path d="M33 21h3a5 5 0 0 1 0 10h-3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M13 11c1-2 3-2 4 0s3 2 4 0M23 11c1-2 3-2 4 0s3 2 4 0"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      {beans.map((bean, index) => (
        <svg
          key={index}
          className="deco-bean"
          style={{
            top: bean.top,
            left: bean.left,
            width: bean.size,
            height: bean.size,
            transform: `rotate(${bean.rotate}deg)`,
          }}
          viewBox="0 0 32 20"
          fill="none"
        >
          <path d="M2 10c0-5 6-9 14-9s14 4 14 9-6 9-14 9S2 15 2 10Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M9 16c2-3 2-9 8-11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ))}
      {steams.map((steam, index) => (
        <svg
          key={index}
          className="steam-wisp"
          style={{
            left: steam.left,
            animationDelay: steam.delay,
            animationDuration: steam.duration,
            "--s": steam.scale,
          }}
          width="26"
          height="90"
          viewBox="0 0 26 90"
          fill="none"
        >
          <path
            d="M13 88C13 88 3 74 13 62C23 50 3 40 13 28C23 16 3 8 13 2"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      ))}
    </div>
  );
}

function NowPlaying({ song }) {
  const isActive = song !== null;
  return (
    <div className={`now-playing${isActive ? " is-active" : ""}`}>
      {isActive ? (
        <>
          <span className="now-playing__dot" /> Now playing: {song.title} — {song.artist}
        </>
      ) : (
        "Nothing playing right now"
      )}
    </div>
  );
}

function VoteButton({ song, onVote, loading }) {
  return (
    <button
      className={`vote-btn${song.voted ? " is-voted" : ""}${loading ? " is-loading" : ""}`}
      onClick={() => onVote(song.id)}
      aria-pressed={song.voted ? "true" : "false"}
      aria-label={song.voted ? "Remove vote" : "Vote for this song"}
    >
      <svg
        className="vote-btn__heart"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={song.voted ? "currentColor" : "none"}
      >
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <span className="vote-btn__count">{song.votes}</span>
    </button>
  );
}

function SongRow({ song, onVote, loadingId }) {
  const hasCover = song.cover === "true";
  return (
    <li className="row">
      <span className="row__rank">{song.rank}</span>
      <div className="row__cover">
        {hasCover ? (
          <img src={`${apiBase}/songs/${song.id}/cover`} alt="" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 18V5l12-2v13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )}
      </div>
      <div className="row__body">
        <p className="row__title">{song.title}</p>
        <p className="row__artist">{song.artist}</p>
      </div>
      <VoteButton song={song} onVote={onVote} loading={loadingId === song.id} />
    </li>
  );
}

function SearchBar({ onSearch, loading }) {
  const [value, setValue] = useState("");
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function handleChange(event) {
    const nextValue = event.target.value;
    setValue(nextValue);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(nextValue), 350);
  }

  return (
    <div className="search">
      <input
        className="search__input"
        type="text"
        placeholder="Search songs or artists..."
        aria-label="Search songs or artists"
        value={value}
        onChange={handleChange}
      />
      <span className={`search__spinner${loading ? " is-visible" : ""}`}>searching...</span>
    </div>
  );
}

export default function ClientPage() {
  const [songs, setSongs] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [total, setTotal] = useState(0);
  const queryRef = useRef(query);
  queryRef.current = query;

  async function loadSongs(nextQuery = "", silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await fetchSongs(nextQuery);
      setSongs(data.songs || []);
      setTotal(data.total || 0);
      setQuery(data.query || "");
    } catch (err) {
      console.error("failed to load songs:", err);
    } finally {
      if (!silent) setLoading(false);
    }
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
    const songsInterval = setInterval(() => loadSongs(queryRef.current, true), 5000);
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
    } finally {
      setLoadingId(null);
    }
  }

  function handleSearch(nextQuery) {
    loadSongs(nextQuery);
  }

  return (
    <div className="board">
      <SteamDecorations />
      <div className="board__inner">
        <header className="board__header">
          <div className="board__heading">
            <h1 className="board__title">Request it. Feel it.</h1>
            <p className="board__subtitle">Control the vibe at signal cafe</p>
          </div>
          <div className="board__logo">
            <img src="/assets/logo1.png" alt="Signal Cafe logo" />
          </div>
        </header>

        <NowPlaying song={nowPlaying} />

        <SearchBar onSearch={handleSearch} loading={loading} />

        <p className="count-line">
          {total} song{total !== 1 ? "s" : ""}
          {query ? ` matching "${query}"` : " in the queue"}
        </p>

        {songs.length === 0 ? (
          <p className="empty">
            {query
              ? `No songs match "${query}". Try a different title or artist.`
              : "No songs in the queue."}
          </p>
        ) : (
          <ul className="list">
            {songs.map((song) => (
              <SongRow key={song.id} song={song} onVote={handleVote} loadingId={loadingId} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
