// The Movie Database (TMDb) API Key
const apiKey = "1b64fc34b21d69f6b5469f62bf975c09";

// --- DOM Elements ---
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-btn');
const homeButton = document.getElementById('home-button');
const movieListContainer = document.getElementById('movie-list');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const pageInfo = document.getElementById('page-info');
const noResultsMessage = document.getElementById('no-results-message');
const errorMessage = document.getElementById('error-message');
const loader = document.getElementById('loader');
const currentYearSpan = document.getElementById('current-year');
const currentYearFooter = document.getElementById('current-year-footer');
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

// --- Fetch movies from API ---
async function fetchMovies(searchQuery = null, page = 1) {
    // Show loader and hide messages
    loader.style.display = 'block';
    noResultsMessage.style.display = 'none';
    errorMessage.style.display = 'none';
    movieListContainer.innerHTML = '';

    let url;
    // If no search query, get popular movies of current year
    if (!searchQuery) {
        const currentYear = new Date().getFullYear();
        url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&sort_by=popularity.desc&primary_release_year=${currentYear}&page=${page}`;
    } else {
        url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}&page=${page}`;
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

        loader.style.display = 'none';
        totalPages = data.total_pages;

        return data;
    } catch (error) {
        console.error('Error fetching movies:', error);
        loader.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.textContent = `Error: ${error.message}`;
        return { results: [], total_pages: 0 };
    }
}

function displayMovies(movies) {
    if (!movieListContainer) return;

    movieListContainer.innerHTML = '';

    if (movies.length === 0) {
        noResultsMessage.style.display = "block";
        return;
    }

    movies.forEach(movie => {
        // Create item
        const movieItem = document.createElement('div');
        movieItem.classList.add('movie-item');

        movieItem.style.cursor = 'pointer';

        // Add click event to redirect to movieCard.html
        movieItem.addEventListener('click', () => {
            // Store movie data in localStorage
            localStorage.setItem('selectedMovie', JSON.stringify({
                title: movie.title || 'No title available',
                poster_path: movie.poster_path || '',
                release_date: movie.release_date || '',
                overview: movie.overview || 'No description available.'
            }));
            // Redirect to movieCard.html
            window.location.href = 'movieCard.html';
        });

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
        movieYear.textContent = releaseYear;

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

// Display movie details 
function displayMovieDetails() {
    if (!movieDetails) return;

    const movie = JSON.parse(localStorage.getItem('selectedMovie'));
    if (!movie) {
        if (errorMessage) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'Error: No movie data available.';
        }
        return;
    }

    // Populate movie details
    movieTitle.textContent = movie.title;
    movieYear.textContent = movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown year';
    movieDescription.textContent = movie.overview;
    moviePoster.src = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgdmlld0JveD0iMCAwIDUwMCA3NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MDAiIGhlaWdodD0iNzUwIiBmaWxsPSIjMmEyODNlIi8+Cjx0ZXh0IHg9IjI1MCIgeT0iMzc1IiBmaWxsPSIjYWFhYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
    moviePoster.alt = movie.title || 'Movie poster';
}

function updatePagination() {
    if (!pageInfo) return;

    const displayText = currentSearch ?
        `Page ${currentPage} of ${totalPages}` :
        `Popular Movies 2025 - Page ${currentPage} of ${totalPages}`;
    pageInfo.textContent = displayText;
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage >= totalPages;
}

async function performSearch() {
    if (!searchInput) return;

    const searchQuery = searchInput.value.trim();
    if (!searchQuery) {
        alert('Please enter a movie title to search');
        return;
    }

    showBackToHomeButton();

    currentSearch = searchQuery;
    currentPage = 1;

    // Save search state
    localStorage.setItem('searchState', JSON.stringify({
        query: currentSearch,
        page: currentPage
    }));

    const data = await fetchMovies(currentSearch, currentPage);
    displayMovies(data.results);
    updatePagination();
}


function showBackToHomeButton() {
    backToHomeButton.style.display = 'block';
}

function hideBackToHomeButton() {
    backToHomeButton.style.display = 'none';
}

async function loadPopularMovies() {
    hideBackToHomeButton();

    currentSearch = '';
    currentPage = 1;

    // Save search state (empty for popular movies)
    localStorage.setItem('searchState', JSON.stringify({
        query: '',
        page: currentPage
    }));

    const data = await fetchMovies(null, currentPage);
    displayMovies(data.results);
    updatePagination();
}

function initializeApp() {
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (currentYearFooter) currentYearFooter.textContent = new Date().getFullYear();

    // Check for query parameters or search state
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('query');
    const page = parseInt(urlParams.get('page')) || 1;
    const savedState = JSON.parse(localStorage.getItem('searchState')) || {};

    if (movieListContainer && (query || savedState.query)) {
        currentSearch = query || savedState.query;
        currentPage = page || savedState.page || 1;
        if (searchInput) searchInput.value = currentSearch;
        if (currentSearch) showBackToHomeButton();
        fetchMovies(currentSearch || null, currentPage).then(data => {
            displayMovies(data.results);
            updatePagination();
        });
    } else if (movieListContainer) {
        loadPopularMovies();
    }

    // Search button click
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }

    // Home/Popular button click
    if (homeButton) {
        homeButton.addEventListener('click', loadPopularMovies);
    }

    // Enter key press
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    // Previous button
    if (prevButton) {
        prevButton.addEventListener('click', async () => {
            if (currentPage > 1) {
                currentPage--;
                // Save search state
                localStorage.setItem('searchState', JSON.stringify({
                    query: currentSearch,
                    page: currentPage
                }));
                const data = await fetchMovies(currentSearch || null, currentPage);
                displayMovies(data.results);
                updatePagination();
            }
        });
    }

    // Next button
    if (nextButton) {
        nextButton.addEventListener('click', async () => {
            if (currentPage < totalPages) {
                currentPage++;
                // Save search state
                localStorage.setItem('searchState', JSON.stringify({
                    query: currentSearch,
                    page: currentPage
                }));
                const data = await fetchMovies(currentSearch || null, currentPage);
                displayMovies(data.results);
                updatePagination();
            }
        });
    }

    // Back to home button
    if (backToHomeButton) {
        backToHomeButton.addEventListener('click', () => {
            // Limpiar búsqueda y cargar películas populares
            localStorage.removeItem('searchState');
            currentSearch = '';
            currentPage = 1;
            if (searchInput) searchInput.value = '';

            // Limpiar la URL
            const url = new URL(window.location);
            url.search = '';
            window.history.replaceState({}, '', url.pathname);

            loadPopularMovies();
        });
    }

    if (backToSearchButton) {
        backToSearchButton.addEventListener('click', () => {
            const savedState = JSON.parse(localStorage.getItem('searchState')) || {};
            let redirectUrl = 'index.html';

            // Si había una búsqueda activa, volver a ella
            if (savedState.query) {
                redirectUrl += `?query=${encodeURIComponent(savedState.query)}&page=${savedState.page || 1}`;
            }
            // Si no había búsqueda, volver al inicio con películas populares

            window.location.href = redirectUrl;
        });
    }

    if (movieDetails) {
        displayMovieDetails();
    }
}

if (movieListContainer) {
    loadPopularMovies();
}

// Load DOM
document.addEventListener('DOMContentLoaded', initializeApp);