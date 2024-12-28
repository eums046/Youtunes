class YouTunesPlayer {
    constructor() {
        this.CONFIG = {
            API_KEY: 'AIzaSyDYc-tKO_7tzQUjtBN_2rB6UCQ5hr_oVwI',
            SEARCH_DELAY: 500,
            MAX_HISTORY: 10,
            DEFAULT_VOLUME: 80,
            PLAYER_INIT_TIMEOUT: 10000
        };

        this.player = null;
        this.currentVideoId = null;
        this.playlist = [];
        this.currentIndex = 0;
        this.isRepeat = false;
        this.isShuffle = false;
        this.isPlayerReady = false;
        this.playerInitPromise = null;
        this.progressInterval = null;

        // Initialize everything when the class is instantiated
        this.initializeElements();
        this.setupEventListeners();
        this.loadYouTubeAPI();  // New method to properly load the API
    }

    loadYouTubeAPI() {
        // Create and load the YouTube IFrame API script
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // Set up the callback
        window.onYouTubeIframeAPIReady = () => this.initializeYouTubePlayer();
    }

    initializeElements() {
        try {
            // Search elements
            this.searchInput = document.querySelector('.search');
            this.searchResults = document.getElementById('search-results');
            
            // Menu elements
            this.menuBtn = document.querySelector('.menu-btn');
            this.menuItems = document.querySelector('.menu-items');
            
            // Player info elements
            this.currentSongElement = document.getElementById('current-song');
            this.currentArtistElement = document.getElementById('current-artist');
            this.thumbnail = document.getElementById('song-thumbnail');
            
            // Control buttons
            this.playPauseBtn = document.getElementById('play-pause-btn');
            this.prevBtn = document.getElementById('prev-btn');
            this.nextBtn = document.getElementById('next-btn');
            this.shuffleBtn = document.getElementById('shuffle-btn');
            this.repeatBtn = document.getElementById('repeat-btn');
            
            // Volume and progress elements
            this.volumeSlider = document.getElementById('volume-slider');
            this.progressBar = document.getElementById('progress');
            this.currentTimeElement = document.getElementById('current-time');
            this.durationElement = document.getElementById('duration');
            
            // History container
            this.historyContainer = document.getElementById('history-container');
        } catch (error) {
            console.error('Error initializing elements:', error);
            this.showError('Failed to initialize player elements');
        }
    }

    setupEventListeners() {
        try {
            // Menu toggle
            this.menuBtn?.addEventListener('click', () => {
                this.menuItems?.classList.toggle('show');
            });

            // Search functionality with proper debouncing
            let searchTimeout;
            this.searchInput?.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.handleSearch(), this.CONFIG.SEARCH_DELAY);
            });

            // Progress bar click handling
            const progressContainer = document.querySelector('.progress-container');
            progressContainer?.addEventListener('click', (e) => {
                const rect = progressContainer.getBoundingClientRect();
                const position = (e.clientX - rect.left) / rect.width;
                if (this.player && this.isPlayerReady) {
                    const duration = this.player.getDuration();
                    this.player.seekTo(duration * position);
                }
            });

            // Player controls with error handling
            this.playPauseBtn?.addEventListener('click', () => this.togglePlayPause());
            this.prevBtn?.addEventListener('click', () => this.playPrevious());
            this.nextBtn?.addEventListener('click', () => this.playNext());
            this.shuffleBtn?.addEventListener('click', () => this.toggleShuffle());
            this.repeatBtn?.addEventListener('click', () => this.toggleRepeat());
            this.volumeSlider?.addEventListener('input', (e) => this.setVolume(e.target.value));

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.nav')) {
                    this.menuItems?.classList.remove('show');
                }
            });

            // Global buttons
            document.querySelector('.shuffle')?.addEventListener('click', () => this.toggleShuffle());
            document.querySelector('.trending')?.addEventListener('click', () => this.loadTrendingTracks());

            // Keyboard controls
            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT') return; // Ignore when typing in input fields
                
                switch (e.key.toLowerCase()) {
                    case ' ':
                        e.preventDefault();
                        this.togglePlayPause();
                        break;
                    case 'arrowright':
                        this.playNext();
                        break;
                    case 'arrowleft':
                        this.playPrevious();
                        break;
                }
            });
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            this.showError('Failed to set up player controls');
        }
    }

    initializeYouTubePlayer() {
        try {
            this.player = new YT.Player('youtube-player', {
                height: '360',
                width: '640',
                playerVars: {
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    rel: 0,
                    modestbranding: 1,
                    origin: window.location.origin
                },
                events: {
                    onReady: () => this.onPlayerReady(),
                    onStateChange: (event) => this.onPlayerStateChange(event),
                    onError: (error) => this.handlePlayerError(error)
                }
            });
        } catch (error) {
            console.error('Error initializing YouTube player:', error);
            this.showError('Failed to initialize YouTube player');
        }
    }

    handlePlayerError(error) {
        console.error('YouTube player error:', error);
        const errorMessages = {
            2: 'Invalid parameter in request',
            5: 'Content cannot be played in HTML5 player',
            100: 'Video not found or removed',
            101: 'Video embedding not allowed',
            150: 'Video embedding not allowed'
        };
        this.showError(errorMessages[error.data] || 'An error occurred while playing the video');
        this.playNext(); // Try playing the next song
    }

    async searchYouTube(query) {
        try {
            const params = new URLSearchParams({
                part: 'snippet',
                type: 'video',
                q: query,
                key: this.CONFIG.API_KEY,
                maxResults: 10,
                videoCategoryId: '10' // Music category
            });
            
            const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`YouTube API request failed: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Failed to search YouTube. Please try again.');
            return { items: [] };
        }
    }

    // Rest of the methods remain the same...
    // (Keep all other methods as they were, they're working correctly)
}

// Initialize the player with error handling
try {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new YouTunesPlayer());
    } else {
        new YouTunesPlayer();
    }
} catch (error) {
    console.error('Failed to initialize YouTunesPlayer:', error);
}
