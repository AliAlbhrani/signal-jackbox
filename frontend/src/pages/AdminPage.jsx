import { useEffect, useRef, useState } from "react";
import {
  adminLogin,
  adminLogout,
  apiBase,
  deleteSong,
  fetchAdminMe,
  fetchAdminSongs,
  fetchNowPlaying,
  playNext,
  playSong,
  playTop,
  setAutoPlay,
  stopPlayback,
  toggleHidden,
  uploadFile,
} from "../api.js";

function LoginPage({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await adminLogin(username, password);
      onSuccess(result.username || username);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <img className="login__logo" src="/assets/logo1.png" alt="Signal Cafe logo" />
        <h1 className="login__title">Admin Sign In</h1>
        <p className="login__subtitle">Sign in to manage the cafe queue.</p>

        <label className="login__field">
          <span>Username</span>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>

        <label className="login__field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="login__error">{error}</p>}

        <button className="btn btn--primary login__submit" type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

function NowPlayingCard({ song }) {
  const isActive = song !== null;
  const hasCover = isActive && song.cover === "true";
  return (
    <div className={`now-card${isActive ? " is-active" : ""}`}>
      {isActive ? (
        <>
          <div className="now-card__cover">
            {hasCover ? (
              <img src={`${apiBase}/songs/${song.id}/cover`} alt="" />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
          <div className="now-card__body">
            <p className="now-card__label">Now Playing</p>
            <p className="now-card__title">{song.title}</p>
            <p className="now-card__artist">{song.artist}</p>
          </div>
        </>
      ) : (
        <p className="now-card__empty">Nothing playing right now</p>
      )}
    </div>
  );
}

function Controls({ onPlayTop, onPlayNext, onStop, onToggleAutoPlay, nowPlaying, autoPlay }) {
  return (
    <div className="controls">
      <button className="btn btn--primary" onClick={onPlayTop}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M8 5v14l11-7z" fill="currentColor" />
        </svg>
        Play Top Voted
      </button>
      <button className="btn" onClick={onPlayNext}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M5 4l10 8-10 8V4z" fill="currentColor" />
          <path d="M19 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Next
      </button>
      {nowPlaying && (
        <button className="btn btn--danger" onClick={onStop}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" />
          </svg>
          Stop
        </button>
      )}
      <button
        className={`btn${autoPlay ? " btn--primary" : ""}`}
        onClick={() => onToggleAutoPlay(!autoPlay)}
        style={{ marginLeft: "auto" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 12h16M12 4v16"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
        Auto-Play: {autoPlay ? "ON" : "OFF"}
      </button>
    </div>
  );
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
      } finally {
        setUploading(false);
      }
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  function handleDragOver(event) {
    event.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleClick() {
    fileRef.current?.click();
  }

  function handleChange(event) {
    handleFiles(event.target.files);
    event.target.value = "";
  }

  return (
    <div
      className={`upload-zone${dragging ? " upload-zone--active" : ""}${
        uploading ? " upload-zone--uploading" : ""
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".mp3,.flac,.ogg,.m4a,.wav"
        multiple
        style={{ display: "none" }}
        onChange={handleChange}
      />
      {uploading ? (
        <>
          <svg className="upload-zone__icon" width="32" height="32" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="31.4"
              strokeDashoffset="10"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 12 12"
                to="360 12 12"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
          <p className="upload-zone__text">Uploading...</p>
        </>
      ) : (
        <>
          <svg className="upload-zone__icon" width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V4M12 4l4 4M12 4L8 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <p className="upload-zone__text">
            {dragging ? "Drop files here" : "Drag & drop MP3s here, or click to browse"}
          </p>
          <p className="upload-zone__hint">
            Supports MP3, FLAC, OGG, M4A, WAV — metadata extracted automatically
          </p>
        </>
      )}
      {lastUploaded && <p className="upload-zone__success">Uploaded {lastUploaded}</p>}
    </div>
  );
}

function SongRow({ song, onPlay, onDelete, onToggleHidden, isPlaying }) {
  const hasCover = song.cover === "true";
  return (
    <li
      className={`song-row${isPlaying ? " song-row--playing" : ""}${
        song.hidden ? " song-row--hidden" : ""
      }`}
    >
      <span className="song-row__rank">{song.rank}</span>
      <div className="song-row__cover">
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
      <div className="song-row__body">
        <p className="song-row__title">
          {song.title}
          {song.hidden && <span className="song-row__badge">Hidden</span>}
        </p>
        <p className="song-row__artist">{song.artist}</p>
      </div>
      <span className="song-row__votes">{song.votes} votes</span>
      <div className="song-row__actions">
        {!isPlaying ? (
          <button className="btn btn--sm btn--primary" onClick={() => onPlay(song.id)}>
            Play
          </button>
        ) : (
          <span className="btn btn--sm btn--primary" style={{ opacity: 0.6, cursor: "default" }}>
            Playing
          </span>
        )}
        <button className="btn btn--sm" onClick={() => onToggleHidden(song.id)}>
          {song.hidden ? "Unhide" : "Hide"}
        </button>
        <button className="btn btn--sm btn--danger" onClick={() => onDelete(song.id)}>
          Delete
        </button>
      </div>
    </li>
  );
}

function SongList({ songs, onPlay, onDelete, onToggleHidden, playingId }) {
  return (
    <div>
      <div className="list-header">
        <h3 className="list-header__title">Songs</h3>
        <span className="list-header__count">{songs.length} total</span>
      </div>
      {songs.length === 0 ? (
        <p className="empty">No songs yet. Upload some above.</p>
      ) : (
        <ul className="song-list">
          {songs.map((song, index) => (
            <SongRow
              key={song.id}
              song={{ ...song, rank: index + 1 }}
              onPlay={onPlay}
              onDelete={onDelete}
              onToggleHidden={onToggleHidden}
              isPlaying={song.id === playingId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AdminDashboard({ username, onLogout }) {
  const [songs, setSongs] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [autoPlay, setAutoPlayState] = useState(false);

  function handleError(err) {
    if (err?.status === 401) {
      onLogout();
      return;
    }
    console.error(err);
  }

  async function loadSongs() {
    try {
      const data = await fetchAdminSongs();
      setSongs(data.songs || []);
    } catch (err) {
      handleError(err);
    }
  }

  async function loadNowPlaying() {
    try {
      const data = await fetchNowPlaying();
      setNowPlaying(data.song || null);
      setAutoPlayState(data.autoplay || false);
    } catch (err) {
      handleError(err);
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

  function handleUpload(updatedSongs) {
    setSongs(updatedSongs);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this song?")) return;
    try {
      const result = await deleteSong(id);
      setSongs(result.songs || []);
    } catch (err) {
      handleError(err);
    }
  }

  async function handleToggleHidden(id) {
    try {
      const result = await toggleHidden(id);
      setSongs(result.songs || []);
    } catch (err) {
      handleError(err);
    }
  }

  async function handlePlay(id) {
    try {
      await playSong(id);
      loadNowPlaying();
    } catch (err) {
      handleError(err);
    }
  }

  async function handlePlayTop() {
    try {
      await playTop();
      loadNowPlaying();
    } catch (err) {
      handleError(err);
    }
  }

  async function handlePlayNext() {
    try {
      await playNext();
      loadNowPlaying();
    } catch (err) {
      handleError(err);
    }
  }

  async function handleStop() {
    try {
      await stopPlayback();
      loadNowPlaying();
    } catch (err) {
      handleError(err);
    }
  }

  async function handleToggleAutoPlay(enabled) {
    try {
      const result = await setAutoPlay(enabled);
      setAutoPlayState(result.autoplay);
    } catch (err) {
      handleError(err);
    }
  }

  async function handleLogout() {
    try {
      await adminLogout();
    } catch (err) {
      console.error("logout failed:", err);
    }
    onLogout();
  }

  return (
    <div className="dash">
      <header className="dash__header">
        <div>
          <h1 className="dash__title">Cafe Jackbox</h1>
          <p className="dash__subtitle">Admin Dashboard</p>
        </div>
        <div className="dash__account">
          <span className="dash__user">{username}</span>
          <button className="btn btn--sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <NowPlayingCard song={nowPlaying} />
      <Controls
        onPlayTop={handlePlayTop}
        onPlayNext={handlePlayNext}
        onStop={handleStop}
        onToggleAutoPlay={handleToggleAutoPlay}
        nowPlaying={nowPlaying}
        autoPlay={autoPlay}
      />
      <UploadZone onUpload={handleUpload} />
      <SongList
        songs={songs}
        onPlay={handlePlay}
        onDelete={handleDelete}
        onToggleHidden={handleToggleHidden}
        playingId={nowPlaying?.id}
      />
    </div>
  );
}

export default function AdminPage() {
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchAdminMe()
      .then((data) => {
        if (cancelled) return;
        setAuth(data.authenticated ? { username: data.username } : false);
      })
      .catch((err) => {
        console.error("failed to check admin session:", err);
        if (!cancelled) setAuth(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (auth === null) {
    return (
      <div className="page-loading">
        <span className="page-loading__dot" />
        Checking admin session...
      </div>
    );
  }

  if (!auth) {
    return <LoginPage onSuccess={(username) => setAuth({ username })} />;
  }

  return <AdminDashboard username={auth.username} onLogout={() => setAuth(false)} />;
}
