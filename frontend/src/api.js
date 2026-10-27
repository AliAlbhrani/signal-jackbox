const API_BASE = (
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:8080/api`
).replace(/\/+$/, "");

export const apiBase = API_BASE;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, { method = "GET", body, headers, ...rest } = {}) {
  const options = {
    method,
    credentials: "include",
    headers: { ...headers },
    ...rest,
  };

  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, options);
  const text = await res.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }

  return data;
}

export function fetchSongs(query = "") {
  const path = query ? `/songs?q=${encodeURIComponent(query)}` : "/songs";
  return request(path);
}

export function toggleVote(songId, query = "") {
  return request(`/songs/${songId}/vote`, {
    method: "POST",
    body: { query },
  });
}

export function fetchNowPlaying() {
  return request("/now-playing");
}

export function adminLogin(username, password) {
  return request("/admin/login", {
    method: "POST",
    body: { username, password },
  });
}

export function adminLogout() {
  return request("/admin/logout", { method: "POST" });
}

export function fetchAdminMe() {
  return request("/admin/me");
}

export function fetchAdminSongs() {
  return request("/admin/songs");
}

export function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  return request("/admin/upload", { method: "POST", body: form });
}

export function deleteSong(id) {
  return request(`/admin/songs/${id}`, { method: "DELETE" });
}

export function playSong(id) {
  return request(`/admin/play/${id}`, { method: "POST" });
}

export function playTop() {
  return request("/admin/play", { method: "POST" });
}

export function playNext() {
  return request("/admin/play-next", { method: "POST" });
}

export function stopPlayback() {
  return request("/admin/stop", { method: "POST" });
}

export function setAutoPlay(enabled) {
  return request("/admin/autoplay", {
    method: "POST",
    body: { enabled },
  });
}

export function toggleHidden(id) {
  return request(`/admin/songs/${id}`, { method: "POST" });
}
