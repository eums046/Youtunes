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

        this.initializeElements();
        this.setupEventListeners();
        // Note: YouTube IFrame API is already loaded in HTML
        this.createYouTubePlayer();
    }

    initializeElements() {
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
        this.progressContainer = document.querySelector('.progress-container');
        this.currentTimeElement = document.getElementById('current-time');
        this.durationElement = document.getElementById('duration');
        
        // History container
        this.historyContainer = document.getElementById('history-container');

        // Global buttons
        this.shuffleGlobalBtn = document.querySelector('.shuffle');
        this.trendingBtn = document.querySelector('.trending');
    }

    setupEventListeners() {
        // Menu toggle
        this.menuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.menuItems?.classList.toggle('show');
        });

        // Search functionality
        this.searchInput?.addEventListener('input', (e) => {
            clearTimeout(this._searchTimeout);
            this._searchTimeout = setTimeout(() => {
                this.handleSearch(e.target.value);
            }, this.CONFIG.SEARCH_DELAY);
        });

        // Progress bar click handling
        this.progressContainer?.addEventListener('click', (e) => {
            const rect = this.progressContainer.getBoundingClientRect();
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

        // Global buttons
        this.shuffleGlobalBtn?.addEventListener('click', () => this.loadRandomTracks());
        this.trendingBtn?.addEventListener('click', () => this.loadTrendingTracks());

        // Close menu when clicking outside
        document.addEventListener('click', () => {
            this.menuItems?.classList.remove('show');
            this.searchResults?.classList.remove('show');
        });

        // Prevent menu close when clicking inside
        this.menuItems?.addEventListener('click', (e) => e.stopPropagation());
        this.searchResults?.addEventListener('click', (e) => e.stopPropagation());
    }

    createYouTubePlayer() {
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

    async handleSearch(query) {
        if (!query || query.length < 2) {
            this.searchResults.style.display = 'none';
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
        if (!response.ok) {
            throw new Error(`YouTube API request failed: ${response.status}`);
        }
        return await response.json();
    }

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

    async playSong(songData) {
        if (!this.isPlayerReady) return;

        try {
            this.currentVideoId = songData.id.videoId;
            await this.player.loadVideoById(this.currentVideoId);
            
            this.updateSongInfo(songData.snippet);
            this.addToHistory(songData);
            
            if (!this.playlist.some(item => item.id.videoId === songData.id.videoId)) {
                this.playlist.push(songData);
                this.currentIndex = this.playlist.length - 1;
            }
            
            this.updatePlayPauseButton(YT.PlayerState.PLAYING);
        } catch (error) {
            console.error('Error playing song:', error);
            this.showError('Failed to play the selected song');
        }
    }

    updateSongInfo(snippet) {
        if (this.currentSongElement) {
            this.currentSongElement.textContent = snippet.title;
        }
        if (this.currentArtistElement) {
            this.currentArtistElement.textContent = snippet.channelTitle;
        }
        if (this.thumbnail) {
            this.thumbnail.src = snippet.thumbnails?.high?.url || 
                               snippet.thumbnails?.medium?.url || 
                               snippet.thumbnails?.default?.url || 
                               'default-thumbnail.png';
        }
    }

    addToHistory(songData) {
        if (!this.historyContainer) return;

        const thumbUrl = songData.snippet.thumbnails?.default?.url || 'default-thumbnail.png';
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-thumb">
                <img src="${thumbUrl}" alt="${this.sanitizeHTML(songData.snippet.title)}">
            </div>
            <div class="history-info">
                <div class="history-title">${this.sanitizeHTML(songData.snippet.title)}</div>
                <div class="history-artist">${this.sanitizeHTML(songData.snippet.channelTitle)}</div>
            </div>
        `;

        historyItem.addEventListener('click', () => this.playSong(songData));
        
        this.historyContainer.insertBefore(historyItem, this.historyContainer.firstChild);
        
        while (this.historyContainer.children.length > this.CONFIG.MAX_HISTORY) {
            this.historyContainer.removeChild(this.historyContainer.lastChild);
        }
    }

    onPlayerReady() {
        this.isPlayerReady = true;
        this.setVolume(this.CONFIG.DEFAULT_VOLUME);
        this.startProgressTracker();
    }

    onPlayerStateChange(event) {
        this.updatePlayPauseButton(event.data);
        
        if (event.data === YT.PlayerState.ENDED) {
            if (this.isRepeat) {
                this.player.seekTo(0);
                this.player.playVideo();
            } else {
                this.playNext();
            }
        }
    }

    onPlayerError(error) {
        console.error('YouTube player error:', error);
        this.showError('Failed to play the video');
        this.playNext();
    }

    togglePlayPause() {
        if (!this.player || !this.isPlayerReady || !this.currentVideoId) return;

        if (this.player.getPlayerState() === YT.PlayerState.PLAYING) {
            this.player.pauseVideo();
        } else {
            this.player.playVideo();
        }
    }

    updatePlayPauseButton(playerState) {
        const icon = this.playPauseBtn?.querySelector('i');
        if (icon) {
            icon.className = playerState === YT.PlayerState.PLAYING ? 
                'fas fa-pause' : 'fas fa-play';
        }
    }

    playPrevious() {
        if (this.playlist.length > 0 && this.currentIndex > 0) {
            this.currentIndex--;
            this.playSong(this.playlist[this.currentIndex]);
        }
    }

    playNext() {
        if (this.playlist.length > 0) {
            if (this.currentIndex < this.playlist.length - 1) {
                this.currentIndex++;
                this.playSong(this.playlist[this.currentIndex]);
            } else if (this.isRepeat) {
                this.currentIndex = 0;
                this.playSong(this.playlist[this.currentIndex]);
            }
        }
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        this.shuffleBtn?.classList.toggle('active');
        if (this.isShuffle && this.playlist.length > 0) {
            const currentSong = this.playlist[this.currentIndex];
            this.playlist = this.shuffleArray([...this.playlist]);
            this.currentIndex = this.playlist.findIndex(song => 
                song.id.videoId === currentSong.id.videoId
            );
        }
    }

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        this.repeatBtn?.classList.toggle('active');
    }

    setVolume(value) {
        if (this.player && this.isPlayerReady) {
            this.player.setVolume(value);
            if (this.volumeSlider) {
                this.volumeSlider.value = value;
            }
        }
    }

    startProgressTracker() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }

        this.progressInterval = setInterval(() => {
            if (this.player && this.isPlayerReady) {
                const currentTime = this.player.getCurrentTime() || 0;
                const duration = this.player.getDuration() || 0;
                
                if (this.progressBar) {
                    const progress = (currentTime / duration) * 100;
                    this.progressBar.style.width = `${progress}%`;
                }
                
                if (this.currentTimeElement) {
                    this.currentTimeElement.textContent = this.formatTime(currentTime);
                }
                
                if (this.durationElement) {
                    this.durationElement.textContent = this.formatTime(duration);
                }
            }
        }, 1000);
    }

    async loadTrendingTracks() {
        try {
            const response = await this.searchYouTube('trending music');
            if (response.items?.length > 0) {
                this.playlist = response.items;
                this.currentIndex = 0;
                await this.playSong(this.playlist[0]);
            }
        } catch (error) {
            console.error('Error loading trending tracks:', error);
            this.showError('Failed to load trending tracks');
        }
    }

    async loadRandomTracks() {
        const queries = ['pop music', 'rock music', 'trending songs', 'top hits'];
        const randomQuery = queries[Math.floor(Math.random() * queries.length)];
        
        try {
            const response = await this.searchYouTube(randomQuery);
            if (response.items?.length > 0) {
                this.playlist = this.shuffleArray(response.items);
                this.currentIndex = 0;
                await this.playSong(this.playlist[0]);
            }
        } catch (error) {
            console.error('Error loading random tracks:', error);
            this.showError('Failed to load random tracks');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
