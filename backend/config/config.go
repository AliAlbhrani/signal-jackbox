package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	RedisHost     string
	RedisPassword string
	AllowedOrigins string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
}

var C Config

func Load() {
	godotenv.Load()

	C = Config{
		RedisHost:      getEnv("REDIS_HOST", "localhost:6379"),
		RedisPassword:  getEnv("REDIS_PASSWORD", ""),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "signal-db@app"),
		DBPassword: getEnv("DB_PASSWORD", "signal@db123-app"),
		DBName:     getEnv("DB_NAME", "signal_db"),
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
