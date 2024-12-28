class YouTunesPlayer {
    constructor() {
        this.CONFIG = {
            API_KEY: 'AIzaSyDYc-tKO_7tzQUjtBN_2rB6UCQ5hr_oVwI',
            SEARCH_DELAY: 500,
            MAX_HISTORY: 10,
            DEFAULT_VOLUME: 80
        };

        this.player = null;
        this.currentVideoId = null;
        this.playlist = [];
        this.currentIndex = 0;
        this.isRepeat = false;
        this.isShuffle = false;
        this.isPlayerReady = false;  // Add this flag

        this.initializeElements();
        this.setupEventListeners();
        this.loadYouTubeAPI();
    }

    loadYouTubeAPI() {
        // First, load the IFrame Player API code
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // Setup the callback
        window.onYouTubeIframeAPIReady = () => {
            this.player = new YT.Player('youtube-player', {
                height: '360',
                width: '640',
                playerVars: {
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    rel: 0
                },
                events: {
                    onReady: () => this.onPlayerReady(),
                    onStateChange: (event) => this.onPlayerStateChange(event)
                }
            });
        };
    }

    onPlayerReady() {
        this.isPlayerReady = true;  // Set the flag when player is ready
        this.setVolume(this.CONFIG.DEFAULT_VOLUME);
        this.updateProgressBar();
    }

    playSong(songData) {
        if (!this.isPlayerReady) {
            console.warn('YouTube player is not ready yet. Waiting...');
            setTimeout(() => this.playSong(songData), 1000);
            return;
        }

        this.currentVideoId = songData.id.videoId;
        this.player.loadVideoById(this.currentVideoId);
        this.updateSongInfo(songData.snippet);
        this.addToHistory(songData);
    }

    // ... rest of the class remains the same ...
}

// Initialize the player when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new YouTunesPlayer();
});
