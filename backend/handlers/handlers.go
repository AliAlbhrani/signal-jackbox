package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"signal-jackbox-api/engine"
	"signal-jackbox-api/models"
	"signal-jackbox-api/services"

	"github.com/dhowden/tag"
	"github.com/redis/go-redis/v9"
)

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	services.WriteJSON(w, 200, map[string]string{"status": "ok"})
}

// ─── Public (voting frontend) ────────────────────────────────────────────────

func ListSongsHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	voterID := services.EnsureVoterCookie(w, r)

	songs, total, err := services.GetSongsForVoter(voterID, query)
	if err != nil {
		services.WriteError(w, 500, "failed to fetch songs")
		return
	}

	services.WriteJSON(w, 200, map[string]interface{}{
		"songs": songs,
		"query": query,
		"total": total,
	})
}

func GetSongHandler(w http.ResponseWriter, r *http.Request) {
	id := services.ParseIDFromPath(r.URL.Path, "/api/songs/")
	if id == 0 {
		services.WriteError(w, 400, "invalid song id")
		return
	}

	song, err := services.GetSongByID(id)
	if err != nil {
		services.WriteError(w, 404, "song not found")
		return
	}

	voterID := services.EnsureVoterCookie(w, r)
	song.Voted = services.HasVoted(id, voterID)

	services.WriteJSON(w, 200, song)
}

func VoteHandler(w http.ResponseWriter, r *http.Request) {
	id := services.ParseIDFromPath(r.URL.Path, "/api/songs/")
	if id == 0 {
		services.WriteError(w, 400, "invalid song id")
		return
	}

	voterID := services.EnsureVoterCookie(w, r)
	if err := services.ToggleVote(id, voterID); err != nil {
		services.WriteError(w, 500, "vote failed")
		return
	}

	var body struct {
		Query string `json:"query"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	songs, total, _ := services.GetSongsForVoter(voterID, body.Query)
	services.WriteJSON(w, 200, map[string]interface{}{
		"songs": songs,
		"query": body.Query,
		"total": total,
	})
}

func SongCoverHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	if idStr == "" {
		http.NotFound(w, r)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id == 0 {
		http.NotFound(w, r)
		return
	}

	coverPath := filepath.Join("uploads", fmt.Sprintf("cover_%d.jpg", id))
	if _, err := os.Stat(coverPath); os.IsNotExist(err) {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "image/jpeg")
	http.ServeFile(w, r, coverPath)
}

func NowPlayingHandler(w http.ResponseWriter, r *http.Request) {
	song, err := services.GetNowPlaying()
	if err != nil || song == nil {
		services.WriteJSON(w, 200, map[string]interface{}{
			"song":     nil,
			"autoplay": services.IsAutoPlay(),
		})
		return
	}
	services.WriteJSON(w, 200, map[string]interface{}{
		"song":     song,
		"autoplay": services.IsAutoPlay(),
	})
}

// ─── Admin ───────────────────────────────────────────────────────────────────

func AdminListSongsHandler(w http.ResponseWriter, r *http.Request) {
	songs, err := services.GetAllSongsAdmin()
	if err != nil {
		services.WriteError(w, 500, "failed to fetch songs")
		return
	}
	services.WriteJSON(w, 200, map[string]interface{}{
		"songs": songs,
		"total": len(songs),
	})
}

func AdminAddSongHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Title    string `json:"title"`
		Artist   string `json:"artist"`
		Cover    string `json:"cover"`
		AudioURL string `json:"audio_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		services.WriteError(w, 400, "invalid request body")
		return
	}

	if input.Title == "" || input.Artist == "" || input.AudioURL == "" {
		services.WriteError(w, 400, "title, artist, and audio_url are required")
		return
	}

	song := models.Song{
		Title:    input.Title,
		Artist:   input.Artist,
		Cover:    input.Cover,
		AudioURL: input.AudioURL,
	}

	if err := services.AddSong(song); err != nil {
		services.WriteError(w, 500, "failed to add song")
		return
	}

	songs, _ := services.GetAllSongsAdmin()
	services.WriteJSON(w, 201, map[string]interface{}{
		"songs": songs,
		"total": len(songs),
	})
}

func AdminUpdateSongHandler(w http.ResponseWriter, r *http.Request) {
	id := services.ParseIDFromPath(r.URL.Path, "/api/admin/songs/")
	if id == 0 {
		services.WriteError(w, 400, "invalid song id")
		return
	}

	var input struct {
		Title    string `json:"title"`
		Artist   string `json:"artist"`
		Cover    string `json:"cover"`
		AudioURL string `json:"audio_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		services.WriteError(w, 400, "invalid request body")
		return
	}

	song := models.Song{
		Title:    input.Title,
		Artist:   input.Artist,
		Cover:    input.Cover,
		AudioURL: input.AudioURL,
	}

	if err := services.UpdateSong(id, song); err != nil {
		services.WriteError(w, 404, "song not found")
		return
	}

	updated, _ := services.GetSongByID(id)
	services.WriteJSON(w, 200, updated)
}

func AdminDeleteSongHandler(w http.ResponseWriter, r *http.Request) {
	id := services.ParseIDFromPath(r.URL.Path, "/api/admin/songs/")
	if id == 0 {
		services.WriteError(w, 400, "invalid song id")
		return
	}

	if err := services.DeleteSong(id); err != nil {
		services.WriteError(w, 404, "song not found")
		return
	}

	songs, _ := services.GetAllSongsAdmin()
	services.WriteJSON(w, 200, map[string]interface{}{
		"songs":  songs,
		"total":  len(songs),
		"status": "deleted",
	})
}

func AdminPlaySongHandler(w http.ResponseWriter, r *http.Request) {
	id := services.ParseIDFromPath(r.URL.Path, "/api/admin/play/")
	if id == 0 {
		services.WriteError(w, 400, "invalid song id")
		return
	}

	if err := services.PlayByID(id); err != nil {
		services.WriteError(w, 404, "song not found")
		return
	}

	song, _ := services.GetSongByID(id)
	services.WriteJSON(w, 200, song)
}

func AdminPlayTopHandler(w http.ResponseWriter, r *http.Request) {
	if err := services.PlayTopVoted(); err != nil {
		services.WriteError(w, 404, "no songs in queue")
		return
	}

	song, _ := services.GetNowPlaying()
	services.WriteJSON(w, 200, song)
}

func AdminPlayNextHandler(w http.ResponseWriter, r *http.Request) {
	next, err := services.GetNextSong()
	if err != nil {
		services.WriteError(w, 404, "no songs in queue")
		return
	}

	if err := services.PlayByID(next.ID); err != nil {
		services.WriteError(w, 500, "failed to play song")
		return
	}

	services.WriteJSON(w, 200, next)
}

func AdminStopHandler(w http.ResponseWriter, r *http.Request) {
	services.StopPlayback()
	services.WriteJSON(w, 200, map[string]string{"status": "stopped"})
}

func AdminToggleHiddenHandler(w http.ResponseWriter, r *http.Request) {
	id := services.ParseIDFromPath(r.URL.Path, "/api/admin/songs/")
	if id == 0 {
		services.WriteError(w, 400, "invalid song id")
		return
	}

	if err := services.ToggleHidden(id); err != nil {
		services.WriteError(w, 404, "song not found")
		return
	}

	songs, _ := services.GetAllSongsAdmin()
	services.WriteJSON(w, 200, map[string]interface{}{
		"songs": songs,
		"total": len(songs),
	})
}

func AdminAutoPlayHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		services.WriteError(w, 400, "invalid request body")
		return
	}

	services.SetAutoPlay(input.Enabled)

	state := "off"
	if input.Enabled {
		state = "on"
	}
	services.WriteJSON(w, 200, map[string]interface{}{
		"autoplay": input.Enabled,
		"status":   state,
	})
}

// ─── Upload ──────────────────────────────────────────────────────────────────

func AdminUploadSongHandler(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(50 << 20); err != nil {
		services.WriteError(w, 400, "failed to parse form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		services.WriteError(w, 400, "file is required")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".mp3" && ext != ".flac" && ext != ".ogg" && ext != ".m4a" && ext != ".wav" {
		services.WriteError(w, 400, "unsupported format, use mp3/flac/ogg/m4a/wav")
		return
	}

	uploadDir := "uploads"
	os.MkdirAll(uploadDir, 0755)

	// Save to temp file first
	tmpPath := filepath.Join(uploadDir, "tmp_"+header.Filename)
	tmpOut, err := os.Create(tmpPath)
	if err != nil {
		services.WriteError(w, 500, "failed to save file")
		return
	}
	if _, err := io.Copy(tmpOut, file); err != nil {
		tmpOut.Close()
		os.Remove(tmpPath)
		services.WriteError(w, 500, "failed to save file")
		return
	}
	tmpOut.Close()

	// Read ID3 tags from temp file
	coverData := []byte(nil)
	title := strings.TrimSuffix(header.Filename, ext)
	artist := "Unknown Artist"

	if f, err := os.Open(tmpPath); err == nil {
		if m, err := tag.ReadFrom(f); err == nil {
			if t := m.Title(); t != "" {
				title = t
			}
			if a := m.Artist(); a != "" {
				artist = a
			}
			if pic := m.Picture(); pic != nil {
				coverData = pic.Data
			}
		}
		f.Close()
	}

	// Insert song into DB to get ID
	var songID int
	err = engine.DB.QueryRow(
		"INSERT INTO songs (title, artist, cover, audio_url) VALUES ($1, $2, '', '') RETURNING id",
		title, artist,
	).Scan(&songID)
	if err != nil {
		os.Remove(tmpPath)
		services.WriteError(w, 500, "failed to add song")
		return
	}

	// Rename temp file with actual ID
	audioFilename := fmt.Sprintf("song_%d%s", songID, ext)
	audioPath := filepath.Join(uploadDir, audioFilename)
	os.Rename(tmpPath, audioPath)

	// Save cover art if present
	coverExists := false
	if coverData != nil {
		coverFilename := fmt.Sprintf("cover_%d.jpg", songID)
		coverPath := filepath.Join(uploadDir, coverFilename)
		if cf, err := os.Create(coverPath); err == nil {
			cf.Write(coverData)
			cf.Close()
			coverExists = true
		}
	}

	// Update song with correct paths
	coverValue := ""
	if coverExists {
		coverValue = "true"
	}
	engine.DB.Exec("UPDATE songs SET cover=$1, audio_url=$2 WHERE id=$3",
		coverValue, "/api/uploads/"+audioFilename, songID)

	// Add to Redis sorted set
	ctx := context.Background()
	engine.Client.ZAdd(ctx, "songs:ranked", redis.Z{Score: 0, Member: songID})

	songs, _ := services.GetAllSongsAdmin()
	services.WriteJSON(w, 201, map[string]interface{}{
		"songs": songs,
		"total": len(songs),
	})
}
