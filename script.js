// The Movie Database (TMDb) API Key
const apiKey = "1b64fc34b21d69f6b5469f62bf975c09";

// --- DOM Elements ---
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-btn');
const homeButton = document.getElementById('home-btn');
const movieListContainer = document.getElementById('movie-list');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const pageInfo = document.getElementById('page-info');
const noResultsMessage = document.getElementById('no-results-message');
const errorMessage = document.getElementById('error-message');
const loader = document.getElementById('loader');
const currentYearSpan = document.getElementById('current-year');
const backToHomeButton = document.getElementById('back-to-home-button');

// Movie details elements (for movieCard.html)
const backToSearchButton = document.getElementById('back-to-search-button');
const movieDetails = document.getElementById('movie-details');
const moviePoster = document.getElementById('movie-poster');
const movieTitle = document.getElementById('movie-title');
const movieYear = document.getElementById('movie-year');
const movieDescription = document.getElementById('movie-description');

// --- Page state ---
let currentPage = 1;
let currentSearch = '';
let totalPages = 0;
let selectedGenre = '';
let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];

// --- Constants ---
const GENRES = [
    { id: 28, name: "Action" },
    { id: 12, name: "Adventure" },
    { id: 16, name: "Animation" },
    { id: 35, name: "Comedy" },
    { id: 80, name: "Crime" },
    { id: 18, name: "Drama" },
    { id: 10751, name: "Family" },
    { id: 14, name: "Fantasy" },
    { id: 36, name: "History" },
    { id: 27, name: "Horror" },
    { id: 10402, name: "Music" },
    { id: 9648, name: "Mystery" },
    { id: 10749, name: "Romance" },
    { id: 878, name: "Science Fiction" },
    { id: 10770, name: "TV Movie" },
    { id: 53, name: "Thriller" },
    { id: 10752, name: "War" },
    { id: 37, name: "Western" }
];

// --- Initialize UI Elements ---
function initializeUI() {
    // Set current year in footer
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Add search icon to input
    if (searchInput) {
        const searchIcon = document.createElement('i');
        searchIcon.className = 'fas fa-search';
        searchInput.parentNode.appendChild(searchIcon);

        // Add keyboard shortcut hint
        const keyboardShortcut = document.createElement('span');
        keyboardShortcut.className = 'keyboard-shortcut';
        keyboardShortcut.textContent = '/';
        searchInput.parentNode.appendChild(keyboardShortcut);
    }

    // Create genre filter bar if we're on the index page
    if (movieListContainer && !document.querySelector('.filter-bar')) {
        createGenreFilterBar();
    }

    // Create toast container
    if (!document.querySelector('.toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Set up scroll listener for header
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (header) {
            if (window.scrollY > 10) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
    });
}

// --- Create Genre Filter Bar ---
function createGenreFilterBar() {
    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';
    
    // Add "All" option
    const allButton = document.createElement('button');
    allButton.className = 'filter-button active';
    allButton.dataset.genreId = '';
    allButton.textContent = 'All';
    filterBar.appendChild(allButton);
    
    // Add top 10 popular genres
    const popularGenres = [28, 12, 16, 35, 18, 14, 27, 10749, 878, 53];
    popularGenres.forEach(genreId => {
        const genre = GENRES.find(g => g.id === genreId);
        if (genre) {
            const button = document.createElement('button');
            button.className = 'filter-button';
            button.dataset.genreId = genre.id;
            button.textContent = genre.name;
            filterBar.appendChild(button);
        }
    });
    
    // Add event listeners
    filterBar.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-button')) {
            // Remove active class from all buttons
            document.querySelectorAll('.filter-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            e.target.classList.add('active');
            
            // Set selected genre and fetch movies
            selectedGenre = e.target.dataset.genreId;
            currentPage = 1;
            
            // Update the URL to reflect the filter
            const url = new URL(window.location);
            if (selectedGenre) {
                url.searchParams.set('genre', selectedGenre);
            } else {
                url.searchParams.delete('genre');
            }
            window.history.replaceState({}, '', url);
            
            fetchAndDisplayMovies();
        }
    });
    
    // Insert before movie list
    const main = document.querySelector('main');
    if (main && movieListContainer) {
        main.insertBefore(filterBar, movieListContainer.previousElementSibling);
    }
    
    // Check if genre is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlGenre = urlParams.get('genre');
    if (urlGenre) {
        selectedGenre = urlGenre;
        const genreButton = document.querySelector(`.filter-button[data-genre-id="${urlGenre}"]`);
        if (genreButton) {
            document.querySelectorAll('.filter-button').forEach(btn => {
                btn.classList.remove('active');
            });
            genreButton.classList.add('active');
        }
    }
}

// --- Create Pagination Numbers ---
function createPaginationNumbers() {
    // Remove existing page numbers
    const existingNumbers = document.querySelector('.page-numbers');
    if (existingNumbers) {
        existingNumbers.remove();
    }
    
    if (!totalPages || totalPages <= 1) return;
    
    const pageNumbers = document.createElement('div');
    pageNumbers.className = 'page-numbers';
    
    // Calculate range to show
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    
    // Adjust start if end is maxed out
    if (end === totalPages) {
        start = Math.max(1, totalPages - 4);
    }
    
    // Add first page if not included in range
    if (start > 1) {
        const firstPageBtn = document.createElement('button');
        firstPageBtn.textContent = '1';
        firstPageBtn.addEventListener('click', () => goToPage(1));
        pageNumbers.appendChild(firstPageBtn);
        
        if (start > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'page-ellipsis';
            pageNumbers.appendChild(ellipsis);
        }
    }
    
    // Add page numbers in range
    for (let i = start; i <= end; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        if (i === currentPage) {
            pageBtn.classList.add('active');
        }
        pageBtn.addEventListener('click', () => goToPage(i));
        pageNumbers.appendChild(pageBtn);
    }
    
    // Add last page if not included in range
    if (end < totalPages) {
        if (end < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'page-ellipsis';
            pageNumbers.appendChild(ellipsis);
        }
        
        const lastPageBtn = document.createElement('button');
        lastPageBtn.textContent = totalPages;
        lastPageBtn.addEventListener('click', () => goToPage(totalPages));
        pageNumbers.appendChild(lastPageBtn);
    }
    
    // Add to pagination container
    const pagination = document.querySelector('.pagination');
    if (pagination) {
        pagination.insertBefore(pageNumbers, pageInfo.nextElementSibling);
    }
}

// --- Go to specific page ---
function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    currentPage = page;
    updateURL();
    fetchAndDisplayMovies();
}

// --- Update URL with current state ---
function updateURL() {
    const url = new URL(window.location);
    
    // Add query if searching
    if (currentSearch) {
        url.searchParams.set('query', currentSearch);
    } else {
        url.searchParams.delete('query');
    }
    
    // Add page if not page 1
    if (currentPage > 1) {
        url.searchParams.set('page', currentPage);
    } else {
        url.searchParams.delete('page');
    }
    
    // Add genre if filtering
    if (selectedGenre) {
        url.searchParams.set('genre', selectedGenre);
    } else {
        url.searchParams.delete('genre');
    }
    
    window.history.replaceState({}, '', url);
}

// --- Show Toast Notification ---
function showToast(message, type = 'success') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    
    const text = document.createElement('span');
    text.textContent = message;
    
    toast.appendChild(icon);
    toast.appendChild(text);
    toastContainer.appendChild(toast);
    
    // Show the toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Hide and remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Toggle Watchlist ---
function toggleWatchlist(movieId, movieData) {
    const index = watchlist.findIndex(movie => movie.id === movieId);
    
    if (index === -1) {
        // Add to watchlist
        watchlist.push(movieData);
        showToast(`"${movieData.title}" added to watchlist`);
    } else {
        // Remove from watchlist
        watchlist.splice(index, 1);
        showToast(`"${movieData.title}" removed from watchlist`);
    }
    
    // Update localStorage
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    
    // Update UI
    updateWatchlistButtons();
}

// --- Update Watchlist Buttons ---
function updateWatchlistButtons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const movieId = parseInt(btn.dataset.movieId);
        if (watchlist.some(movie => movie.id === movieId)) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-heart"></i>';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="far fa-heart"></i>';
        }
    });
}

// --- Create Skeleton Loaders ---
function createSkeletonLoaders() {
    if (!movieListContainer) return;
    
    movieListContainer.innerHTML = '';
    
    for (let i = 0; i < 8; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-movie';
        skeleton.innerHTML = `
            <div class="skeleton skeleton-poster"></div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-year"></div>
            <div class="skeleton skeleton-description"></div>
        `;
        movieListContainer.appendChild(skeleton);
    }
}

// --- Fetch movies from API ---
async function fetchMovies(searchQuery = null, page = 1, genreId = '') {
    createSkeletonLoaders();
    
    // Show loader and hide messages
    if (loader) loader.style.display = 'none'; // We're using skeletons now
    if (noResultsMessage) noResultsMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';

    let url;
    // If no search query, get popular movies of current year
    if (!searchQuery) {
        const currentYear = new Date().getFullYear();
        url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&sort_by=popularity.desc&primary_release_year=${currentYear}&page=${page}`;
        
        // Add genre filter if specified
        if (genreId) {
            url += `&with_genres=${genreId}`;
        }
    } else {
        url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}&page=${page}`;
        
        // Add genre filter if specified
        if (genreId) {
            url += `&with_genres=${genreId}`;
        }
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        totalPages = data.total_pages;

        return data;
    } catch (error) {
        console.error('Error fetching movies:', error);
        if (errorMessage) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = `Error: ${error.message}`;
        }
        return { results: [], total_pages: 0 };
    }
}

// --- Fetch and display movies ---
async function fetchAndDisplayMovies() {
    const data = await fetchMovies(currentSearch || null, currentPage, selectedGenre);
    displayMovies(data.results);
    updatePagination();
    createPaginationNumbers();
}

// --- Display movies ---
function displayMovies(movies) {
    if (!movieListContainer) return;

    movieListContainer.innerHTML = '';

    if (movies.length === 0) {
        if (noResultsMessage) noResultsMessage.style.display = "block";
        return;
    }

    movies.forEach(movie => {
        // Create item
        const movieItem = document.createElement('div');
        movieItem.classList.add('movie-item');
        movieItem.classList.add('animate-fade-in');

        // Add click event to view details
        movieItem.addEventListener('click', (e) => {
            // Don't navigate if clicking on favorite button
            if (e.target.closest('.favorite-btn')) return;
            
            // Store the CURRENT page state
            const currentState = {
                query: currentSearch,
                page: currentPage,
                genre: selectedGenre
            };
            
            // Store movie data in localStorage
            localStorage.setItem('selectedMovie', JSON.stringify({
                id: movie.id,
                title: movie.title || 'No title available',
                poster_path: movie.poster_path || '',
                backdrop_path: movie.backdrop_path || '',
                release_date: movie.release_date || '',
                overview: movie.overview || 'No description available.',
                vote_average: movie.vote_average || 0
            }));
            
            // Store the current state
            localStorage.setItem('searchState', JSON.stringify(currentState));
            
            // Navigate to details page with history API
            navigateToDetails(movie.id);
        });

        // Add rating badge
        const rating = movie.vote_average || 0;
        const ratingElement = document.createElement('div');
        ratingElement.className = 'movie-rating';
        
        // Set rating color class
        if (rating >= 7) {
            ratingElement.classList.add('high-rating');
        } else if (rating >= 5) {
            ratingElement.classList.add('medium-rating');
        } else {
            ratingElement.classList.add('low-rating');
        }
        
        ratingElement.textContent = rating.toFixed(1);
        movieItem.appendChild(ratingElement);
        
        // Add favorite button
        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'favorite-btn';
        favoriteBtn.dataset.movieId = movie.id;
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        
        // Check if movie is in watchlist
        if (watchlist.some(m => m.id === movie.id)) {
            favoriteBtn.classList.add('active');
            favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
        }
        
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleWatchlist(movie.id, {
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                release_date: movie.release_date,
                overview: movie.overview,
                vote_average: movie.vote_average
            });
        });
        
        movieItem.appendChild(favoriteBtn);

        // Create poster
        const moviePoster = document.createElement('img');
        moviePoster.classList.add('movie-poster');

        // Handle missing poster
        if (movie.poster_path) {
            moviePoster.src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
        } else {
            moviePoster.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgdmlld0JveD0iMCAwIDUwMCA3NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iNzUwIiBmaWxsPSIjMmEyODNlIi8+Cjx0ZXh0IHg9IjI1MCIgeT0iMzc1IiBmaWxsPSIjYWFhYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
        }

        moviePoster.alt = movie.title || 'Movie poster';

        // Create info
        const movieInfo = document.createElement('div');
        movieInfo.classList.add('movie-info');

        // Create title
        const movieTitle = document.createElement('h2');
        movieTitle.classList.add('movie-title');
        movieTitle.textContent = movie.title || 'No title available';

        // Create year
        const movieYear = document.createElement('p');
        movieYear.classList.add('movie-year');
        const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown year';
        movieYear.innerHTML = `<i class="far fa-calendar-alt"></i> ${releaseYear}`;

        // Create description
        const movieDescription = document.createElement('p');
        movieDescription.classList.add('movie-description');
        movieDescription.textContent = movie.overview || 'No description available.';

        // Append elements
        movieInfo.appendChild(movieTitle);
        movieInfo.appendChild(movieYear);
        movieInfo.appendChild(movieDescription);

        // Append elements
        movieItem.appendChild(moviePoster);
        movieItem.appendChild(movieInfo);

        // Append item to movie-list
        movieListContainer.appendChild(movieItem);
    });
}

// --- Navigate to Details Page ---
function navigateToDetails(movieId) {
    // For a real SPA, we would use a router here
    // For simplicity, we're just navigating to another page
    window.location.href = `movieCard.html?id=${movieId}`;
}

// --- Fetch Movie Details ---
async function fetchMovieDetails(movieId) {
    try {
        // Show loading skeletons
        if (movieDetails) {
            movieDetails.innerHTML = `
                <div class="movie-details-loading">
                    <div class="skeleton skeleton-poster"></div>
                    <div class="skeleton-content">
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton-metadata">
                            <div class="skeleton skeleton-metadata-item"></div>
                            <div class="skeleton skeleton-metadata-item"></div>
                            <div class="skeleton skeleton-metadata-item"></div>
                        </div>
                        <div class="skeleton skeleton-description"></div>
                    </div>
                </div>
            `;
        }
        
        // Fetch movie details
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&append_to_response=credits,videos`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const movie = await response.json();
        
        // Store in localStorage
        localStorage.setItem('selectedMovie', JSON.stringify({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            backdrop_path: movie.backdrop_path,
            release_date: movie.release_date,
            overview: movie.overview,
            vote_average: movie.vote_average,
            genres: movie.genres,
            runtime: movie.runtime,
            videos: movie.videos,
            credits: movie.credits
        }));
        
        // Display details
        displayMovieDetails(movie);
        
        // Fetch and display similar movies
        fetchSimilarMovies(movieId);
        
    } catch (error) {
        console.error('Error fetching movie details:', error);
        if (errorMessage) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = `Error: ${error.message}`;
        }
    }
}

// --- Fetch Similar Movies ---
async function fetchSimilarMovies(movieId) {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/similar?api_key=${apiKey}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        displaySimilarMovies(data.results.slice(0, 8));
        
    } catch (error) {
        console.error('Error fetching similar movies:', error);
    }
}

// --- Display Similar Movies ---
function displaySimilarMovies(movies) {
    if (!movieDetails) return;
    
    // Create section if it doesn't exist
    let similarSection = document.querySelector('.similar-movies-section');
    if (!similarSection) {
        similarSection = document.createElement('section');
        similarSection.className = 'similar-movies-section animate-fade-in';
        similarSection.innerHTML = `
            <h3 class="section-title"><i class="fas fa-film"></i> Similar Movies</h3>
            <div class="similar-movies-list"></div>
        `;
        
        const main = document.querySelector('main');
        if (main) {
            main.appendChild(similarSection);
        }
    }
    
    const similarList = document.querySelector('.similar-movies-list');
    if (!similarList) return;
    
    if (movies.length === 0) {
        similarList.innerHTML = '<p class="no-results-message">No similar movies found.</p>';
        return;
    }
    
    similarList.innerHTML = '';
    
    movies.forEach((movie, index) => {
        const movieItem = document.createElement('div');
        movieItem.className = 'similar-movie-item animate-fade-in';
        movieItem.style.animationDelay = `${index * 0.1}s`;
        
        movieItem.addEventListener('click', () => {
            navigateToDetails(movie.id);
        });
        
        const poster = document.createElement('img');
        poster.className = 'similar-movie-poster';
        
        if (movie.poster_path) {
            poster.src = `https://image.tmdb.org/t/p/w300${movie.poster_path}`;
        } else {
            poster.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgdmlld0JveD0iMCAwIDUwMCA3NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iNzUwIiBmaWxsPSIjMmEyODNlIi8+Cjx0ZXh0IHg9IjI1MCIgeT0iMzc1IiBmaWxsPSIjYWFhYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
        }
        poster.alt = `${movie.title} poster`;
        
        const info = document.createElement('div');
        info.className = 'similar-movie-info';
        
        const title = document.createElement('h4');
        title.className = 'similar-movie-title';
        title.textContent = movie.title;
        
        const year = document.createElement('p');
        year.className = 'similar-movie-year';
        year.textContent = movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown';
        
        info.appendChild(title);
        info.appendChild(year);
        
        movieItem.appendChild(poster);
        movieItem.appendChild(info);
        
        similarList.appendChild(movieItem);
    });
}

// --- Display Movie Details ---
function displayMovieDetails(movie = null) {
    if (!movieDetails) return;

    // If no movie is provided, try to get from localStorage
    if (!movie) {
        const storedMovie = localStorage.getItem('selectedMovie');
        if (!storedMovie) {
            if (errorMessage) {
                errorMessage.style.display = 'block';
                const errorDetails = document.getElementById('error-details');
                if (errorDetails) {
                    errorDetails.textContent = 'No movie data available.';
                    errorDetails.classList.remove('visually-hidden');
                }
            }
            return;
        }
        movie = JSON.parse(storedMovie);
    }

    // Create movie details HTML
    const hasBackdrop = movie.backdrop_path || '';
    const backdropUrl = hasBackdrop ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : '';

    movieDetails.innerHTML = `
        ${hasBackdrop ? `<img class="movie-backdrop" src="${backdropUrl}" alt="" aria-hidden="true">` : ''}
        <div class="movie-content">
            <div class="movie-poster-container">
                <img class="movie-poster img-poster-detail animate-fade-in" 
                     src="${movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgdmlld0JveD0iMCAwIDUwMCA3NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iNzUwIiBmaWxsPSIjMmEyODNlIi8+Cjx0ZXh0IHg9IjI1MCIgeT0iMzc1IiBmaWxsPSIjYWFhYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='}" 
                     alt="${movie.title} poster">
                
                <button class="favorite-btn ${watchlist.some(m => m.id === movie.id) ? 'active' : ''}" 
                        data-movie-id="${movie.id}">
                    <i class="${watchlist.some(m => m.id === movie.id) ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
            
            <div class="movie-info-container animate-slide-up">
                <h2 class="movie-title-detail">${movie.title || 'No title available'}</h2>
                
                <div class="movie-metadata">
                    ${movie.release_date ? `
                        <div class="metadata-item">
                            <i class="far fa-calendar-alt"></i>
                            <span>${new Date(movie.release_date).getFullYear()}</span>
                        </div>
                    ` : ''}
                    
                    ${movie.runtime ? `
                        <div class="metadata-item">
                            <i class="far fa-clock"></i>
                            <span>${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m</span>
                        </div>
                    ` : ''}
                    
                    ${movie.vote_average ? `
                        <div class="metadata-item ${movie.vote_average >= 7 ? 'high-rating' : movie.vote_average >= 5 ? 'medium-rating' : 'low-rating'}">
                            <i class="fas fa-star"></i>
                            <span>${movie.vote_average.toFixed(1)} / 10</span>
                        </div>
                    ` : ''}
                </div>
                
                ${movie.genres && movie.genres.length > 0 ? `
                    <div class="genres-list">
                        ${movie.genres.map(genre => `
                            <span class="metadata-item">${genre.name}</span>
                        `).join('')}
                    </div>
                ` : ''}
                
                <p class="movie-description-detail">${movie.overview || 'No description available.'}</p>
                
                ${movie.videos && movie.videos.results && movie.videos.results.length > 0 ? `
                    <div class="trailer-container">
                        <iframe 
                            src="https://www.youtube.com/embed/${movie.videos.results[0].key}" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen
                            title="${movie.title} trailer"
                        ></iframe>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Add cast section if available
    if (movie.credits && movie.credits.cast && movie.credits.cast.length > 0) {
        const castSection = document.createElement('section');
        castSection.className = 'cast-section animate-fade-in';
        castSection.innerHTML = `
            <h3 class="section-title"><i class="fas fa-users"></i> Cast</h3>
            <div class="cast-list">
                ${movie.credits.cast.slice(0, 10).map((person, index) => `
                    <div class="cast-item animate-fade-in" style="animation-delay: ${index * 0.05}s">
                        <img class="cast-photo" 
                             src="${person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTg1IiBoZWlnaHQ9IjI3OCIgdmlld0JveD0iMCAwIDE4NSAyNzgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxODUiIGhlaWdodD0iMjc4IiBmaWxsPSIjMmEyODNlIi8+Cjx0ZXh0IHg9IjkyLjUiIHk9IjEzOSIgZmlsbD0iI2FhYWFhYSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'}" 
                             alt="${person.name}">
                        <div class="cast-info">
                            <div class="cast-name">${person.name}</div>
                            <div class="cast-character">${person.character}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        movieDetails.parentNode.insertBefore(castSection, movieDetails.nextSibling);
    }
    
    // Add favorite button functionality
    const favoriteBtn = document.querySelector('.favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', () => {
            toggleWatchlist(movie.id, {
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                release_date: movie.release_date,
                overview: movie.overview,
                vote_average: movie.vote_average
            });
        });
    }
}

// --- Create Watchlist Page ---
function createWatchlistPage() {
    if (!movieListContainer) return;
    
    // Hide other elements
    if (loader) loader.style.display = 'none';
    if (noResultsMessage) noResultsMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    
    // Add watchlist heading
    const watchlistHeading = document.createElement('h2');
    watchlistHeading.className = 'page-title animate-fade-in';
    watchlistHeading.innerHTML = '<i class="fas fa-bookmark"></i> Your Watchlist';
    
    // Clear movie list
    movieListContainer.innerHTML = '';
    movieListContainer.parentNode.insertBefore(watchlistHeading, movieListContainer);
    
    // If watchlist is empty
    if (watchlist.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'watchlist-empty animate-fade-in';
        emptyMessage.innerHTML = `
            <i class="far fa-sad-tear"></i>
            <h3>Your watchlist is empty</h3>
            <p>Movies you add to your watchlist will appear here.</p>
            <button class="btn" onclick="window.location.href='index.html'">
                <i class="fas fa-home"></i> Browse Movies
            </button>
        `;
        movieListContainer.appendChild(emptyMessage);
        
        // Hide pagination
        const pagination = document.querySelector('.pagination');
        if (pagination) {
            pagination.style.display = 'none';
        }
        
        return;
    }
    
    // Display watchlist movies
    displayMovies(watchlist);
    
    // Hide pagination
    const pagination = document.querySelector('.pagination');
    if (pagination) {
        pagination.style.display = 'none';
    }
}

function updatePagination() {
    if (!pageInfo) return;

    // Update page info text
    const displayText = currentSearch ?
        `Page ${currentPage} of ${totalPages}` :
        `Popular Movies 2025 - Page ${currentPage} of ${totalPages}`;
    pageInfo.textContent = displayText;
    
    // Update button states
    if (prevButton) prevButton.disabled = currentPage === 1;
    if (nextButton) nextButton.disabled = currentPage >= totalPages;
}

async function performSearch() {
    if (!searchInput) return;

    const searchQuery = searchInput.value.trim();
    if (!searchQuery) {
        showToast('Please enter a movie title to search', 'error');
        return;
    }

    if (window.location.pathname.includes('movieCard.html')) {
        const redirectUrl = 'index.html?query=' + encodeURIComponent(searchQuery);
        window.location.href = redirectUrl;
        return;
    }

    showBackToHomeButton();

    currentSearch = searchQuery;
    currentPage = 1;

    // Update the URL
    updateURL();

    // Fetch and display movies
    fetchAndDisplayMovies();
}

function showBackToHomeButton() {
    const backToHomeContainer = document.querySelector('.back-to-home');
    if (backToHomeContainer) {
        backToHomeContainer.classList.remove('disabled');
    }
    
    if (backToHomeButton) {
        backToHomeButton.style.display = 'inline-flex';
    }
}

function hideBackToHomeButton() {
    const backToHomeContainer = document.querySelector('.back-to-home');
    if (backToHomeContainer) {
        backToHomeContainer.classList.add('disabled');
    }
    
    if (backToHomeButton) {
        backToHomeButton.style.display = 'none';
    }
}

async function loadPopularMovies() {
    hideBackToHomeButton();

    currentSearch = '';
    currentPage = 1;
    selectedGenre = '';

    // Update URL
    updateURL();

    // Reset genre filter buttons if they exist
    const filterButtons = document.querySelectorAll('.filter-button');
    if (filterButtons.length > 0) {
        filterButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        filterButtons[0].classList.add('active');
    }

    // Fetch and display movies
    fetchAndDisplayMovies();
}

function initializeApp() {
    // Set up UI elements
    initializeUI();
    
    // Set current year in footer
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

    // Check if we're on the movieCard.html page
    const isMovieCardPage = window.location.pathname.includes('movieCard.html');
    const isWatchlistPage = window.location.search.includes('watchlist=true');
    
    if (isWatchlistPage) {
        // Display watchlist
        createWatchlistPage();
    } else if (isMovieCardPage) {
        // Get movie ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const movieId = urlParams.get('id');
        
        if (movieId) {
            // Fetch and display movie details
            fetchMovieDetails(movieId);
        } else {
            // Try to use stored movie data
            displayMovieDetails();
        }
    } else {
        // We're on the main page
        
        // Check for URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('query');
        const page = parseInt(urlParams.get('page')) || 1;
        const genre = urlParams.get('genre');
        
        // Set up the state
        currentSearch = query || '';
        currentPage = page;
        selectedGenre = genre || '';
        
        // Update the search input if needed
        if (searchInput && currentSearch) {
            searchInput.value = currentSearch;
            showBackToHomeButton();
        }
        
        // Fetch and display movies
        fetchAndDisplayMovies();
    }

    // Search button click
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }

    // Home/Popular button click
    if (homeButton) {
        homeButton.addEventListener('click', loadPopularMovies);
        searchInput.value = '';
        searchInput.blur()
    }

    // Enter key press
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
                searchInput.blur();
            }
        });
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        const isTyping = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable;
    
        if (e.key === '/' && !isTyping) {
            e.preventDefault();
            if (searchInput) searchInput.focus();
        }

        if (e.key === 'Escape') {
            if (searchInput && document.activeElement === searchInput) {
                searchInput.value = '';
                searchInput.blur();
            }
        }
        
        // Arrow key navigation for pagination
        if (!isTyping) {
            if (e.key === 'ArrowLeft' && prevButton && !prevButton.disabled) {
                prevButton.click();
            } else if (e.key === 'ArrowRight' && nextButton && !nextButton.disabled) {
                nextButton.click();
            }
        }
    });

    // Previous button
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateURL();
                fetchAndDisplayMovies();
                
                // Scroll to top
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
    }

    // Next button
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                updateURL();
                fetchAndDisplayMovies();
                
                // Scroll to top
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
    }

    // Back to home button
    if (backToHomeButton) {
        backToHomeButton.addEventListener('click', () => {
            // Clear search and load popular movies
            loadPopularMovies();
        });
    }

    // Back to search/home button on movie card page
    if (backToSearchButton) {
        backToSearchButton.addEventListener('click', () => {
            const savedState = JSON.parse(localStorage.getItem('searchState')) || {};
            let redirectUrl = 'index.html';

            // Check if there was an active search or filter
            if (savedState.query || savedState.genre) {
                // Add query parameters to maintain the state
                const params = new URLSearchParams();
                if (savedState.query) {
                    params.set('query', savedState.query);
                }
                if (savedState.page && savedState.page > 1) {
                    params.set('page', savedState.page);
                }
                if (savedState.genre) {
                    params.set('genre', savedState.genre);
                }
                redirectUrl += `?${params.toString()}`;
            }

            window.location.href = redirectUrl;
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);