class YouTunesPlayer {
    constructor() {
        this.CONFIG = {
            API_KEY: 'AIzaSyDYc-tKO_7tzQUjtBN_2rB6UCQ5hr_oVwI',
            SEARCH_DELAY: 500,
            MAX_HISTORY: 10,
            DEFAULT_VOLUME: 80,
            PLAYER_INIT_TIMEOUT: 10000,
            DEFAULT_THUMBNAIL: '/images/default-thumbnail.jpg' // Make sure this path exists
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

        this.initializeElements();
        this.setupEventListeners();
        this.initializePlayer();
    }

    initializeElements() {
        // UI Elements
        this.searchInput = document.querySelector('.search');
        this.searchResults = document.querySelector('#search-results');
        this.menuBtn = document.querySelector('.menu-btn');
        this.menuItems = document.querySelector('.menu-items');
        this.currentSongElement = document.querySelector('#current-song');
        this.currentArtistElement = document.querySelector('#current-artist');
        this.playPauseBtn = document.querySelector('#play-pause-btn');
        this.prevBtn = document.querySelector('#prev-btn');
        this.nextBtn = document.querySelector('#next-btn');
        this.shuffleBtn = document.querySelector('#shuffle-btn');
        this.repeatBtn = document.querySelector('#repeat-btn');
        this.volumeSlider = document.querySelector('#volume-slider');
        this.progressBar = document.querySelector('#progress');
        this.currentTimeElement = document.querySelector('#current-time');
        this.durationElement = document.querySelector('#duration');
        this.historyContainer = document.querySelector('#history-container');
        this.thumbnail = document.querySelector('#song-thumbnail');
    }

    async initializePlayer() {
        try {
            this.playerInitPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('YouTube player initialization timed out'));
                }, this.CONFIG.PLAYER_INIT_TIMEOUT);

                if (!window.YT) {
                    const tag = document.createElement('script');
                    tag.src = 'https://www.youtube.com/iframe_api';
                    const firstScriptTag = document.getElementsByTagName('script')[0];
                    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                }

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
                            onReady: () => {
                                clearTimeout(timeout);
                                this.onPlayerReady();
                                resolve();
                            },
                            onError: (error) => {
                                clearTimeout(timeout);
                                reject(error);
                            },
                            onStateChange: (event) => this.onPlayerStateChange(event)
                        }
                    });
                };
            });

            await this.playerInitPromise;
        } catch (error) {
            console.error('Failed to initialize YouTube player:', error);
            this.showError('Failed to initialize player. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Menu button event
        this.menuBtn?.addEventListener('click', () => {
            this.menuItems?.classList.toggle('show');
        });

        // Search input event
        this.searchInput?.addEventListener('input', this.debounce(
            () => this.handleSearch(),
            this.CONFIG.SEARCH_DELAY
        ));

        // Player control events
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
    }

    onPlayerReady() {
        this.isPlayerReady = true;
        this.setVolume(this.CONFIG.DEFAULT_VOLUME);
        this.startProgressTracker();
    }

    onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.ENDED) {
            if (this.isRepeat) {
                this.player.seekTo(0);
                this.player.playVideo();
            } else {
                this.playNext();
            }
        }
        this.updatePlayPauseButton(event.data);
    }

    async handleSearch() {
        const query = this.searchInput.value.trim();
        if (query.length < 2) {
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
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&key=${this.CONFIG.API_KEY}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`YouTube API request failed: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }

    displaySearchResults(items) {
        this.searchResults.innerHTML = '';
        this.searchResults.style.display = items.length ? 'block' : 'none';

        items.forEach(item => {
            const thumbnailUrl = item.snippet.thumbnails?.medium?.url || 
                               item.snippet.thumbnails?.default?.url ||
                               this.CONFIG.DEFAULT_THUMBNAIL;
            
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
                <img src="${thumbnailUrl}" 
                     alt="Thumbnail" 
                     class="search-result-thumbnail"
                     onerror="this.src='${this.CONFIG.DEFAULT_THUMBNAIL}'">
                <div class="search-result-info">
                    <div class="song-title">${this.sanitizeHTML(item.snippet.title)}</div>
                    <div class="song-channel">${this.sanitizeHTML(item.snippet.channelTitle)}</div>
                </div>
            `;

            div.addEventListener('click', async () => {
                try {
                    await this.playSong(item);
                    this.searchResults.style.display = 'none';
                    this.searchInput.value = '';
                } catch (error) {
                    console.error('Error playing song:', error);
                    this.showError('Failed to play the selected song. Please try again.');
                }
            });

            this.searchResults.appendChild(div);
        });
    }

    async playSong(songData) {
        try {
            if (!this.isPlayerReady) {
                await this.playerInitPromise;
            }

            this.currentVideoId = songData.id.videoId;
            this.player.loadVideoById(this.currentVideoId);
            this.updateSongInfo(songData.snippet);
            this.addToHistory(songData);
            this.playlist.push(songData);
            this.currentIndex = this.playlist.length - 1;
        } catch (error) {
            console.error('Error playing song:', error);
            throw error;
        }
    }

    updateSongInfo(songData) {
        if (this.currentSongElement) {
            this.currentSongElement.textContent = songData.title;
        }
        if (this.currentArtistElement) {
            this.currentArtistElement.textContent = songData.channelTitle;
        }
        
        const thumbnailUrl = songData.thumbnails?.high?.url || 
                            songData.thumbnails?.medium?.url || 
                            songData.thumbnails?.default?.url ||
                            this.CONFIG.DEFAULT_THUMBNAIL;
        
        if (this.thumbnail) {
            this.thumbnail.src = thumbnailUrl;
            this.thumbnail.onerror = () => {
                this.thumbnail.src = this.CONFIG.DEFAULT_THUMBNAIL;
            };
        }
    }

    togglePlayPause() {
        if (this.player && this.currentVideoId) {
            if (this.player.getPlayerState() === YT.PlayerState.PLAYING) {
                this.player.pauseVideo();
            } else {
                this.player.playVideo();
            }
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
        if (this.playlist.length > 0 && this.currentIndex < this.playlist.length - 1) {
            this.currentIndex++;
            this.playSong(this.playlist[this.currentIndex]);
        }
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        this.shuffleBtn?.classList.toggle('active');
        if (this.isShuffle && this.playlist.length > 0) {
            this.playlist = this.shuffleArray([...this.playlist]);
            this.currentIndex = this.playlist.findIndex(song => song.id.videoId === this.currentVideoId);
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
                const progress = (currentTime / duration) * 100;

                if (this.progressBar) {
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

    addToHistory(songData) {
        if (!this.historyContainer) return;

        const thumbnailUrl = songData.snippet.thumbnails?.medium?.url || 
                           songData.snippet.thumbnails?.default?.url ||
                           this.CONFIG.DEFAULT_THUMBNAIL;
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <img src="${thumbnailUrl}" 
                 alt="Song thumbnail" 
                 class="history-thumbnail"
                 onerror="this.src='${this.CONFIG.DEFAULT_THUMBNAIL}'">
            <div class="history-info">
                <h2>${this.sanitizeHTML(songData.snippet.title)}</h2>
                <p>${this.sanitizeHTML(songData.snippet.channelTitle)}</p>
            </div>
        `;

        historyItem.addEventListener('click', () => this.playSong(songData));
        
        this.historyContainer.insertBefore(historyItem, this.historyContainer.firstChild);
        
        while (this.historyContainer.children.length > this.CONFIG.MAX_HISTORY) {
            this.historyContainer.removeChild(this.historyContainer.lastChild);
        }
    }

    // Utility functions
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
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

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Initialize the player when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new YouTunesPlayer();
});
