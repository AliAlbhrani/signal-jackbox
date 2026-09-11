package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"

	"signal-jackbox-api/engine"
	"signal-jackbox-api/models"

	"github.com/redis/go-redis/v9"
)

const (
	rankedSetKey  = "songs:ranked"
	nowPlayingKey = "now:playing"
	autoPlayKey   = "autoplay"
	votesPrefix   = "votes:%s"
	voterCookie   = "voter_id"
)

func votesKey(voterID string) string { return fmt.Sprintf(votesPrefix, voterID) }

// ─── Migrations ──────────────────────────────────────────────────────────────

func RunMigrations() {
	migrations := []string{"migrations/001_init.sql", "migrations/002_add_hidden.sql"}
	for _, m := range migrations {
		data, err := os.ReadFile(m)
		if err != nil {
			log.Printf("migration file not found: %s (%v)", m, err)
			continue
		}
		if _, err := engine.DB.Exec(string(data)); err != nil {
			log.Printf("migration error (%s): %v", m, err)
		}
	}
	log.Println("migrations applied")
}

// ─── Player ──────────────────────────────────────────────────────────────────

var (
	playerMu     sync.Mutex
	playerCmd    *exec.Cmd
	playerCancel context.CancelFunc
)

func findPlayer(url string) *exec.Cmd {
	if path, err := exec.LookPath("ffplay"); err == nil {
		return exec.Command(path, "-nodisp", "-autoexit", "-loglevel", "quiet", url)
	}
	if path, err := exec.LookPath("mpg123"); err == nil {
		return exec.Command(path, "-q", url)
	}
	if path, err := exec.LookPath("afplay"); err == nil {
		return exec.Command(path, url)
	}
	return nil
}

func StopPlayer() {
	playerMu.Lock()
	defer playerMu.Unlock()
	if playerCancel != nil {
		playerCancel()
		playerCancel = nil
	}
	if playerCmd != nil && playerCmd.Process != nil {
		_ = playerCmd.Process.Kill()
		playerCmd = nil
	}
}

func playSongRaw(song models.Song, onDone func()) {
	StopPlayer()
	playerMu.Lock()
	defer playerMu.Unlock()

	// Resolve relative URLs to localhost
	audioURL := song.AudioURL
	if strings.HasPrefix(audioURL, "/api/uploads/") {
		audioURL = "http://localhost:8080" + audioURL
	} else if strings.HasPrefix(audioURL, "/uploads/") {
		audioURL = "http://localhost:8080" + audioURL
	}

	cmd := findPlayer(audioURL)
	if cmd == nil {
		log.Println("no audio player found (ffplay/mpg123/afplay)")
		if onDone != nil {
			go onDone()
		}
		return
	}

	_, cancel := context.WithCancel(context.Background())
	playerCancel = cancel
	playerCmd = cmd
	cmd.Stdout = nil
	cmd.Stderr = nil

	if err := cmd.Start(); err != nil {
		log.Printf("play error: %v", err)
		if onDone != nil {
			go onDone()
		}
		return
	}

	log.Printf("playing: %s — %s", song.Title, song.Artist)

	go func() {
		_ = cmd.Wait()
		playerMu.Lock()
		done := playerCmd == nil || playerCmd == cmd
		if playerCmd == cmd {
			playerCmd = nil
			playerCancel = nil
		}
		playerMu.Unlock()
		if done && onDone != nil {
			onDone()
		}
	}()
}

// ─── Auto Play ───────────────────────────────────────────────────────────────

func SetAutoPlay(enabled bool) {
	ctx := context.Background()
	if enabled {
		engine.Client.Set(ctx, autoPlayKey, "1", 0)
		if GetCurrentSongID() == 0 {
			playNextSong()
		}
	} else {
		engine.Client.Set(ctx, autoPlayKey, "0", 0)
	}
}

func IsAutoPlay() bool {
	ctx := context.Background()
	val, err := engine.Client.Get(ctx, autoPlayKey).Result()
	return err == nil && val == "1"
}

func playNextSong() {
	next, err := GetNextSong()
	if err != nil || next == nil {
		log.Println("no more songs to play")
		ClearNowPlaying()
		return
	}
	PlayByID(next.ID)
}

func GetNextSong() (*models.Song, error) {
	currentID := GetCurrentSongID()
	songs, err := GetAllSongs()
	if err != nil {
		return nil, err
	}
	for _, s := range songs {
		if s.ID != currentID {
			return &s, nil
		}
	}
	return nil, fmt.Errorf("no songs available")
}

func GetCurrentSongID() int {
	ctx := context.Background()
	idStr, err := engine.Client.Get(ctx, nowPlayingKey).Result()
	if err != nil || idStr == "" {
		return 0
	}
	id, _ := strconv.Atoi(idStr)
	return id
}

func ClearNowPlaying() {
	ctx := context.Background()
	engine.Client.Del(ctx, nowPlayingKey)
}

func songOnDone() {
	ClearNowPlaying()
	if IsAutoPlay() {
		log.Println("auto-play: advancing to next song")
		playNextSong()
	} else {
		log.Println("playback finished, auto-play is off")
	}
}

// ─── Voter Cookie ────────────────────────────────────────────────────────────

func NewVoterID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func EnsureVoterCookie(w http.ResponseWriter, r *http.Request) string {
	if c, err := r.Cookie(voterCookie); err == nil && c.Value != "" {
		return c.Value
	}
	id := NewVoterID()
	http.SetCookie(w, &http.Cookie{
		Name:     voterCookie,
		Value:    id,
		Path:     "/",
		MaxAge:   60 * 60 * 24 * 365,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	return id
}

// ─── Song CRUD (PostgreSQL + Redis votes) ────────────────────────────────────

func GetAllSongs() ([]models.Song, error) {
	return getSongs(false)
}

func GetAllSongsAdmin() ([]models.Song, error) {
	return getSongs(true)
}

func getSongs(includeHidden bool) ([]models.Song, error) {
	ctx := context.Background()

	// Get all song IDs ordered by votes from Redis sorted set
	ids, err := engine.Client.ZRevRangeWithScores(ctx, rankedSetKey, 0, -1).Result()
	if err != nil {
		return nil, err
	}

	var songs []models.Song
	rank := 1
	for _, z := range ids {
		id, _ := strconv.Atoi(fmt.Sprintf("%v", z.Member))
		votes := int(z.Score)

		// Fetch song data from PostgreSQL
		var s models.Song
		var query string
		if includeHidden {
			query = "SELECT id, title, artist, cover, audio_url, hidden FROM songs WHERE id = $1"
		} else {
			query = "SELECT id, title, artist, cover, audio_url, hidden FROM songs WHERE id = $1 AND hidden = FALSE"
		}
		err := engine.DB.QueryRow(query, id).Scan(&s.ID, &s.Title, &s.Artist, &s.Cover, &s.AudioURL, &s.Hidden)
		if err != nil {
			continue
		}

		s.Votes = votes
		s.Rank = rank
		songs = append(songs, s)
		rank++
	}
	return songs, nil
}

func GetSongsForVoter(voterID string, query string) ([]models.Song, int, error) {
	currentID := GetCurrentSongID()

	songs, err := GetAllSongs()
	if err != nil {
		return nil, 0, err
	}

	// Get voter's votes from Redis
	ctx := context.Background()
	votedIDs, _ := engine.Client.SMembers(ctx, votesKey(voterID)).Result()
	votedSet := make(map[int]bool, len(votedIDs))
	for _, vid := range votedIDs {
		if id, err := strconv.Atoi(vid); err == nil {
			votedSet[id] = true
		}
	}

	result := make([]models.Song, 0, len(songs))
	rank := 1
	for _, s := range songs {
		// Skip currently playing song
		if s.ID == currentID {
			continue
		}

		s.Voted = votedSet[s.ID]

		if query != "" {
			q := strings.ToLower(query)
			if !strings.Contains(strings.ToLower(s.Title), q) &&
				!strings.Contains(strings.ToLower(s.Artist), q) {
				rank++
				continue
			}
		}

		s.Rank = rank
		result = append(result, s)
		rank++
	}
	return result, len(result), nil
}

func GetSongByID(id int) (*models.Song, error) {
	var s models.Song
	err := engine.DB.QueryRow("SELECT id, title, artist, cover, audio_url, hidden FROM songs WHERE id = $1", id).
		Scan(&s.ID, &s.Title, &s.Artist, &s.Cover, &s.AudioURL, &s.Hidden)
	if err != nil {
		return nil, fmt.Errorf("song not found")
	}
	s.Votes = GetVoteCount(id)
	return &s, nil
}

func ToggleHidden(id int) error {
	result, err := engine.DB.Exec("UPDATE songs SET hidden = NOT hidden WHERE id = $1", id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("song not found")
	}
	return nil
}

func AddSong(song models.Song) error {
	err := engine.DB.QueryRow(
		"INSERT INTO songs (title, artist, cover, audio_url) VALUES ($1, $2, $3, $4) RETURNING id",
		song.Title, song.Artist, song.Cover, song.AudioURL,
	).Scan(&song.ID)
	if err != nil {
		return err
	}
	// Add to Redis sorted set
	ctx := context.Background()
	engine.Client.ZAdd(ctx, rankedSetKey, redis.Z{Score: 0, Member: song.ID})
	return nil
}

func UpdateSong(id int, song models.Song) error {
	result, err := engine.DB.Exec(
		"UPDATE songs SET title=$1, artist=$2, cover=$3, audio_url=$4 WHERE id=$5",
		song.Title, song.Artist, song.Cover, song.AudioURL, id,
	)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("song not found")
	}
	return nil
}

func DeleteSong(id int) error {
	ctx := context.Background()
	result, err := engine.DB.Exec("DELETE FROM songs WHERE id=$1", id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("song not found")
	}
	// Clean up Redis sorted set and files
	engine.Client.ZRem(ctx, rankedSetKey, id)
	os.Remove(filepath.Join("uploads", fmt.Sprintf("song_%d.mp3", id)))
	os.Remove(filepath.Join("uploads", fmt.Sprintf("song_%d.flac", id)))
	os.Remove(filepath.Join("uploads", fmt.Sprintf("song_%d.ogg", id)))
	os.Remove(filepath.Join("uploads", fmt.Sprintf("song_%d.m4a", id)))
	os.Remove(filepath.Join("uploads", fmt.Sprintf("song_%d.wav", id)))
	os.Remove(filepath.Join("uploads", fmt.Sprintf("cover_%d.jpg", id)))
	return nil
}

// ─── Voting (Redis sorted set) ───────────────────────────────────────────────

func HasVoted(songID int, voterID string) bool {
	ctx := context.Background()
	voted, _ := engine.Client.SIsMember(ctx, votesKey(voterID), songID).Result()
	return voted
}

func ToggleVote(id int, voterID string) error {
	ctx := context.Background()
	voted, _ := engine.Client.SIsMember(ctx, votesKey(voterID), id).Result()

	pipe := engine.Client.Pipeline()
	if voted {
		pipe.SRem(ctx, votesKey(voterID), id)
		pipe.HIncrBy(ctx, songKey(id), "votes", -1)
		pipe.ZIncrBy(ctx, rankedSetKey, -1, strconv.Itoa(id))
	} else {
		pipe.SAdd(ctx, votesKey(voterID), id)
		pipe.HIncrBy(ctx, songKey(id), "votes", 1)
		pipe.ZIncrBy(ctx, rankedSetKey, 1, strconv.Itoa(id))
	}
	_, err := pipe.Exec(ctx)
	return err
}

// Vote counts are stored in Redis sorted set for fast ranking,
// but we also sync to PostgreSQL for persistence
func SyncVotesToDB(id int) {
	ctx := context.Background()
	score, err := engine.Client.ZScore(ctx, rankedSetKey, strconv.Itoa(id)).Result()
	if err != nil {
		return
	}
	engine.DB.Exec("UPDATE songs SET votes = $1 WHERE id = $2", int(score), id)
}

func GetVoteCount(songID int) int {
	ctx := context.Background()
	score, err := engine.Client.ZScore(ctx, rankedSetKey, strconv.Itoa(songID)).Result()
	if err != nil {
		return 0
	}
	return int(score)
}

// ─── Now Playing ─────────────────────────────────────────────────────────────

func GetNowPlaying() (*models.Song, error) {
	ctx := context.Background()
	idStr, err := engine.Client.Get(ctx, nowPlayingKey).Result()
	if err != nil || idStr == "" {
		return nil, nil
	}
	id, _ := strconv.Atoi(idStr)
	return GetSongByID(id)
}

func PlayByID(id int) error {
	song, err := GetSongByID(id)
	if err != nil {
		return err
	}
	ctx := context.Background()
	engine.Client.Set(ctx, nowPlayingKey, id, 0)
	go playSongRaw(*song, songOnDone)
	return nil
}

func PlayTopVoted() error {
	next, err := GetNextSong()
	if err != nil {
		return fmt.Errorf("no songs in queue")
	}
	return PlayByID(next.ID)
}

func StopPlayback() {
	StopPlayer()
	ClearNowPlaying()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func songKey(id int) string { return fmt.Sprintf("song:%d:votes", id) }

func ParseIDFromPath(path, prefix string) int {
	rest := strings.TrimPrefix(path, prefix)
	rest = strings.Split(rest, "/")[0]
	id, _ := strconv.Atoi(rest)
	return id
}

func WriteJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func WriteError(w http.ResponseWriter, status int, msg string) {
	WriteJSON(w, status, map[string]string{"error": msg})
}
