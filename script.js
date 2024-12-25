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

        this.initializeElements();
        this.setupEventListeners();
        this.loadYouTubeAPI();
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
    }

    setupEventListeners() {
        this.menuBtn.addEventListener('click', () => {
            this.menuItems.classList.toggle('show');
        });

        this.searchInput.addEventListener('input', this.debounce(
            () => this.handleSearch(),
            this.CONFIG.SEARCH_DELAY
        ));

        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.playPrevious());
        this.nextBtn.addEventListener('click', () => this.playNext());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav')) {
                this.menuItems.classList.remove('show');
            }
        });
    }

    loadYouTubeAPI() {
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
        this.setVolume(this.CONFIG.DEFAULT_VOLUME);
        this.updateProgressBar();
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
            this.displaySearchResults(response.items);
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed. Please try again.');
        }
    }

    async searchYouTube(query) {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&key=${this.CONFIG.API_KEY}`;
        
        try {
            console.log('Fetching from URL:', url); // Add this for debugging
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData); // Add this for debugging
                throw new Error(`YouTube API request failed: ${response.status}`);
            }
            
            return response.json();
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed. Please try again.');
            return { items: [] }; // Return empty results on error
        }
    }

    displaySearchResults(items) {
        this.searchResults.innerHTML = '';
        this.searchResults.style.display = 'block';
    
        items.forEach(item => {
            const thumbnailUrl = item.snippet.thumbnails?.medium?.url || 
                               item.snippet.thumbnails?.default?.url;
            
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
                <img src="${thumbnailUrl}" alt="Thumbnail" class="search-result-thumbnail">
                <div class="search-result-info">
                    <div class="song-title">${item.snippet.title}</div>
                    <div class="song-channel">${item.snippet.channelTitle}</div>
                </div>
            `;
            div.addEventListener('click', () => {
                this.playSong(item);
                this.searchResults.style.display = 'none';
                this.searchInput.value = '';
            });
            this.searchResults.appendChild(div);
        });
    }

    playSong(songData) {
        this.currentVideoId = songData.id.videoId;
        this.player.loadVideoById(this.currentVideoId);
        this.updateSongInfo(songData.snippet);
        this.addToHistory(songData);
    }

    updateSongInfo(songData) {
        this.currentSongElement.textContent = songData.title;
        this.currentArtistElement.textContent = songData.channelTitle;
        
        // Update thumbnail
        const thumbnailUrl = songData.thumbnails?.high?.url || 
                            songData.thumbnails?.medium?.url || 
                            songData.thumbnails?.default?.url;
        
        if (thumbnailUrl) {
            document.querySelector('#song-thumbnail').src = thumbnailUrl;
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
        const icon = this.playPauseBtn.querySelector('i');
        icon.className = playerState === YT.PlayerState.PLAYING ? 
            'fas fa-pause' : 'fas fa-play';
    }

    playPrevious() {
        if (this.playlist.length > 0) {
            this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
            this.playSong(this.playlist[this.currentIndex]);
        }
    }

    playNext() {
        if (this.playlist.length > 0) {
            this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
            this.playSong(this.playlist[this.currentIndex]);
        }
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        this.shuffleBtn.classList.toggle('active');
        if (this.isShuffle) {
            this.playlist = this.shuffleArray([...this.playlist]);
        }
    }

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        this.repeatBtn.classList.toggle('active');
    }

    setVolume(value) {
        if (this.player) {
            this.player.setVolume(value);
            this.volumeSlider.value = value;
        }
    }

    updateProgressBar() {
        if (this.player && this.player.getCurrentTime) {
            const currentTime = this.player.getCurrentTime();
            const duration = this.player.getDuration();
            const progress = (currentTime / duration) * 100;
            
            this.progressBar.style.width = `${progress}%`;
            this.currentTimeElement.textContent = this.formatTime(currentTime);
            this.durationElement.textContent = this.formatTime(duration);
        }
        requestAnimationFrame(() => this.updateProgressBar());
    }

    addToHistory(songData) {
        const thumbnailUrl = songData.snippet.thumbnails?.medium?.url || 
                            songData.snippet.thumbnails?.default?.url;
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <img src="${thumbnailUrl}" alt="Song thumbnail" class="history-thumbnail">
            <div class="history-info">
                <h2>${songData.snippet.title}</h2>
                <p>${songData.snippet.channelTitle}</p>
            </div>
        `;
        historyItem.addEventListener('click', () => this.playSong(songData));
        
        this.historyContainer.insertBefore(historyItem, this.historyContainer.firstChild);
        if (this.historyContainer.children.length > this.CONFIG.MAX_HISTORY) {
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
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    showError(message) {
        // Implement error notification system
        console.error(message);
    }
}

// Initialize the player when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new YouTunesPlayer();
});
