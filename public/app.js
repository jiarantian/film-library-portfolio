// app.js
// Front-end logic for the Film Library SPA, connected to the Node.js REST API

// -------------------------------------------------------------
// Configuration
// -------------------------------------------------------------
const API_BASE_URL = "/api";
let adminToken = ""; 


// -------------------------------------------------------------
// State
// -------------------------------------------------------------
let filmSummaries = []; // from GET /api/films
const filmCache = new Map(); // id -> full film details (incl. reviews)
let selectedFilmId = null;
let serverOnline = true;

// -------------------------------------------------------------
// Cache DOM elements
// -------------------------------------------------------------
const filmListEl = document.getElementById("film-list");
const filmCountBadge = document.getElementById("film-count-badge");

const filmDetailsEl = document.getElementById("film-details");
const reviewListEl = document.getElementById("review-list");
const reviewCountBadge = document.getElementById("review-count-badge");

const addReviewForm = document.getElementById("add-review-form");
const reviewRatingEl = document.getElementById("review-rating");
const reviewTextEl = document.getElementById("review-text");
const addReviewButton = document.getElementById("add-review-button");
const markAsWatchedCheckbox = document.getElementById("mark-as-watched");

const searchInputEl = document.getElementById("search-input");
const genreFilterEl = document.getElementById("genre-filter");
const statusFilterEl = document.getElementById("status-filter");
const sortSelectEl = document.getElementById("sort-select");

const statsPanelEl = document.getElementById("stats-panel");

// Add-film modal form elements
const addFilmForm = document.getElementById("add-film-form");
const filmTitleEl = document.getElementById("film-title");
const filmYearEl = document.getElementById("film-year");
const filmGenreEl = document.getElementById("film-genre");
const filmStatusEl = document.getElementById("film-status");
const filmPosterUrlEl = document.getElementById("film-poster-url");
const filmDescriptionEl = document.getElementById("film-description");

// -------------------------------------------------------------
// Helper: global server status message
// -------------------------------------------------------------
function showServerMessage(type, text) {
  // type: "danger" | "info" | "success"
  let banner = document.getElementById("server-status-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "server-status-banner";
    banner.className = "alert text-center mb-0 rounded-0";
    document.body.prepend(banner);
  }
  banner.className = `alert alert-${type} text-center mb-0 rounded-0`;
  banner.textContent = text;
}

function hideServerMessage() {
  const banner = document.getElementById("server-status-banner");
  if (banner) {
    banner.remove();
  }
}

// -------------------------------------------------------------
// Helper: API wrappers with error handling
// -------------------------------------------------------------
async function apiGet(path) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    if (!serverOnline) {
      serverOnline = true;
      showServerMessage("success", "Reconnected to the server.");
      setTimeout(hideServerMessage, 3000);
    }
    return await res.json();
  } catch (err) {
    console.error("GET error:", err);
    if (serverOnline) {
      serverOnline = false;
      showServerMessage(
        "danger",
        "Cannot reach the server at the moment. Please try again later."
      );
    }
    throw err;
  }
}

async function apiPost(path, body) {
  if (!adminToken) {
    const entered = prompt("Enter admin token:");
    if (!entered) throw new Error("Admin token is required");
    adminToken = entered.trim();
  }
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
  "Content-Type": "application/json",
  "x-admin-token": adminToken
},

      body: JSON.stringify(body)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    if (!serverOnline) {
      serverOnline = true;
      showServerMessage("success", "Reconnected to the server.");
      setTimeout(hideServerMessage, 3000);
    }

    return data;
  } catch (err) {
    console.error("POST error:", err);
    if (serverOnline) {
      serverOnline = false;
      showServerMessage(
        "danger",
        "Cannot reach the server at the moment. Please try again later."
      );
    }
    throw err;
  }
}

// -------------------------------------------------------------
// Rendering: film list with filters/sorting
// -------------------------------------------------------------
function getFilteredAndSortedFilms() {
  const search = searchInputEl.value.trim().toLowerCase();
  const statusFilter = statusFilterEl.value;
  const genreFilter = genreFilterEl.value;
  const sortBy = sortSelectEl.value;

  let list = [...filmSummaries];

  // Filter by search
  if (search) {
    list = list.filter((f) =>
      f.title.toLowerCase().includes(search)
    );
  }

  // Filter by status
  if (statusFilter !== "all") {
    list = list.filter((f) => f.status === statusFilter);
  }

  // Filter by genre (simple contains match)
  if (genreFilter !== "all") {
    list = list.filter((f) =>
      (f.genre || "").toLowerCase().includes(genreFilter.toLowerCase())
    );
  }

  // Sort
  list.sort((a, b) => {
    switch (sortBy) {
      case "title-asc":
        return a.title.localeCompare(b.title);
      case "year-desc":
        return b.year - a.year;
      case "rating-desc": {
        const ra = a.averageRating ?? -1;
        const rb = b.averageRating ?? -1;
        return rb - ra;
      }
      default:
        return 0;
    }
  });

  return list;
}

function renderFilmList() {
  const list = getFilteredAndSortedFilms();
  filmListEl.innerHTML = "";

  if (list.length === 0) {
    filmListEl.innerHTML =
      '<div class="list-group-item text-muted small">No films match your filters.</div>';
    filmCountBadge.textContent = "0";
    return;
  }

  list.forEach((film) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
    item.dataset.id = film.id;

    const left = document.createElement("span");
    left.textContent = `${film.title} (${film.year})`;

    const right = document.createElement("span");
    right.className = "text-small-muted";

    const parts = [];
    if (film.status === "watched") {
      parts.push("Watched");
    } else if (film.status === "watchlist") {
      parts.push("Watchlist");
    }
    if (film.averageRating != null) {
      parts.push(`★ ${film.averageRating.toFixed(1)}`);
    }

    right.textContent = parts.join(" · ");

    item.appendChild(left);
    item.appendChild(right);

    if (film.id === selectedFilmId) {
      item.classList.add("active-film");
    }

    item.addEventListener("click", () => {
      selectedFilmId = film.id;
      renderFilmList();
      loadAndRenderFilmDetails(film.id);
      updateAddReviewState();
    });

    filmListEl.appendChild(item);
  });

  filmCountBadge.textContent = String(list.length);
}

// -------------------------------------------------------------
// Rendering: film details & reviews
// -------------------------------------------------------------
function renderFilmDetails(film) {
  if (!film) {
    filmDetailsEl.innerHTML =
      '<p class="text-muted mb-0">Select a film from the list on the left to see its details and reviews.</p>';
    return;
  }

  filmDetailsEl.innerHTML = `
    <div class="d-flex align-items-start">
      <div class="me-3">
        ${
          film.posterUrl
            ? `<img src="${film.posterUrl}" class="film-poster" alt="Poster for ${film.title}">`
            : `<div class="film-poster bg-secondary text-white d-flex align-items-center justify-content-center"
                   style="width:150px; height:220px;">
                 No image
               </div>`
        }
      </div>

      <div>
        <h3>${film.title} <span class="text-muted">(${film.year})</span></h3>
        <p><strong>Genre:</strong> ${film.genre || "—"}</p>
        <p><strong>Status:</strong> ${film.status}</p>
        <p>${film.description}</p>
      </div>
    </div>
  `;
}

function renderReviews(film) {
  reviewListEl.innerHTML = "";

  if (!film || !film.reviews || film.reviews.length === 0) {
    reviewListEl.innerHTML =
      '<p class="text-muted mb-0">No reviews for this film yet.</p>';
    reviewCountBadge.textContent = "0";
    return;
  }

  film.reviews.forEach((review) => {
    const div = document.createElement("div");
    div.className = "review-box";

    div.innerHTML = `
      <strong>${"★".repeat(review.rating)}</strong>
      <p class="mb-1">${review.text}</p>
      <div class="text-small-muted">${review.date}</div>
    `;

    reviewListEl.appendChild(div);
  });

  reviewCountBadge.textContent = String(film.reviews.length);
}

// -------------------------------------------------------------
// Rendering: statistics panel
// -------------------------------------------------------------
function renderStats() {
  if (filmSummaries.length === 0) {
    statsPanelEl.innerHTML =
      '<p class="text-muted mb-0">Add some films and reviews to see your statistics here.</p>';
    return;
  }

  const total = filmSummaries.length;
  const watched = filmSummaries.filter((f) => f.status === "watched").length;
  const watchlist = filmSummaries.filter(
    (f) => f.status === "watchlist"
  ).length;

  // Average rating across all films with rating (using summaries)
  const ratedFilms = filmSummaries.filter(
    (f) => f.averageRating != null
  );
  let overallAvg = null;
  if (ratedFilms.length > 0) {
    const sum = ratedFilms.reduce(
      (acc, f) => acc + f.averageRating,
      0
    );
    overallAvg = sum / ratedFilms.length;
  }

  statsPanelEl.innerHTML = `
    <p class="mb-1"><strong>Total films:</strong> ${total}</p>
    <p class="mb-1"><strong>Watched:</strong> ${watched}</p>
    <p class="mb-1"><strong>Watchlist:</strong> ${watchlist}</p>
    <p class="mb-0">
      <strong>Average rating:</strong>
      ${
        overallAvg != null
          ? overallAvg.toFixed(2)
          : "No ratings yet"
      }
    </p>
  `;
}

// -------------------------------------------------------------
// Filters: populate genre options
// -------------------------------------------------------------
function populateGenreFilter() {
  // Clear all except "All genres"
  genreFilterEl.innerHTML =
    '<option value="all" selected>All genres</option>';

  const genreSet = new Set();
  filmSummaries.forEach((f) => {
    if (f.genre) {
      // Support multiple genres separated by comma
      f.genre.split(",").forEach((g) => {
        const trimmed = g.trim();
        if (trimmed) genreSet.add(trimmed);
      });
    }
  });

  Array.from(genreSet)
    .sort((a, b) => a.localeCompare(b))
    .forEach((genre) => {
      const option = document.createElement("option");
      option.value = genre;
      option.textContent = genre;
      genreFilterEl.appendChild(option);
    });
}

// -------------------------------------------------------------
// Load data from API
// -------------------------------------------------------------
async function loadFilmSummaries() {
  const data = await apiGet("/films");
  filmSummaries = data;
  populateGenreFilter();
  renderFilmList();
  renderStats();
}

async function loadAndRenderFilmDetails(id) {
  let film = filmCache.get(id);
  if (!film) {
    film = await apiGet(`/films/${id}`);
    filmCache.set(id, film);
  }

  renderFilmDetails(film);
  renderReviews(film);
  renderStats(); // update stats in case ratings changed
}

// -------------------------------------------------------------
// Add review
// -------------------------------------------------------------
addReviewForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedFilmId) return;

  const ratingValue = reviewRatingEl.value;
  const text = reviewTextEl.value.trim();

  if (!ratingValue || !text) {
    // Let HTML5 validation show messages
    addReviewForm.classList.add("was-validated");
    return;
  }

  const rating = Number(ratingValue);

  try {
    // POST to API
    const review = await apiPost(`/films/${selectedFilmId}/reviews`, {
      rating,
      text
    });

    // Update local cache
    let film = filmCache.get(selectedFilmId);
    if (!film) {
      film = await apiGet(`/films/${selectedFilmId}`);
    }
    film.reviews = film.reviews || [];
    film.reviews.push(review);
    filmCache.set(selectedFilmId, film);

    // Also update summary averageRating
    const summaryIndex = filmSummaries.findIndex(
      (f) => f.id === selectedFilmId
    );
    if (summaryIndex !== -1) {
      const sum =
        film.reviews.reduce((acc, r) => acc + r.rating, 0) /
        film.reviews.length;
      filmSummaries[summaryIndex].averageRating = sum;

      // If user ticked "mark as watched"
      if (markAsWatchedCheckbox.checked) {
        film.status = "watched";
        filmSummaries[summaryIndex].status = "watched";
      }
    }

    // Re-render
    addReviewForm.reset();
    markAsWatchedCheckbox.checked = false;
    renderReviews(film);
    renderFilmList();
    renderStats();
  } catch (err) {
    alert(
      "Failed to add review: " + (err.message || "Unknown error")
    );
  }
});

// Enable/disable review button
function updateAddReviewState() {
  addReviewButton.disabled = !selectedFilmId;
}

// -------------------------------------------------------------
// Add film (modal form)
// -------------------------------------------------------------
addFilmForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!addFilmForm.checkValidity()) {
    addFilmForm.classList.add("was-validated");
    return;
  }
// Ask for admin token each time (simple "auth" for coursework)


  const newFilmData = {
    title: filmTitleEl.value.trim(),
    year: Number(filmYearEl.value),
    genre: filmGenreEl.value.trim(),
    status: filmStatusEl.value,
    posterUrl: filmPosterUrlEl.value.trim(),
    description: filmDescriptionEl.value.trim()
  };

  try {
    const createdFilm = await apiPost("/films", newFilmData);

    // Update summaries + cache
    const avg = null; // no reviews yet
    filmSummaries.push({
      id: createdFilm.id,
      title: createdFilm.title,
      year: createdFilm.year,
      genre: createdFilm.genre,
      status: createdFilm.status,
      averageRating: avg
    });
    filmCache.set(createdFilm.id, createdFilm);

    // Select the new film
    selectedFilmId = createdFilm.id;

    // Re-render UI
    populateGenreFilter();
    renderFilmList();
    renderFilmDetails(createdFilm);
    renderReviews(createdFilm);
    renderStats();
    updateAddReviewState();

    // Reset and close modal
    addFilmForm.reset();
    addFilmForm.classList.remove("was-validated");

    const modalEl = document.getElementById("addMovieModal");
    if (modalEl && window.bootstrap) {
      const modal =
        bootstrap.Modal.getInstance(modalEl) ||
        new bootstrap.Modal(modalEl);
      modal.hide();
    }
  } catch (err) {
    alert(
      "Failed to add film: " + (err.message || "Unknown error")
    );
  }
});

// -------------------------------------------------------------
// Filter / search / sort event listeners
// -------------------------------------------------------------
[searchInputEl, genreFilterEl, statusFilterEl, sortSelectEl].forEach(
  (el) => {
    el.addEventListener("input", () => {
      renderFilmList();
    });
  }
);

// -------------------------------------------------------------
// Initialise
// -------------------------------------------------------------
async function init() {
  try {
    await loadFilmSummaries();

    // Optionally select first film automatically
    if (filmSummaries.length > 0) {
      selectedFilmId = filmSummaries[0].id;
      await loadAndRenderFilmDetails(selectedFilmId);
      updateAddReviewState();
    } else {
      renderFilmDetails(null);
      renderReviews(null);
      renderStats();
      updateAddReviewState();
    }
  } catch (err) {
    // Already handled by API wrapper, just show empty UI
    renderFilmDetails(null);
    renderReviews(null);
    renderStats();
    updateAddReviewState();
  }
}

init();
// A public deployment is a portfolio demo: browsing remains enabled, editing is disabled.
fetch("/api/config").then(r => r.json()).then(config => {
  if (!config.readOnly) return;
  document.querySelector('[data-bs-target="#addMovieModal"]')?.remove();
  document.getElementById("add-review-form")?.remove();
  const modal = document.getElementById("addMovieModal");
  if (modal) modal.remove();
  const banner = document.createElement("p");
  banner.className = "text-muted small mb-2";
  banner.textContent = "Portfolio demo — read-only preview";
  document.querySelector("main")?.prepend(banner);
}).catch(() => {});
