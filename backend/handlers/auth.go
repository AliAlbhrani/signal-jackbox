package handlers

import (
	"encoding/json"
	"net/http"

	"signal-jackbox-api/services"
)

func AdminLoginHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		services.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if !services.AuthenticateAdmin(input.Username, input.Password) {
		services.WriteError(w, http.StatusUnauthorized, "invalid username or password")
		return
	}

	token, err := services.CreateAdminSession(input.Username)
	if err != nil {
		services.WriteError(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	services.SetAdminSessionCookie(w, token)
	services.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"authenticated": true,
		"username":      input.Username,
	})
}

func AdminLogoutHandler(w http.ResponseWriter, r *http.Request) {
	services.DeleteAdminSession(services.GetAdminSessionToken(r))
	services.ClearAdminSessionCookie(w)
	services.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"authenticated": false,
	})
}

func AdminMeHandler(w http.ResponseWriter, r *http.Request) {
	username, ok := services.ValidateAdminSession(services.GetAdminSessionToken(r))
	if !ok {
		services.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"authenticated": false,
		})
		return
	}

	services.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"authenticated": true,
		"username":      username,
	})
}

func RequireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, ok := services.ValidateAdminSession(services.GetAdminSessionToken(r)); !ok {
			services.WriteError(w, http.StatusUnauthorized, "admin authentication required")
			return
		}
		next(w, r)
	}
}
