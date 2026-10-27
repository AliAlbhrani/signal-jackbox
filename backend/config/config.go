package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	RedisHost      string
	RedisPassword  string
	AllowedOrigins string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string

	AdminUsername string
	AdminPassword string
	CookieSecure  bool
}

var C Config

func Load() {
	godotenv.Load()

	C = Config{
		RedisHost:      getEnv("REDIS_HOST", "localhost:6379"),
		RedisPassword:  getEnv("REDIS_PASSWORD", ""),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:4173,http://localhost:5173"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "signal-db@app"),
		DBPassword: getEnv("DB_PASSWORD", "signal@db123-app"),
		DBName:     getEnv("DB_NAME", "signal_db"),

		AdminUsername: getEnv("ADMIN_USERNAME", "admin"),
		AdminPassword: getEnv("ADMIN_PASSWORD", "admin"),
		CookieSecure:  getEnv("COOKIE_SECURE", "false") == "true",
	}

	if C.AdminPassword == "admin" {
		log.Println("WARNING: using the default admin password; set ADMIN_PASSWORD in backend/.env")
	}

	log.Println("config loaded")
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func DBConnString() string {
	return "host=" + C.DBHost +
		" port=" + C.DBPort +
		" user=" + C.DBUser +
		" password=" + C.DBPassword +
		" dbname=" + C.DBName +
		" sslmode=disable"
}
