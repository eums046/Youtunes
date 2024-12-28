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
        this.loadYouTubeAPI();
    }

    loadYouTubeAPI() {
        return new Promise((resolve, reject) => {
            // Check if API is already loaded
            if (window.YT) {
                this.initializeYouTubePlayer();
                resolve();
                return;
            }

            // Create and load the YouTube IFrame API script
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            tag.onerror = (error) => {
                console.error('Failed to load YouTube IFrame API:', error);
                reject(error);
            };
            
            // Define the callback for when API is ready
            window.onYouTubeIframeAPIReady = () => {
                this.initializeYouTubePlayer();
                resolve();
            };

            // Add the script to the page
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        });
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

            // Search functionality
            if (this.searchInput) {
                this.searchInput.addEventListener('input', (e) => {
                    clearTimeout(this._searchTimeout);
                    this._searchTimeout = setTimeout(() => {
                        this.handleSearch(e.target.value);
                    }, this.CONFIG.SEARCH_DELAY);
                });
            }

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

            // Player controls
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

        } catch (error) {
            console.error('Error setting up event listeners:', error);
            this.showError('Failed to set up player controls');
        }
    }

    async handleSearch(query) {
        if (!query || query.length < 2) {
            if (this.searchResults) {
                this.searchResults.style.display = 'none';
            }
            return;
        }

        try {
            const response = await this.searchYouTube(query);
            this.displaySearchResults(response.items || []);
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed. Please try again.');
        }
    }

    // ... (rest of your methods remain the same)
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
