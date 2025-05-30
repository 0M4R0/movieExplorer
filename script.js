// The Movie Database (TMDb) API Key
const apiKey = "1b64fc34b21d69f6b5469f62bf975c09";

// --- DOM Elements ---
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-btn');
const homeButton = document.getElementById('home-btn');
const watchlistButton = document.getElementById('watchlist-btn'); // Ensure this is defined
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
let selectedGenre = ''; // Stores the ID of the selected genre
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
    // Ensure it's only created if not on movieCard.html
    if (movieListContainer && !document.querySelector('.filter-bar') && !window.location.pathname.includes('movieCard.html')) {
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
    const allButtonEl = document.createElement('button');
    allButtonEl.className = 'filter-button active';
    allButtonEl.dataset.genreId = ''; // Empty string for "All"
    allButtonEl.textContent = 'All';
    filterBar.appendChild(allButtonEl);

    // Add top 10 popular genres
    const popularGenres = [28, 12, 16, 35, 18, 14, 27, 10749, 878, 53];
    popularGenres.forEach(genreId => {
        const genre = GENRES.find(g => g.id === genreId);
        if (genre) {
            const button = document.createElement('button');
            button.className = 'filter-button';
            button.dataset.genreId = genre.id.toString();
            button.textContent = genre.name;
            filterBar.appendChild(button);
        }
    });

    // Add event listeners for filter buttons
    filterBar.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-button')) {
            document.querySelectorAll('.filter-button').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');

            selectedGenre = e.target.dataset.genreId;
            currentPage = 1; 

            const isWatchlistPage = window.location.search.includes('watchlist=true');

            if (isWatchlistPage) {
                let filteredWatchlistMovies;
                if (selectedGenre) { 
                    const genreIdNumber = parseInt(selectedGenre);
                    filteredWatchlistMovies = watchlist.filter(movie =>
                        movie.genre_ids && movie.genre_ids.includes(genreIdNumber)
                    );
                } else { 
                    filteredWatchlistMovies = watchlist;
                }
                // If a search query is active on watchlist, filter by that too
                const urlParams = new URLSearchParams(window.location.search);
                const watchlistQuery = urlParams.get('query');
                if (watchlistQuery) {
                    currentSearch = watchlistQuery; // Keep currentSearch updated
                    filteredWatchlistMovies = filteredWatchlistMovies.filter(movie =>
                        movie.title.toLowerCase().includes(watchlistQuery.toLowerCase())
                    );
                }

                displayMovies(filteredWatchlistMovies); 
                updateURL(); // Update URL to reflect genre change on watchlist

                let watchlistHeadingEl = movieListContainer.parentNode.querySelector('.page-title');
                if (!watchlistHeadingEl) {
                    watchlistHeadingEl = document.createElement('h2');
                    watchlistHeadingEl.className = 'page-title animate-fade-in';
                    if (movieListContainer.parentNode) {
                        movieListContainer.parentNode.insertBefore(watchlistHeadingEl, movieListContainer);
                    }
                }
                watchlistHeadingEl.innerHTML = '<i class="fas fa-bookmark"></i> Your Watchlist';
                 if (currentSearch) { // Append search term if active
                    watchlistHeadingEl.innerHTML += ` - Results for "${currentSearch}"`;
                }


                const paginationContainer = document.querySelector('.pagination');
                if (paginationContainer) {
                    paginationContainer.style.display = 'none';
                }
            } else {
                // Not on watchlist page, fetch from API as usual
                removeWatchlistTitleIfNeeded(); 
                currentSearch = ''; // Clear search when changing genre on popular/API search
                if(searchInput) searchInput.value = '';
                updateURL(); // This will set genre and remove watchlist/query
                fetchAndDisplayMovies();

                const paginationContainer = document.querySelector('.pagination');
                if (paginationContainer) {
                    paginationContainer.style.display = 'flex';
                }
            }
        }
    });

    const main = document.querySelector('main');
    if (main && movieListContainer && movieListContainer.parentNode) {
        const targetNode = movieListContainer.parentNode.querySelector('.page-title') || movieListContainer;
        main.insertBefore(filterBar, targetNode);
    }

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
    const existingNumbers = document.querySelector('.page-numbers');
    if (existingNumbers) {
        existingNumbers.remove();
    }

    if (!totalPages || totalPages <= 1) return;

    const pageNumbers = document.createElement('div');
    pageNumbers.className = 'page-numbers';

    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);

    if (end === totalPages) {
        start = Math.max(1, totalPages - 4);
    }

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

    for (let i = start; i <= end; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        if (i === currentPage) {
            pageBtn.classList.add('active');
        }
        pageBtn.addEventListener('click', () => goToPage(i));
        pageNumbers.appendChild(pageBtn);
    }

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

    const pagination = document.querySelector('.pagination');
    if (pagination && pageInfo && pageInfo.nextElementSibling) {
        pagination.insertBefore(pageNumbers, pageInfo.nextElementSibling);
    } else if (pagination && pageInfo) {
         pagination.appendChild(pageNumbers); 
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
    url.search = ''; // Clear existing params first

    const isWatchlistActive = document.body.classList.contains('watchlist-active'); // Use a class to track watchlist mode

    if (isWatchlistActive) {
        url.searchParams.set('watchlist', 'true');
        if (currentSearch) { // If there's an active search term for the watchlist
            url.searchParams.set('query', currentSearch);
        }
        if (selectedGenre) { // If a genre is selected for the watchlist
            url.searchParams.set('genre', selectedGenre);
        }
    } else {
        if (currentSearch) {
            url.searchParams.set('query', currentSearch);
        }
        if (selectedGenre) {
            url.searchParams.set('genre', selectedGenre);
        }
        if (currentPage > 1) {
            url.searchParams.set('page', currentPage.toString());
        }
    }
    window.history.replaceState({}, '', url.toString());
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

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Toggle Watchlist ---
function toggleWatchlist(movieId, movieData) {
    const index = watchlist.findIndex(movie => movie.id === movieId);

    if (index === -1) {
        watchlist.push(movieData); 
        showToast(`"${movieData.title}" added to watchlist`);
    } else {
        watchlist.splice(index, 1);
        showToast(`"${movieData.title}" removed from watchlist`);
    }

    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    updateWatchlistButtons();

    if (document.body.classList.contains('watchlist-active')) {
        // Re-filter and display watchlist if currently on watchlist page
        let moviesToDisplay = watchlist;
        if (selectedGenre) {
            const genreIdNum = parseInt(selectedGenre);
            moviesToDisplay = moviesToDisplay.filter(m => m.genre_ids && m.genre_ids.includes(genreIdNum));
        }
        if (currentSearch) {
             moviesToDisplay = moviesToDisplay.filter(m => m.title.toLowerCase().includes(currentSearch.toLowerCase()));
        }

        if (watchlist.length === 0 && !currentSearch && !selectedGenre) {
             createWatchlistPageContent(); // Re-render empty state or full list
        } else {
            displayMovies(moviesToDisplay);
        }
         // Ensure title is correct
        let watchlistHeadingEl = movieListContainer.parentNode.querySelector('.page-title');
        if (watchlistHeadingEl) {
            watchlistHeadingEl.innerHTML = '<i class="fas fa-bookmark"></i> Your Watchlist';
            if (currentSearch) {
                watchlistHeadingEl.innerHTML += ` - Results for "${currentSearch}"`;
            }
        }
    }
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

    if (loader) loader.style.display = 'none';
    if (noResultsMessage) noResultsMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';

    let url;
    if (!searchQuery) {
        const currentYear = new Date().getFullYear();
        url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&sort_by=popularity.desc&primary_release_year=${currentYear}&page=${page}`;
        if (genreId) {
            url += `&with_genres=${genreId}`;
        }
    } else {
        url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}&page=${page}`;
        if (genreId) { // TMDb search API doesn't directly use with_genres with query, but we can try
             url += `&with_genres=${genreId}`; // This might not be effective for 'search' endpoint
        }
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        totalPages = data.total_pages > 500 ? 500 : data.total_pages; 
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
    const paginationContainer = document.querySelector('.pagination');
    if (paginationContainer) {
        paginationContainer.style.display = (data.results.length > 0 && totalPages > 1) ? 'flex' : 'none';
    }
}

// --- Display movies ---
function displayMovies(movies) {
    if (!movieListContainer) return;
    movieListContainer.innerHTML = ''; 

    if (movies.length === 0) {
        if (noResultsMessage) {
            noResultsMessage.style.display = "block";
            const isWatchlistActive = document.body.classList.contains('watchlist-active');
            if (isWatchlistActive && watchlist.length > 0) { // On watchlist, not empty, but filter yields no results
                 noResultsMessage.innerHTML = `
                    <i class="far fa-folder-open"></i>
                    <p>No movies in your watchlist match this filter.</p>`;
            } else if (isWatchlistActive && watchlist.length === 0) {
                // createWatchlistPageContent handles the "Your watchlist is empty" message
            } else { // General no results
                 noResultsMessage.innerHTML = `
                    <i class="far fa-frown"></i>
                    <p>No movies found. Try a different search or filter.</p>`;
            }
        }
        return;
    }
    if (noResultsMessage) noResultsMessage.style.display = "none";


    movies.forEach(movie => {
        const movieItem = document.createElement('div');
        movieItem.classList.add('movie-item', 'animate-fade-in');
        movieItem.addEventListener('click', (e) => {
            if (e.target.closest('.favorite-btn')) return;
            localStorage.setItem('selectedMovie', JSON.stringify({ ...movie }));
            localStorage.setItem('searchState', JSON.stringify({ query: currentSearch, page: currentPage, genre: selectedGenre }));
            navigateToDetails(movie.id);
        });

        const rating = movie.vote_average || 0;
        const ratingElement = document.createElement('div');
        ratingElement.className = 'movie-rating';
        if (rating >= 7) ratingElement.classList.add('high-rating');
        else if (rating >= 5) ratingElement.classList.add('medium-rating');
        else ratingElement.classList.add('low-rating');
        ratingElement.textContent = rating.toFixed(1);
        movieItem.appendChild(ratingElement);

        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'favorite-btn';
        favoriteBtn.dataset.movieId = movie.id.toString();
        favoriteBtn.innerHTML = watchlist.some(m => m.id === movie.id) ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
        if (watchlist.some(m => m.id === movie.id)) favoriteBtn.classList.add('active');

        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const movieDataForWatchlist = {
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                release_date: movie.release_date,
                overview: movie.overview,
                vote_average: movie.vote_average,
                genre_ids: movie.genre_ids || []
            };
            toggleWatchlist(movie.id, movieDataForWatchlist);
        });
        movieItem.appendChild(favoriteBtn);

        const moviePosterEl = document.createElement('img');
        moviePosterEl.classList.add('movie-poster');
        moviePosterEl.src = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgdmlld0JveD0iMCAwIDUwMCA3NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iNzUwIiBmaWxsPSIjMmEyODNlIi8+Cjx0ZXh0IHg9IjI1MCIgeT0iMzc1IiBmaWxsPSIjYWFhYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
        moviePosterEl.alt = movie.title || 'Movie poster';
        moviePosterEl.loading = 'lazy';

        const movieInfoEl = document.createElement('div');
        movieInfoEl.classList.add('movie-info');

        const movieTitleEl = document.createElement('h2');
        movieTitleEl.classList.add('movie-title');
        movieTitleEl.textContent = movie.title || 'No title available';

        const movieYearEl = document.createElement('p');
        movieYearEl.classList.add('movie-year');
        const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown year';
        movieYearEl.innerHTML = `<i class="far fa-calendar-alt"></i> ${releaseYear}`;

        const movieDescriptionEl = document.createElement('p');
        movieDescriptionEl.classList.add('movie-description');
        movieDescriptionEl.textContent = movie.overview || 'No description available.';

        movieInfoEl.appendChild(movieTitleEl);
        movieInfoEl.appendChild(movieYearEl);
        movieInfoEl.appendChild(movieDescriptionEl);

        movieItem.appendChild(moviePosterEl);
        movieItem.appendChild(movieInfoEl);

        movieListContainer.appendChild(movieItem);
    });
}

// --- Navigate to Details Page ---
function navigateToDetails(movieId) {
    window.location.href = `movieCard.html?id=${movieId}`;
}

// --- Fetch Movie Details ---
async function fetchMovieDetails(movieId) {
    if (!movieDetails) return;
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
    try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&append_to_response=credits,videos`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const movie = await response.json();
        localStorage.setItem('selectedMovie', JSON.stringify(movie));
        displayMovieDetails(movie);
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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        displaySimilarMovies(data.results.slice(0, 8));
    } catch (error) {
        console.error('Error fetching similar movies:', error);
    }
}

// --- Display Similar Movies ---
function displaySimilarMovies(movies) {
    if (!movieDetails) return;
    let similarSection = document.querySelector('.similar-movies-section');
    if (!similarSection && movies.length > 0) {
        similarSection = document.createElement('section');
        similarSection.className = 'similar-movies-section animate-fade-in';
        similarSection.innerHTML = `
            <h3 class="section-title"><i class="fas fa-film"></i> Similar Movies</h3>
            <div class="similar-movies-list"></div>
        `;
        const main = document.querySelector('main');
        if (main) main.appendChild(similarSection);
    } else if (similarSection && movies.length === 0) {
        similarSection.remove();
        return;
    } else if (!similarSection) {
        return;
    }

    const similarList = similarSection.querySelector('.similar-movies-list');
    if (!similarList) return;
    similarList.innerHTML = '';

    movies.forEach((movie, index) => {
        const movieItem = document.createElement('div');
        movieItem.className = 'similar-movie-item animate-fade-in';
        movieItem.style.animationDelay = `${index * 0.1}s`;
        movieItem.addEventListener('click', () => navigateToDetails(movie.id));

        const poster = document.createElement('img');
        poster.className = 'similar-movie-poster';
        poster.src = movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgdmlld0JveD0iMCAwIDUwMCA3NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iNzUwIiBmaWxsPSIjMmEyODNlIi8+Cjx0ZXh0IHg9IjI1MCIgeT0iMzc1IiBmaWxsPSIjYWFhYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
        poster.alt = `${movie.title || 'Movie'} poster`;
        poster.loading = 'lazy';

        const info = document.createElement('div');
        info.className = 'similar-movie-info';
        const titleEl = document.createElement('h4');
        titleEl.className = 'similar-movie-title';
        titleEl.textContent = movie.title;
        const yearEl = document.createElement('p');
        yearEl.className = 'similar-movie-year';
        yearEl.textContent = movie.release_date ? new Date(movie.release_date).getFullYear().toString() : 'Unknown';
        info.appendChild(titleEl);
        info.appendChild(yearEl);
        movieItem.appendChild(poster);
        movieItem.appendChild(info);
        similarList.appendChild(movieItem);
    });
}


// --- Display Movie Details ---
function displayMovieDetails(movie = null) {
    if (!movieDetails) return;
    if (!movie) {
        const storedMovie = localStorage.getItem('selectedMovie');
        if (!storedMovie) {
            if (errorMessage) {
                errorMessage.style.display = 'block';
                const errorDetailsEl = document.getElementById('error-details');
                if (errorDetailsEl) {
                    errorDetailsEl.textContent = 'No movie data available.';
                    errorDetailsEl.classList.remove('visually-hidden');
                }
            }
            return;
        }
        movie = JSON.parse(storedMovie);
    }

    const hasBackdrop = movie.backdrop_path || '';
    const backdropUrl = hasBackdrop ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : '';

    movieDetails.innerHTML = `
        ${hasBackdrop ? `<img class="movie-backdrop" src="${backdropUrl}" alt="" aria-hidden="true" loading="lazy">` : ''}
        <div class="movie-content">
            <div class="movie-poster-container">
                <img class="movie-poster img-poster-detail animate-fade-in" 
                     src="${movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgdmlld0JveD0iMCAwIDUwMCA3NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iNzUwIiBmaWxsPSIjMmEyODNlIi8+Cjx0ZXh0IHg9IjI1MCIgeT0iMzc1IiBmaWxsPSIjYWFhYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='}" 
                     alt="${movie.title || 'Movie'} poster" loading="lazy">
                <button class="favorite-btn ${watchlist.some(m => m.id === movie.id) ? 'active' : ''}" 
                        data-movie-id="${movie.id}">
                    <i class="${watchlist.some(m => m.id === movie.id) ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
            <div class="movie-info-container animate-slide-up">
                <h2 class="movie-title-detail">${movie.title || 'No title available'}</h2>
                <div class="movie-metadata">
                    ${movie.release_date ? `<div class="metadata-item"><i class="far fa-calendar-alt"></i><span>${new Date(movie.release_date).getFullYear()}</span></div>` : ''}
                    ${movie.runtime ? `<div class="metadata-item"><i class="far fa-clock"></i><span>${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m</span></div>` : ''}
                    ${movie.vote_average ? `<div class="metadata-item ${movie.vote_average >= 7 ? 'high-rating' : movie.vote_average >= 5 ? 'medium-rating' : 'low-rating'}"><i class="fas fa-star"></i><span>${movie.vote_average.toFixed(1)} / 10</span></div>` : ''}
                </div>
                ${movie.genres && movie.genres.length > 0 ? `<div class="genres-list">${movie.genres.map(genre => `<span class="metadata-item">${genre.name}</span>`).join('')}</div>` : ''}
                <p class="movie-description-detail">${movie.overview || 'No description available.'}</p>
                ${movie.videos && movie.videos.results && movie.videos.results.length > 0 && movie.videos.results.find(v => v.site === 'YouTube') ? `
                    <div class="trailer-container">
                        <iframe 
                            src="https://www.youtube.com/embed/${movie.videos.results.find(v => v.site === 'YouTube').key}" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen
                            title="${movie.title || 'Movie'} trailer"
                            loading="lazy"
                        ></iframe>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

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
                             alt="${person.name}" loading="lazy">
                        <div class="cast-info">
                            <div class="cast-name">${person.name}</div>
                            <div class="cast-character">${person.character}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        if (movieDetails.parentNode) {
             movieDetails.parentNode.insertBefore(castSection, movieDetails.nextSibling);
        }
    }

    const favoriteBtn = movieDetails.querySelector('.favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', () => {
            toggleWatchlist(movie.id, {
                id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                backdrop_path: movie.backdrop_path,
                release_date: movie.release_date,
                overview: movie.overview,
                vote_average: movie.vote_average,
                genres: movie.genres, 
                genre_ids: movie.genres ? movie.genres.map(g => g.id) : (movie.genre_ids || []),
                runtime: movie.runtime,
                videos: movie.videos,
                credits: movie.credits
            });
        });
    }
}

// --- Create Watchlist Page Content (Helper for initializeApp) ---
function createWatchlistPageContent() {
    if (!movieListContainer || !movieListContainer.parentNode) return;
    removeWatchlistTitleIfNeeded();
    document.body.classList.add('watchlist-active');


    if (loader) loader.style.display = 'none';
    if (noResultsMessage) noResultsMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    showBackToHomeButton();


    const watchlistHeading = document.createElement('h2');
    watchlistHeading.className = 'page-title animate-fade-in';
    
    movieListContainer.parentNode.insertBefore(watchlistHeading, movieListContainer);
    movieListContainer.innerHTML = '';

    const paginationContainer = document.querySelector('.pagination');
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
    }

    // Restore search query if present in URL for watchlist
    const urlParams = new URLSearchParams(window.location.search);
    const watchlistQuery = urlParams.get('query');
    currentSearch = watchlistQuery || ''; // Set currentSearch if query exists for watchlist
    if(searchInput && currentSearch) searchInput.value = currentSearch;


    // Restore selected genre if present in URL for watchlist
    const watchlistGenre = urlParams.get('genre');
    selectedGenre = watchlistGenre || '';
    document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
    const activeFilterButton = selectedGenre 
        ? document.querySelector(`.filter-button[data-genre-id="${selectedGenre}"]`)
        : document.querySelector('.filter-button[data-genre-id=""]');
    if (activeFilterButton) activeFilterButton.classList.add('active');


    let moviesToDisplay = watchlist;
    if (selectedGenre) {
        const genreIdNum = parseInt(selectedGenre);
        moviesToDisplay = moviesToDisplay.filter(m => m.genre_ids && m.genre_ids.includes(genreIdNum));
    }
    if (currentSearch) {
        moviesToDisplay = moviesToDisplay.filter(m => m.title.toLowerCase().includes(currentSearch.toLowerCase()));
    }
    
    watchlistHeading.innerHTML = '<i class="fas fa-bookmark"></i> Your Watchlist';
    if (currentSearch) {
        watchlistHeading.innerHTML += ` - Results for "${currentSearch}"`;
    }


    if (watchlist.length === 0) {
        watchlistHeading.innerHTML = '<i class="fas fa-bookmark"></i> Your Watchlist'; // Reset title if empty
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'watchlist-empty animate-fade-in';
        emptyMessage.innerHTML = `
            <i class="far fa-sad-tear"></i>
            <h3>Your watchlist is empty</h3>
            <p>Movies you add to your watchlist will appear here.</p>
            <button class="btn" id="browse-movies-from-empty-watchlist">
                <i class="fas fa-home"></i> Browse Movies
            </button>
        `;
        movieListContainer.appendChild(emptyMessage);
        const browseBtn = document.getElementById('browse-movies-from-empty-watchlist');
        if (browseBtn) browseBtn.addEventListener('click', () => window.location.href = 'index.html');
        return;
    }
    
    displayMovies(moviesToDisplay);
}


// --- Update Pagination UI ---
function updatePagination() {
    if (!pageInfo) return;
    const isWatchlistActive = document.body.classList.contains('watchlist-active');
    const paginationContainer = document.querySelector('.pagination');

    if (isWatchlistActive || totalPages <= 0 || currentSearch && isWatchlistActive) { // Hide for watchlist, no pages, or watchlist search
        if(paginationContainer) paginationContainer.style.display = 'none';
        return;
    }
    if(paginationContainer) paginationContainer.style.display = 'flex';


    pageInfo.textContent = currentSearch ?
        `Page ${currentPage} of ${totalPages}` :
        `Popular Movies - Page ${currentPage} of ${totalPages}`; 

    if (prevButton) prevButton.disabled = currentPage === 1;
    if (nextButton) nextButton.disabled = currentPage >= totalPages;
}


// --- Perform Search ---
async function performSearch() {
    if (!searchInput) return;
    const searchQuery = searchInput.value.trim();
    
    if (!searchQuery) { // Allow clearing search on watchlist
        if (document.body.classList.contains('watchlist-active')) {
            currentSearch = '';
            if(searchInput) searchInput.value = '';
            updateURL();
            createWatchlistPageContent(); // Re-render watchlist without search
            return;
        }
        showToast('Please enter a movie title to search', 'error');
        return;
    }

    currentSearch = searchQuery; // Set currentSearch globally

    if (document.body.classList.contains('watchlist-active')) {
        // We are on the watchlist page, filter client-side
        currentPage = 1; // Reset page for new search within watchlist
        updateURL(); // Update URL with watchlist=true and query=searchQuery
        
        let filteredMovies = watchlist.filter(movie =>
            movie.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        // Apply genre filter if active on watchlist
        if (selectedGenre) {
            const genreIdNumber = parseInt(selectedGenre);
            filteredMovies = filteredMovies.filter(movie =>
                movie.genre_ids && movie.genre_ids.includes(genreIdNumber)
            );
        }
        displayMovies(filteredMovies);

        let watchlistHeadingEl = movieListContainer.parentNode.querySelector('.page-title');
        if (!watchlistHeadingEl) {
            watchlistHeadingEl = document.createElement('h2');
            watchlistHeadingEl.className = 'page-title animate-fade-in';
            if (movieListContainer.parentNode) {
                 movieListContainer.parentNode.insertBefore(watchlistHeadingEl, movieListContainer);
            }
        }
        watchlistHeadingEl.innerHTML = `<i class="fas fa-bookmark"></i> Your Watchlist - Results for "${searchQuery}"`;
        
        const paginationContainer = document.querySelector('.pagination');
        if (paginationContainer) paginationContainer.style.display = 'none';
        hideBackToHomeButton(); // No back to home needed for watchlist internal search
    
    } else if (window.location.pathname.includes('movieCard.html')) {
        // If on movie card page, redirect to index.html with the search query
        window.location.href = `index.html?query=${encodeURIComponent(searchQuery)}`;
    }
    else {
        // Standard API search (not on watchlist, not on movie card)
        removeWatchlistTitleIfNeeded();
        document.body.classList.remove('watchlist-active');
        showBackToHomeButton();
        currentPage = 1;
        // selectedGenre = ''; // Keep selected genre if user wants to search within it
        // document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
        // const allFilterButton = document.querySelector('.filter-button[data-genre-id=""]');
        // if (allFilterButton) allFilterButton.classList.add('active');
        updateURL(); 
        fetchAndDisplayMovies(); 
    }
}

// --- Show/Hide Back to Home Button ---
function showBackToHomeButton() {
    const backToHomeContainer = document.querySelector('.back-to-home');
    if (backToHomeContainer) backToHomeContainer.classList.remove('disabled');
    if (backToHomeButton) backToHomeButton.style.display = 'inline-flex';
}

function hideBackToHomeButton() {
    const backToHomeContainer = document.querySelector('.back-to-home');
    if (backToHomeContainer) backToHomeContainer.classList.add('disabled');
    if (backToHomeButton) backToHomeButton.style.display = 'none';
}

// --- Load Popular Movies (Navigates to clean popular state) ---
function loadPopularMoviesState() {
    document.body.classList.remove('watchlist-active');
    removeWatchlistTitleIfNeeded();
    hideBackToHomeButton();
    currentSearch = '';
    currentPage = 1;
    selectedGenre = ''; 
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
    const allFilterButton = document.querySelector('.filter-button[data-genre-id=""]');
    if (allFilterButton) allFilterButton.classList.add('active');
    
    updateURL(); 
    fetchAndDisplayMovies(); 
}

// --- Utility to remove watchlist title ---
function removeWatchlistTitleIfNeeded() {
    const watchlistHeading = document.querySelector('.page-title');
    if (watchlistHeading && watchlistHeading.innerHTML.includes('Your Watchlist')) {
        watchlistHeading.remove();
    }
}


// --- Initialize Application ---
function initializeApp() {
    initializeUI(); 

    const urlParams = new URLSearchParams(window.location.search);
    const isMovieCardPage = window.location.pathname.includes('movieCard.html');
    
    // Determine page type
    if (urlParams.has('watchlist')) {
        createWatchlistPageContent();
    } else if (isMovieCardPage) {
        document.body.classList.remove('watchlist-active');
        const movieId = urlParams.get('id');
        if (movieId) {
            fetchMovieDetails(movieId);
        } else {
            displayMovieDetails(); 
        }
    } else { 
        // Popular or API search results page
        document.body.classList.remove('watchlist-active');
        currentSearch = urlParams.get('query') || '';
        currentPage = parseInt(urlParams.get('page')) || 1;
        selectedGenre = urlParams.get('genre') || ''; 

        if (searchInput && currentSearch) {
            searchInput.value = currentSearch;
            showBackToHomeButton();
        } else {
            hideBackToHomeButton();
        }
        
        if (selectedGenre) {
            document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
            const genreButton = document.querySelector(`.filter-button[data-genre-id="${selectedGenre}"]`);
            if (genreButton) genreButton.classList.add('active');
        } else {
             document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
            const allFilterButton = document.querySelector('.filter-button[data-genre-id=""]');
            if (allFilterButton) allFilterButton.classList.add('active');
        }
        removeWatchlistTitleIfNeeded();
        fetchAndDisplayMovies();
    }

    // Event Listeners
    if (searchButton) searchButton.addEventListener('click', performSearch);
    
    if (homeButton) {
        homeButton.addEventListener('click', () => {
            // Always navigate to a clean popular movies state
            window.location.href = 'index.html';
        });
    }
    
    if (watchlistButton) { 
        watchlistButton.addEventListener('click', () => {
            // Navigate to update URL, then initializeApp will handle page creation
            window.location.href = 'index.html?watchlist=true'; 
        });
    }


    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
                // searchInput.blur(); // Keep focus for subsequent searches if desired
            }
        });
         searchInput.addEventListener('input', () => { // Live search for watchlist
            if (document.body.classList.contains('watchlist-active')) {
                // To avoid too many updates, you might want to debounce this
                // For simplicity, direct call:
                currentSearch = searchInput.value.trim();
                updateURL(); // Update URL as user types in watchlist search
                createWatchlistPageContent(); // Re-filter and display
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        const isTyping = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable;
        if (e.key === '/' && !isTyping) {
            e.preventDefault();
            if (searchInput) searchInput.focus();
        }
        if (e.key === 'Escape' && searchInput && document.activeElement === searchInput) {
            searchInput.value = '';
             if (document.body.classList.contains('watchlist-active')) { // If on watchlist, clear search and refresh
                currentSearch = '';
                updateURL();
                createWatchlistPageContent();
            }
            searchInput.blur();
        }
        if (!isTyping) {
            if (e.key === 'ArrowLeft' && prevButton && !prevButton.disabled) prevButton.click();
            else if (e.key === 'ArrowRight' && nextButton && !nextButton.disabled) nextButton.click();
        }
    });

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateURL();
                fetchAndDisplayMovies();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                updateURL();
                fetchAndDisplayMovies();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    if (backToHomeButton) {
        backToHomeButton.addEventListener('click', () => {
             window.location.href = 'index.html'; 
        });
    }
    if (backToSearchButton) {
        backToSearchButton.addEventListener('click', () => {
            const savedState = JSON.parse(localStorage.getItem('searchState')) || {};
            let redirectUrl = 'index.html';
            const params = new URLSearchParams();
            if (savedState.query) params.set('query', savedState.query);
            if (savedState.page && savedState.page > 1) params.set('page', savedState.page.toString());
            if (savedState.genre) params.set('genre', savedState.genre);
            if (params.toString()) redirectUrl += `?${params.toString()}`;
            window.location.href = redirectUrl;
        });
    }
    if (isMovieCardPage) {
        document.body.classList.add('on-movie-card-page');
    } else {
        document.body.classList.remove('on-movie-card-page');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
