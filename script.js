        // The Movie Database (TMDb) API Key
        const apiKey = "1b64fc34b21d69f6b5469f62bf975c09";

        // --- DOM Elements ---
        const searchInput = document.getElementById('search-input');
        const searchButton = document.getElementById('search-button');
        const homeButton = document.getElementById('home-button');
        const movieListContainer = document.getElementById('movie-list');
        const prevButton = document.getElementById('prev-button');
        const nextButton = document.getElementById('next-button');
        const pageInfo = document.getElementById('page-info');
        const noResultsMessage = document.getElementById('no-results-message');
        const errorMessage = document.getElementById('error-message');
        const loader = document.getElementById('loader');
        const currentYearSpan = document.getElementById('current-year');

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
            movieListContainer.innerHTML = '';

            if (movies.length === 0) {
                noResultsMessage.style.display = "block";
                return;
            }

            movies.forEach(movie => {
                // Create item
                const movieItem = document.createElement('div');
                movieItem.classList.add('movie-item');

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

        function updatePagination() {
            const displayText = currentSearch ? 
                `Page ${currentPage} of ${totalPages}` : 
                `Popular Movies 2025 - Page ${currentPage} of ${totalPages}`;
            pageInfo.textContent = displayText;
            prevButton.disabled = currentPage === 1;
            nextButton.disabled = currentPage >= totalPages;
        }

        async function performSearch() {
            const searchQuery = searchInput.value.trim();
            if (!searchQuery) {
                alert('Please enter a movie title to search');
                return;
            }
            
            currentSearch = searchQuery;
            currentPage = 1;
            
            const data = await fetchMovies(currentSearch, currentPage);
            displayMovies(data.results);
            updatePagination();
        }

        async function loadPopularMovies() {
            currentSearch = '';
            currentPage = 1;
            
            const data = await fetchMovies(null, currentPage);
            displayMovies(data.results);
            updatePagination();
        }

        function initializeApp() {
            currentYearSpan.textContent = new Date().getFullYear();

            // Search button click
            searchButton.addEventListener('click', performSearch);

            // Home/Popular button click
            homeButton.addEventListener('click', loadPopularMovies);

            // Enter key press
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });

            // Previous button
            prevButton.addEventListener('click', async () => {
                if (currentPage > 1) {
                    currentPage--;
                    const data = await fetchMovies(currentSearch || null, currentPage);
                    displayMovies(data.results);
                    updatePagination();
                }
            });

            // Next button
            nextButton.addEventListener('click', async () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    const data = await fetchMovies(currentSearch || null, currentPage);
                    displayMovies(data.results);
                    updatePagination();
                }
            });

            // Load popular movies on initial load
            loadPopularMovies();
        }

        // Load DOM
        document.addEventListener('DOMContentLoaded', initializeApp);