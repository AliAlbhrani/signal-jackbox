package models

type Song struct {
	ID       int    `json:"id"`
	Title    string `json:"title"`
	Artist   string `json:"artist"`
	Cover    string `json:"cover"`
	AudioURL string `json:"audio_url"`
	Votes    int    `json:"votes"`
	Rank     int    `json:"rank,omitempty"`
	Voted    bool   `json:"voted,omitempty"`
	Hidden   bool   `json:"hidden"`
}

type NowPlaying struct {
	Song *Song `json:"song"`
}
