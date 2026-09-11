# Cafe Song Vote — htmx + Go

## Run it

```
go run .
```

Then open http://127.0.0.1:8080

(Or build a binary: `go build -o server .` then `./server` — this is the
nice part of Go, you get one standalone executable with no runtime
dependency to install on the machine it runs on, unlike the Python
version which needs Flask installed.)

## What's different from the Python version

Same routes, same behavior, same htmx frontend — just the backend
language changed:

- `net/http` + Go 1.22's method+pattern routing (`"POST /songs/{id}/vote"`)
  instead of Flask's `@app.route`.
- `html/template` instead of Jinja2 — syntax is `{{.Field}}` /
  `{{range .Songs}}` / `{{if .Voted}}` instead of `{{ song.title }}` /
  `{% for %}` / `{% if %}`. It also auto-escapes by default, same as
  Jinja2 with autoescaping on.
- An in-memory `map[string]bool` per song tracks which voter cookie IDs
  have voted, guarded by a `sync.Mutex` since Go's HTTP server handles
  requests concurrently by default (Flask's dev server is single-threaded
  unless you configure otherwise, so this wasn't a concern there).
- Templates are two named blocks in one parsed set (`index` and `songs`)
  so the vote/search handlers can render just the fragment, and the
  full-page handler can render the shell with the fragment inlined —
  same trick as Jinja's `{% include %}`.

## Playing songs out loud

There's now a background loop (`playerLoop` in `main.go`) that runs
independent of any web request. Every 2 seconds it checks whoever's
#1, and if it's not who's currently playing, it plays it through
whatever speakers are attached to the machine the server runs on —
this is a physical/server-side player, not something that plays in
the visitor's browser.

**It needs an audio player installed on the machine.** It tries, in
order: `ffplay` (from ffmpeg — works on Linux/Mac/Windows and can
stream a URL directly), `mpg123`, then macOS's built-in `afplay`. If
none are found it logs a warning once and just runs the voting site
without playback.

```
# Linux
sudo apt install ffmpeg

# macOS
brew install ffmpeg
# (or skip this — afplay is already built in, just slower to detect URLs by ear)
```

**The example URL that works:** each song's `AudioURL` field points at
SoundHelix's free example tracks, e.g.:

```
https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3
```

These are freely usable for exactly this kind of testing (attribution
to SoundHelix required if you keep using them beyond testing — see
soundhelix.com). Any direct link to an actual audio file works the
same way — it does **not** work with a YouTube link, a Spotify link,
or anything that isn't a direct file URL, since `ffplay` needs to open
the file/stream itself.

**What happens after a song plays:** its votes reset to zero and it's
sent to the back of the tie-break order, so the next-most-voted song
takes over automatically — the queue never runs dry, even if nobody's
voting, it just cycles through everything.

**Now Playing indicator:** the page shows a small live "Now playing: …"
line near the top, polling `/now-playing` every 3 seconds via htmx —
no page reload, no JS you have to write.

## Next step

Swap the in-memory `songs` slice for a real database (the
`song`/`SongView` split already separates storage from what gets
rendered, so that swap only touches `visibleSongs()` and
`currentTopUnfiltered()`), then point `AudioURL` at your own uploaded
files instead of the SoundHelix examples.
