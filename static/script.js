let player;
let currentPlaylist = [];
let currentPlayingIndex = 0;
let playlist = JSON.parse(localStorage.getItem('playlist')) || [];
let playerViewVisible = false;
let youtubeIframeAPIReady = false;
let playerReady = false;

document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-query');
    const searchResultsDiv = document.getElementById('search-results');
    const chartSectionDiv = document.querySelector('#chart-section .grid-container');
    const playlistItemsDiv = document.getElementById('playlist-items');
    const playerView = document.getElementById('player-view');
    const mainView = document.querySelector('main');
    const playerThumbnail = document.getElementById('player-thumbnail');
    const playerTitle = document.getElementById('player-title');
    const playerArtist = document.getElementById('player-artist');
    const backToMainBtn = document.getElementById('back-to-main-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const youtubePlayerDiv = document.getElementById('youtube-player');
    const playerControls = document.querySelector('.player-controls');

    // YouTube API 스크립트 동적 로드
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);

    // API 로드 완료 시 콜백
    window.onYouTubeIframeAPIReady = () => {
        youtubeIframeAPIReady = true;
        console.log("YouTube IFrame API is ready.");
    };

   function createPlayer(videoId) {
    if (player) {
        player.destroy();
        playerReady = false;
        if (playerControls) playerControls.classList.remove('ready');
    }

    console.log("CREATE PLAYER - Attempting to create player with videoId:", videoId);

    player = new YT.Player('youtube-player', {
        height: '360',
        width: '840',
        videoId: videoId,
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'playsinline': 1
        },
        events: {
  'onReady': (event) => {
    console.log("Player is ready for video:", videoId);
    playerReady = false; // 재생 전 초기화
    event.target.playVideo();

    // 재생 시작 안 되면 5초 후 경고 표시 (선택사항)
    setTimeout(() => {
      if (!playerReady) {
        alert("이 영상은 재생할 수 없습니다.");
      }
    }, 5000);
  },
  'onStateChange': (event) => {
    console.log("Player state:", event.data);
    if (event.data === YT.PlayerState.PLAYING) {
      playerReady = true;
    } else if (event.data === YT.PlayerState.ENDED) {
      playerReady = false;
      playNext();
    } else if (event.data === YT.PlayerState.PAUSED) {
      playerReady = true; // 일시정지 상태도 플레이어 준비됨으로 간주
    } else if (event.data === YT.PlayerState.UNSTARTED) {
      playerReady = false;
    }
    updatePlayPauseButton();
  }
}

    });
}

    function updatePlayPauseButton() {
        if (player && typeof player.getPlayerState === 'function') {
            const state = player.getPlayerState();
            if (state === YT.PlayerState.PLAYING) {
                playPauseBtn.textContent = '⏸️';
            } else {
                playPauseBtn.textContent = '▶️';
            }
        } else {
            playPauseBtn.textContent = '▶️'; // 초기 상태
        }
    }

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;
        searchResultsDiv.innerHTML = '<div class="loader"></div>';
        const response = await fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `query=${encodeURIComponent(query)}`,
        });
        const results = await response.json();
        searchResultsDiv.innerHTML = '';
        if (results.error) {
            searchResultsDiv.innerHTML = `<p class="error-message">${results.error}</p>`;
            return;
        }
        displaySearchResults(results);
    });

    function displaySearchResults(results) {
        searchResultsDiv.innerHTML = '';
        results.forEach((video, index) => {
            const musicItem = document.createElement('div');
            musicItem.className = 'music-item';
            musicItem.dataset.video = JSON.stringify(video);
            musicItem.innerHTML = `
                    <img src="${video.thumbnail}" alt="썸네일">
                    <div class="result-item-info">
                        <h3>${video.title}</h3>
                        <p>${video.channel_title}</p>
                    </div>
                    <button class="add-to-playlist-btn">➕</button>
                `;
            musicItem.addEventListener('click', () => playSong(video));
            const addToPlaylistButton = musicItem.querySelector('.add-to-playlist-btn');
            addToPlaylistButton.addEventListener('click', (event) => {
                event.stopPropagation();
                addToPlaylist(video);
            });
            searchResultsDiv.appendChild(musicItem);
        });
    }

    function displayPlaylist() {
        playlistItemsDiv.innerHTML = '';
        playlist.forEach((video, index) => {
            const musicItem = document.createElement('div');
            musicItem.className = 'music-item';
            musicItem.dataset.video = JSON.stringify(video);
            musicItem.innerHTML = `
                    <img src="${video.thumbnail}" alt="썸네일">
                    <div class="item-details">
                        <h3>${video.title}</h3>
                        <p>${video.channel_title}</p>
                    </div>
                    <button class="remove-from-playlist-btn" data-index="${index}">🗑️</button>
                `;
            musicItem.addEventListener('click', () => playSongFromPlaylist(index));
            const removeButton = musicItem.querySelector('.remove-from-playlist-btn');
            removeButton.addEventListener('click', (event) => {
                event.stopPropagation();
                removeFromPlaylist(index);
            });
            playlistItemsDiv.appendChild(musicItem);
        });
    }

    function addToPlaylist(video) {
        if (!playlist.find(item => item.video_id === video.video_id)) {
            playlist.push(video);
            localStorage.setItem('playlist', JSON.stringify(playlist));
            displayPlaylist();
            alert(`${video.title}이(가) 플레이리스트에 추가되었습니다.`);
        } else {
            alert(`${video.title}은(는) 이미 플레이리스트에 있습니다.`);
        }
    }

    function removeFromPlaylist(index) {
        playlist.splice(index, 1);
        localStorage.setItem('playlist', JSON.stringify(playlist));
        displayPlaylist();
    }

    window.loadTopCharts = async () => {
        const response = await fetch('/top-charts');
        const charts = await response.json();
        chartSectionDiv.innerHTML = ''; // 기존 아이템 제거
        charts.forEach((video) => {
            const musicItem = document.createElement('div');
            musicItem.className = 'music-item';
            musicItem.dataset.video = JSON.stringify(video);
            musicItem.innerHTML = `
                    <img src="${video.thumbnail}" alt="썸네일">
                    <div class="item-details">
                        <h3>${video.title}</h3>
                        <p>${video.channel_title}</p>
                    </div>
                    <button class="add-to-playlist-btn">➕</button>
                `;
            musicItem.addEventListener('click', () => {
                console.log("Clicked chart item, video object:", video);
                playSong(video);
            });
            const addToPlaylistButton = musicItem.querySelector('.add-to-playlist-btn');
            addToPlaylistButton.addEventListener('click', (event) => {
                event.stopPropagation();
                addToPlaylist(video);
            });
            chartSectionDiv.appendChild(musicItem);
        });
    };

    function playSong(video) {
        currentPlaylist = [video];
        currentPlayingIndex = 0;
        updatePlayerView(video);
        playerView.style.display = 'flex';

        console.log("PLAY SONG - Player ready state:", playerReady);
        console.log("PLAY SONG - Player object:", player);

        if (window.YT && YT.Player) {
            // 플레이어 존재하면 파괴하고 새로 생성
            playerReady = false;
            if (playerControls) playerControls.classList.remove('ready');
            createPlayer(video.video_id);
        } else {
            window.onYouTubeIframeAPIReady = () => {
                playerReady = false;
                if (playerControls) playerControls.classList.remove('ready');
                createPlayer(video.video_id);
            };
        }
    }

    function playSongFromPlaylist(index) {
        currentPlaylist = playlist;
        currentPlayingIndex = index;
        const video = currentPlaylist[currentPlayingIndex];
        updatePlayerView(video);
        playerView.style.display = 'flex';
        playerReady = false;
        if (playerControls) {
            playerControls.classList.remove('ready');
        }

        if (window.YT && YT.Player) {
            createPlayer(video.video_id);
        } else {
            window.onYouTubeIframeAPIReady = () => {
                createPlayer(video.video_id);
            };
        }
    }

    function updatePlayerView(video) {
        playerThumbnail.src = video.thumbnail;
        playerTitle.textContent = video.title;
        playerArtist.textContent = video.channel_title;
    }

    function playNext() {
        if (currentPlaylist.length > 0 && currentPlayingIndex < currentPlaylist.length - 1) {
            playSong(currentPlaylist[++currentPlayingIndex]);
        } else {
            alert('재생할 다음 곡이 없습니다.');
            playPauseBtn.textContent = '▶️';
        }
    }

    function playPrevious() {
        if (currentPlaylist.length > 0 && currentPlayingIndex > 0) {
            playSong(currentPlaylist[--currentPlayingIndex]);
        } else {
            alert('이전 곡이 없습니다.');
        }
    }

    backToMainBtn.addEventListener('click', () => {
        if (player) player.stopVideo();
        mainView.style.display = 'block';
        playerView.style.display = 'none';
        playerViewVisible = false;
    });

    // 🎵 플레이어 제어 버튼 연결
    playPauseBtn.addEventListener('click', () => {
        if (player && typeof player.getPlayerState === 'function' && playerReady) {
            const state = player.getPlayerState();
            if (state === YT.PlayerState.PLAYING) {
                player.pauseVideo();
            } else {
                player.playVideo();
            }
            updatePlayPauseButton();
        } else {
            console.log("Player is not ready yet or player object is not available.");
        }
    });

    nextBtn.addEventListener('click', () => {
        console.log("Next Button Clicked");
        playNext();
    });

    prevBtn.addEventListener('click', () => {
        console.log("Previous Button Clicked");
        playPrevious();
    });

    loadTopCharts();
    displayPlaylist();
});