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
        this.progressInterval = null;

        this.init();
    }

    // Initialize all components
    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.initializeYouTubePlayer();
    }

    // DOM Element Initialization
    initializeElements() {
        const selectors = {
            searchInput: '.search',
            searchResults: '#search-results',
            menuBtn: '.menu-btn',
            menuItems: '.menu-items',
            currentSong: '#current-song',
            currentArtist: '#current-artist',
            thumbnail: '#song-thumbnail',
            playPauseBtn: '#play-pause-btn',
            prevBtn: '#prev-btn',
            nextBtn: '#next-btn',
            shuffleBtn: '#shuffle-btn',
            repeatBtn: '#repeat-btn',
            volumeSlider: '#volume-slider',
            progress: '#progress',
            progressContainer: '.progress-container',
            currentTime: '#current-time',
            duration: '#duration',
            historyContainer: '#history-container',
            shuffleGlobalBtn: '.shuffle',
            trendingBtn: '.trending'
        };

        for (const [key, selector] of Object.entries(selectors)) {
            this[key] = document.querySelector(selector);
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Menu toggle
        this.menuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.menuItems?.classList.toggle('show');
        });

        // Search functionality
        this.searchInput?.addEventListener('input', (e) => this.debounceSearch(e.target.value));

        // Progress bar click
        this.progressContainer?.addEventListener('click', (e) => this.handleProgressClick(e));

        // Playback controls
        this.playPauseBtn?.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn?.addEventListener('click', () => this.playPrevious());
        this.nextBtn?.addEventListener('click', () => this.playNext());
        this.shuffleBtn?.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn?.addEventListener('click', () => this.toggleRepeat());
        this.volumeSlider?.addEventListener('input', (e) => this.setVolume(e.target.value));

        // Global actions
        this.shuffleGlobalBtn?.addEventListener('click', () => this.loadRandomTracks());
        this.trendingBtn?.addEventListener('click', () => this.loadTrendingTracks());

        // Menu and search close
        document.addEventListener('click', () => {
            this.menuItems?.classList.remove('show');
            this.searchResults?.classList.remove('show');
        });
    }

    // YouTube Player Initialization
    initializeYouTubePlayer() {
        this.player = new YT.Player('youtube-player', {
            height: '0',
            width: '0',
            playerVars: {
                controls: 0,
                disablekb: 1,
                fs: 0,
                rel: 0,
                modestbranding: 1
            },
            events: {
                onReady: () => this.onPlayerReady(),
                onStateChange: (event) => this.onPlayerStateChange(event),
                onError: (error) => this.onPlayerError(error)
            }
        });
    }

    // Search Handler with Debounce
    debounceSearch(query) {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => this.handleSearch(query), this.CONFIG.SEARCH_DELAY);
    }

    // Progress Click Handler
    handleProgressClick(e) {
        if (!this.isPlayerReady || !this.player) return;

        const rect = this.progressContainer.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        const duration = this.player.getDuration();

        this.player.seekTo(duration * position);
    }

    // API Search Handler
    async handleSearch(query) {
        if (!query || query.length < 2) {
            this.searchResults.style.display = 'none';
            return;
        }

        try {
            const results = await this.searchYouTube(query);
            this.displaySearchResults(results.items || []);
        } catch (error) {
            console.error('Search failed:', error);
            this.showError('Failed to fetch search results.');
        }
    }

    async searchYouTube(query) {
        const params = new URLSearchParams({
            part: 'snippet',
            type: 'video',
            q: `${query} music`,
            key: this.CONFIG.API_KEY,
            maxResults: 10,
            videoCategoryId: '10'
        });

        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
        if (!response.ok) throw new Error(`API request failed: ${response.status}`);
        return response.json();
    }

    // Search Results Display
    displaySearchResults(items) {
        this.searchResults.innerHTML = '';
        this.searchResults.style.display = items.length ? 'block' : 'none';

        items.forEach(item => {
            const thumbUrl = item.snippet.thumbnails?.default?.url || 'default-thumbnail.png';
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
                <div class="result-thumb">
                    <img src="${thumbUrl}" alt="${this.sanitizeHTML(item.snippet.title)}">
                </div>
                <div class="result-info">
                    <div class="result-title">${this.sanitizeHTML(item.snippet.title)}</div>
                    <div class="result-artist">${this.sanitizeHTML(item.snippet.channelTitle)}</div>
                </div>
            `;
            div.addEventListener('click', () => this.playSong(item));
            this.searchResults.appendChild(div);
        });
    }

    // Error Display
    showError(message) {
        alert(message); // Replace with better UI handling if required.
    }

    // Sanitize HTML
    sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    // Additional Methods...
}
