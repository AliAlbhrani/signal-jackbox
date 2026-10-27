package services

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"net/http"
	"time"

	"signal-jackbox-api/config"
	"signal-jackbox-api/engine"
)

const (
	adminSessionCookie = "admin_session"
	adminSessionPrefix = "admin:session:"
	adminSessionTTL    = 24 * time.Hour
)

func adminSessionKey(token string) string {
	return adminSessionPrefix + token
}

func AuthenticateAdmin(username, password string) bool {
	userOK := subtle.ConstantTimeCompare([]byte(username), []byte(config.C.AdminUsername)) == 1
	passOK := subtle.ConstantTimeCompare([]byte(password), []byte(config.C.AdminPassword)) == 1
	return userOK && passOK
}

func CreateAdminSession(username string) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	token := hex.EncodeToString(b)
	ctx := context.Background()
	if err := engine.Client.Set(ctx, adminSessionKey(token), username, adminSessionTTL).Err(); err != nil {
		return "", err
	}
	return token, nil
}

func ValidateAdminSession(token string) (string, bool) {
	if token == "" {
		return "", false
	}

	ctx := context.Background()
	username, err := engine.Client.Get(ctx, adminSessionKey(token)).Result()
	if err != nil {
		return "", false
	}
	return username, true
}

func DeleteAdminSession(token string) {
	if token == "" {
		return
	}
	engine.Client.Del(context.Background(), adminSessionKey(token))
}

func GetAdminSessionToken(r *http.Request) string {
	c, err := r.Cookie(adminSessionCookie)
	if err != nil {
		return ""
	}
	return c.Value
}

func SetAdminSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     adminSessionCookie,
		Value:    token,
		Path:     "/",
		MaxAge:   int(adminSessionTTL.Seconds()),
		HttpOnly: true,
		Secure:   config.C.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func ClearAdminSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     adminSessionCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   config.C.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}
