package main

import (
	"log"
	"net/http"

	"signal-jackbox-api/config"
	"signal-jackbox-api/engine"
	"signal-jackbox-api/handlers"
	"signal-jackbox-api/services"
)

func main() {
	config.Load()
	engine.InitDB()
	engine.InitRedis()
	services.RunMigrations()

	mux := http.NewServeMux()

	// Static files (uploaded songs and covers)
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))
	mux.Handle("/api/uploads/", http.StripPrefix("/api/uploads/", http.FileServer(http.Dir("uploads"))))

	// Health
	mux.HandleFunc("/api/health", handlers.HealthHandler)

	// Public songs (voting frontend)
	mux.HandleFunc("/api/songs", engine.MethodRouter(map[string]http.HandlerFunc{
		"GET": handlers.ListSongsHandler,
	}))
	mux.HandleFunc("/api/songs/", engine.MethodRouter(map[string]http.HandlerFunc{
		"GET":  handlers.GetSongHandler,
		"POST": handlers.VoteHandler,
	}))
	mux.HandleFunc("GET /api/songs/{id}/cover", handlers.SongCoverHandler)

	// Now playing
	mux.HandleFunc("/api/now-playing", engine.MethodRouter(map[string]http.HandlerFunc{
		"GET": handlers.NowPlayingHandler,
	}))

	// Admin
	mux.HandleFunc("/api/admin/songs", engine.MethodRouter(map[string]http.HandlerFunc{
		"GET":  handlers.AdminListSongsHandler,
		"POST": handlers.AdminAddSongHandler,
	}))
	mux.HandleFunc("/api/admin/songs/", engine.MethodRouter(map[string]http.HandlerFunc{
		"PUT":    handlers.AdminUpdateSongHandler,
		"DELETE": handlers.AdminDeleteSongHandler,
		"POST":   handlers.AdminToggleHiddenHandler,
	}))
	mux.HandleFunc("/api/admin/upload", engine.MethodRouter(map[string]http.HandlerFunc{
		"POST": handlers.AdminUploadSongHandler,
	}))
	mux.HandleFunc("/api/admin/play/", engine.MethodRouter(map[string]http.HandlerFunc{
		"POST": handlers.AdminPlaySongHandler,
	}))
	mux.HandleFunc("/api/admin/play", engine.MethodRouter(map[string]http.HandlerFunc{
		"POST": handlers.AdminPlayTopHandler,
	}))
	mux.HandleFunc("/api/admin/play-next", engine.MethodRouter(map[string]http.HandlerFunc{
		"POST": handlers.AdminPlayNextHandler,
	}))
	mux.HandleFunc("/api/admin/stop", engine.MethodRouter(map[string]http.HandlerFunc{
		"POST": handlers.AdminStopHandler,
	}))
	mux.HandleFunc("/api/admin/autoplay", engine.MethodRouter(map[string]http.HandlerFunc{
		"POST": handlers.AdminAutoPlayHandler,
	}))

	addr := ":8080"
	log.Printf("api server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, engine.CORSMiddleware(mux)))
}
