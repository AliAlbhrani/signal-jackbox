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

	// Admin auth
	mux.HandleFunc("/api/admin/login", engine.MethodRouter(map[string]http.HandlerFunc{
		"POST": handlers.AdminLoginHandler,
	}))
	mux.HandleFunc("/api/admin/logout", engine.MethodRouter(map[string]http.HandlerFunc{
		"POST": handlers.AdminLogoutHandler,
	}))
	mux.HandleFunc("/api/admin/me", engine.MethodRouter(map[string]http.HandlerFunc{
		"GET": handlers.AdminMeHandler,
	}))

	// Admin (requires a valid admin session)
	mux.HandleFunc("/api/admin/songs", engine.MethodRouter(map[string]http.HandlerFunc{
		"GET":  handlers.RequireAdmin(handlers.AdminListSongsHandler),
		"POST": handlers.RequireAdmin(handlers.AdminAddSongHandler),
	}))
	mux.HandleFunc("/api/admin/songs/", engine.MethodRouter(map[string]http.HandlerFunc{
		"PUT":    handlers.RequireAdmin(handlers.AdminUpdateSongHandler),
		"DELETE": handlers.RequireAdmin(handlers.AdminDeleteSongHandler),
		"POST":   handlers.RequireAdmin(handlers.AdminToggleHiddenHandler),
	}))
	mux.HandleFunc("/api/admin/upload", engine.MethodRouter(map[string]http.HandlerFunc{
		"POST": handlers.RequireAdmin(handlers.AdminUploadSongHandler),
	}))
	mux.HandleFunc("/api/admin/play/", engine.MethodRouter(map[string]http.HandlerFunc{
		"POST": handlers.RequireAdmin(handlers.AdminPlaySongHandler),
	}))
	mux.HandleFunc("/api/admin/play", engine.MethodRouter(map[string]http.HandlerFunc{
		"POST": handlers.RequireAdmin(handlers.AdminPlayTopHandler),
	}))
	mux.HandleFunc("/api/admin/play-next", engine.MethodRouter(map[string]http.HandlerFunc{
		"POST": handlers.RequireAdmin(handlers.AdminPlayNextHandler),
	}))
	mux.HandleFunc("/api/admin/stop", engine.MethodRouter(map[string]http.HandlerFunc{
		"POST": handlers.RequireAdmin(handlers.AdminStopHandler),
	}))
	mux.HandleFunc("/api/admin/autoplay", engine.MethodRouter(map[string]http.HandlerFunc{
		"POST": handlers.RequireAdmin(handlers.AdminAutoPlayHandler),
	}))

	addr := ":8080"
	log.Printf("api server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, engine.CORSMiddleware(mux)))
}
