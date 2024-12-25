const CONFIG = {
    API_KEY: 'AIzaSyDYc-tKO_7tzQUjtBN_2rB6UCQ5hr_oVwI',
    SEARCH_DELAY: 500,
    MAX_HISTORY: 10,
};

class App {
    constructor() {
        this.searchInput = document.querySelector('.search');
        this.menuBtn = document.querySelector('.menu-btn');
        this.menuItems = document.querySelector('.menu-items');
        this.currentSong = document.querySelector('#current-song');
        this.youtubePlayer = null;

        this.init();
    }

    init() {
        this.menuBtn.addEventListener('click', () => {
            this.menuItems.classList.toggle('show');
        });

        this.searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), CONFIG.SEARCH_DELAY));

        this.initializeYouTubePlayer();
    }

    initializeYouTubePlayer() {
        window.onYouTubeIframeAPIReady = () => {
            this.youtubePlayer = new YT.Player('youtube-player', {
                height: '360',
                width: '640',
                events: {
                    onReady: () => console.log('YouTube Player Ready'),
                    onStateChange: this.onPlayerStateChange.bind(this),
                },
            });
        };
    }

    onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.ENDED) {
            console.log('Song ended. Play the next one if needed.');
        }
    }

    handleSearch(event) {
        const query = event.target.value.trim();
        if (query.length < 2) return;

        console.log(`Searching for: ${query}`);
        this.searchYouTube(query);
    }

    searchYouTube(query) {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&key=${CONFIG.API_KEY}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                const results = data.items;
                if (results.length > 0) {
                    const videoId = results[0].id.videoId;
                    this.playVideo(videoId, results[0].snippet.title);
                } else {
                    console.error('No results found.');
                }
            })
            .catch(error => console.error('Error fetching YouTube data:', error));
    }

    playVideo(videoId, title) {
        if (this.youtubePlayer) {
            this.youtubePlayer.loadVideoById(videoId);
            this.currentSong.textContent = title;
        } else {
            console.error('YouTube player is not ready.');
        }
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
}

document.addEventListener('DOMContentLoaded', () => new App());
