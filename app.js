// --- 1. TMDB API SETUP ---
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2YjNiODc2NDM5MDA0MjFmYjc5NmNjNTg5ODkzMjFiMSIsIm5iZiI6MTc3MjAyMjEyMy42NzgwMDAyLCJzdWIiOiI2OTllZTk2YmI5ZWIzYmZlODUwNGQzZDIiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.S3wGejy_xHLanVzWOHBybWGChyWrJOdPDhwKVscm-WM';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

const ENDPOINTS = {
    discover: (lang = '') => {
        let url = `${TMDB_BASE_URL}/discover/movie?include_adult=false&include_video=false&language=en-US&primary_release_year=2025&page=1&sort_by=popularity.desc`;
        if (lang) url += `&with_original_language=${lang}`;
        return url;
    },
    search: (query) => `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
    videos: (id) => `${TMDB_BASE_URL}/movie/${id}/videos?language=en-US`,
    credits: (id) => `${TMDB_BASE_URL}/movie/${id}/credits?language=en-US`,
};

const fetchOptions = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${TMDB_TOKEN}`
    }
};

// --- 2. SUPABASE SETUP ---
const SUPABASE_URL = 'https://jyuhifkspmacafuoqilq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yYVk9p3M_9YcMMCgEvWy6g_tD_uhX9Z';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 3. DOM ELEMENTS & GLOBALS ---
const movieGrid = document.getElementById('movie-grid');
const searchInput = document.getElementById('search-input');
const searchDropdown = document.getElementById('search-dropdown');
const watchlistNavBtn = document.getElementById('watchlist-nav-btn');
const watchlistSection = document.getElementById('watchlist-section');
const watchlistGrid = document.getElementById('watchlist-grid');
const headerLoginBtn = document.getElementById('header-login-btn');
let currentSelectedMovie = null;

// --- 4. AUTHENTICATION LOGIC ---
let currentUser = null;
let isLoginMode = true;

const authContainer = document.getElementById('auth-container');
const authForm = document.getElementById('auth-form');
const toggleAuthBtn = document.getElementById('toggle-auth');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');

supabaseClient.auth.getSession().then(({ data: { session } }) => {
    handleSession(session);
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
    handleSession(session);
});

function handleSession(session) {
    if (session) {
        // User IS logged in
        currentUser = session.user;
        if (authContainer) authContainer.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (headerLoginBtn) headerLoginBtn.classList.add('hidden');
        if (watchlistNavBtn) watchlistNavBtn.classList.remove('hidden');

        // Fetch the user's saved movies when they log in!
        fetchWatchlist();
    } else {
        // User is NOT logged in
        currentUser = null;
        if (authContainer) authContainer.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
        if (headerLoginBtn) headerLoginBtn.classList.remove('hidden');
        if (watchlistNavBtn) watchlistNavBtn.classList.add('hidden');
        if (watchlistSection) watchlistSection.classList.add('hidden');
    }
}

// Make the header Login button open the auth overlay if clicked
if (headerLoginBtn) {
    headerLoginBtn.addEventListener('click', () => {
        if (authContainer) authContainer.classList.remove('hidden');
    });
}

// Scroll to watchlist when nav button is clicked
if (watchlistNavBtn) {
    watchlistNavBtn.addEventListener('click', () => {
        window.location.href = 'watchlist.html'; // Sends user to the new page
    });
}

if (toggleAuthBtn) {
    toggleAuthBtn.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        document.getElementById('auth-title').innerText = isLoginMode ? 'Sign In' : 'Sign Up';
        document.getElementById('auth-submit').innerText = isLoginMode ? 'Sign In' : 'Sign Up';
        document.getElementById('auth-switch-text').innerText = isLoginMode ? 'New to our app?' : 'Already have an account?';
        toggleAuthBtn.innerText = isLoginMode ? 'Sign up now' : 'Sign in now';
        if (authError) authError.classList.add('hidden');
    });
}

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        if (authError) authError.classList.add('hidden');

        try {
            let error;
            if (isLoginMode) {
                const result = await supabaseClient.auth.signInWithPassword({ email, password });
                error = result.error;
            } else {
                const result = await supabaseClient.auth.signUp({ email, password });
                error = result.error;
                if (!error) alert("Signup successful! You are now logged in.");
            }

            if (error) throw error;
        } catch (err) {
            if (authError) {
                authError.innerText = err.message;
                authError.classList.remove('hidden');
            }
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
    });
}

// --- 5. FETCH AND DISPLAY LOGIC ---
async function fetchMovies(url, isInitialLoad = false) {
    try {
        const response = await fetch(url, fetchOptions);
        const data = await response.json();
        const movies = data.results;

        displayMovies(movies);

        if (isInitialLoad && movies.length > 0) {
            updateHeroSection(movies[0]);
        }
    } catch (error) {
        console.error("API Error:", error);
    }
}

function updateHeroSection(movie) {
    if (movie.backdrop_path) {
        const heroSection = document.getElementById('hero');
        if (heroSection) heroSection.style.backgroundImage = `url('${TMDB_BACKDROP_BASE}${movie.backdrop_path}')`;
    }

    const heroTitle = document.getElementById('hero-title');
    const heroDesc = document.getElementById('hero-desc');
    const heroYear = document.getElementById('hero-year');
    const heroRating = document.getElementById('hero-rating');

    if (heroTitle) heroTitle.innerText = movie.title;
    if (heroDesc) heroDesc.innerText = movie.overview;

    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    if (heroYear) heroYear.innerHTML = `<i class="fa-regular fa-calendar"></i> ${year}`;

    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    if (heroRating) heroRating.innerHTML = `<i class="fa-solid fa-star" style="color: red;"></i> ${rating}`;
}

function displayMovies(movies) {
    if (!movieGrid) return;
    movieGrid.innerHTML = '';

    if (!movies || !Array.isArray(movies) || movies.length === 0) {
        movieGrid.innerHTML = '<p style="padding: 20px;">No movies found.</p>';
        return;
    }

    movies.forEach(movie => {
        if (!movie.poster_path) return;

        const imageUrl = `${TMDB_IMAGE_BASE}${movie.poster_path}`;
        const card = document.createElement('div');
        card.classList.add('movie-card');

        card.innerHTML = `
            <div class="premium-badge">HD</div>
            <img src="${imageUrl}" alt="${movie.title}">
        `;

        card.addEventListener('click', () => openModal(movie));
        movieGrid.appendChild(card);
    });
}

// --- 6. SEARCH FUNCTIONALITY ---
if (searchInput) {
    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();

        if (query.length > 2) {
            try {
                const response = await fetch(ENDPOINTS.search(query), fetchOptions);
                const data = await response.json();
                showSearchResults(data.results);
            } catch (error) {
                console.error("Search API Error:", error);
            }
        } else {
            if (searchDropdown) {
                searchDropdown.classList.add('hidden');
                searchDropdown.innerHTML = '';
            }
        }
    });
}

function showSearchResults(movies) {
    if (!searchDropdown) return;
    searchDropdown.innerHTML = '';

    if (!movies || movies.length === 0) {
        searchDropdown.innerHTML = '<p style="padding: 15px; font-size: 14px; color: #aaa;">No results found.</p>';
        searchDropdown.classList.remove('hidden');
        return;
    }

    const topResults = movies.slice(0, 6);

    topResults.forEach(movie => {
        const title = movie.title || movie.name;
        const date = movie.release_date || movie.first_air_date || '';
        const year = date ? date.split('-')[0] : 'N/A';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';

        const imageUrl = movie.poster_path
            ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
            : 'https://via.placeholder.com/40x60/333333/FFFFFF?text=No+Img';

        const item = document.createElement('div');
        item.classList.add('search-item');

        item.innerHTML = `
            <img src="${imageUrl}" alt="${title}">
            <div class="search-item-info">
                <h4>${title}</h4>
                <p>${year} • <i class="fa-solid fa-star" style="color: red;"></i> ${rating}</p>
            </div>
        `;

        item.addEventListener('click', () => {
            openModal(movie);
            searchDropdown.classList.add('hidden');
            searchInput.value = '';
        });

        searchDropdown.appendChild(item);
    });

    searchDropdown.classList.remove('hidden');
}

document.addEventListener('click', (e) => {
    if (searchDropdown && !e.target.closest('.search-container')) {
        searchDropdown.classList.add('hidden');
    }
});

// --- 7. MODAL & CREDITS LOGIC ---
async function openModal(movie) {
    currentSelectedMovie = movie;
    const imageUrl = movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : '';

    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const modalImage = document.getElementById('modal-image');
    const modalYear = document.getElementById('modal-year');
    const modalRating = document.getElementById('modal-rating');

    if (modalTitle) modalTitle.innerText = movie.title;
    if (modalDesc) modalDesc.innerText = movie.overview || "No description available.";
    if (modalImage) modalImage.src = imageUrl;

    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    if (modalYear) modalYear.innerHTML = `<i class="fa-regular fa-calendar"></i> ${year}`;

    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    if (modalRating) modalRating.innerHTML = `<i class="fa-solid fa-star" style="color: red;"></i> ${rating}`;

    const directorElement = document.getElementById('modal-director');
    const castElement = document.getElementById('modal-cast');

    if (directorElement) directorElement.innerHTML = `<strong>Director:</strong> Loading...`;
    if (castElement) castElement.innerHTML = `<strong>Cast:</strong> Loading...`;

    try {
        const creditsRes = await fetch(ENDPOINTS.credits(movie.id), fetchOptions);
        const creditsData = await creditsRes.json();

        const director = creditsData.crew.find(member => member.job === 'Director');
        if (directorElement) directorElement.innerHTML = `<strong>Director:</strong> ${director ? director.name : 'Unknown'}`;

        const topCast = creditsData.cast.slice(0, 5).map(actor => actor.name).join(', ');
        if (castElement) castElement.innerHTML = `<strong>Cast:</strong> ${topCast || 'Unknown'}`;
    } catch (err) {
        console.error("Failed to fetch credits:", err);
    }

    const trailerContainer = document.getElementById('trailer-container');
    const trailerIframe = document.getElementById('trailer-iframe');

    if (trailerIframe) trailerIframe.src = '';
    if (trailerContainer) trailerContainer.style.display = 'none';

    try {
        const videoRes = await fetch(ENDPOINTS.videos(movie.id), fetchOptions);
        const videoData = await videoRes.json();
        const trailer = videoData.results.find(vid => vid.site === 'YouTube' && vid.type === 'Trailer');

        if (trailer && trailerIframe && trailerContainer) {
            const origin = window.location.origin === "null" ? "*" : window.location.origin;
            trailerIframe.src = `https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=0&controls=1&modestbranding=1&rel=0&origin=${origin}`;
            trailerContainer.style.display = 'block';
        }
    } catch (err) {
        console.error("Failed to fetch trailer:", err);
    }

    const movieModal = document.getElementById('movie-modal');
    if (movieModal) movieModal.classList.remove('hidden');
}

function closeModal() {
    const movieModal = document.getElementById('movie-modal');
    const trailerIframe = document.getElementById('trailer-iframe');

    if (movieModal) movieModal.classList.add('hidden');
    if (trailerIframe) trailerIframe.src = '';
}

const closeBtn = document.getElementById('close-modal');
if (closeBtn) closeBtn.addEventListener('click', closeModal);

const movieModal = document.getElementById('movie-modal');
if (movieModal) {
    movieModal.addEventListener('click', (e) => {
        if (e.target.id === 'movie-modal') closeModal();
    });
}

// --- 8. DATABASE SAVING & FETCHING LOGIC ---
async function fetchWatchlist() {
    if (!currentUser) return;

    const { data, error } = await supabaseClient
        .from('watchlist')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching watchlist:", error);
        return;
    }

    if (data && data.length > 0) {
        if (watchlistSection) watchlistSection.classList.remove('hidden');
        displayWatchlist(data);
    } else {
        if (watchlistSection) watchlistSection.classList.add('hidden');
    }
}

function displayWatchlist(movies) {
    if (!watchlistGrid) return;
    watchlistGrid.innerHTML = '';

    movies.forEach(movie => {
        const card = document.createElement('div');
        card.classList.add('movie-card');

        card.innerHTML = `
            <div class="premium-badge" style="background: #28a745;">Saved</div>
            <img src="${movie.poster}" alt="${movie.title}">
        `;

        card.addEventListener('click', async () => {
            try {
                const res = await fetch(`${TMDB_BASE_URL}/movie/${movie.movie_id}?language=en-US`, fetchOptions);
                const fullMovie = await res.json();
                openModal(fullMovie);
            } catch (err) {
                console.error("Error fetching full movie details:", err);
            }
        });

        watchlistGrid.appendChild(card);
    });
}

const modalPlayLaterBtn = document.getElementById('modal-play-later');
if (modalPlayLaterBtn) {
    modalPlayLaterBtn.addEventListener('click', async () => {
        if (!currentSelectedMovie || !currentUser) {
            alert("You must be logged in to save movies.");
            return;
        }

        const data = {
            user_id: currentUser.id,
            movie_id: currentSelectedMovie.id,
            title: currentSelectedMovie.title,
            poster: `${TMDB_IMAGE_BASE}${currentSelectedMovie.poster_path}`
        };

        const { error } = await supabaseClient.from('watchlist').insert([data]);

        if (error) {
            console.error("Supabase error:", error);
            alert("Error saving to Watchlist: " + error.message);
        } else {
            alert("Saved to Watchlist!");
            fetchWatchlist(); // Refresh the watchlist visually immediately
        }
    });
}

const heroPlayLaterBtn = document.getElementById('hero-play-later');
if (heroPlayLaterBtn) {
    heroPlayLaterBtn.addEventListener('click', () => {
        const titleElement = document.getElementById('hero-title');
        const title = titleElement ? titleElement.innerText : 'Movie';
        alert(`Ready to add "${title}"! (To implement: set currentSelectedMovie to hero movie to save properly)`);
    });
}

// --- 9. LANGUAGE FILTER LOGIC ---
const languageContainer = document.getElementById('language-container');
if (languageContainer) {
    const languageButtons = languageContainer.querySelectorAll('.genre-pill');

    languageButtons.forEach(button => {
        button.addEventListener('click', () => {
            languageButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const langCode = button.getAttribute('data-lang');
            fetchMovies(ENDPOINTS.discover(langCode));
        });
    });
}

// --- INIT ---
if (document.getElementById('movie-grid')) {
    fetchMovies(ENDPOINTS.discover(''), true);
}
