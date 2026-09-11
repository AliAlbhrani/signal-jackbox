package engine

import (
	"database/sql"
	"log"

	"signal-jackbox-api/config"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDB() {
	var err error
	DB, err = sql.Open("postgres", config.DBConnString())
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}

	if err := DB.Ping(); err != nil {
		log.Fatalf("database ping failed: %v", err)
	}

	DB.SetMaxOpenConns(10)
	log.Println("connected to postgres")
}
