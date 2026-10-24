// server.js
// Simple REST API for the Film Library assignment


const express = require("express");
const cors = require("cors");
const fs = require("fs"); 
const path = require("path"); 

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DEMO = process.env.PUBLIC_DEMO === "true";

// Middleware
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || (process.env.NODE_ENV === "production" ? null : "letmein");

function requireAdmin(req, res, next) {
  if (PUBLIC_DEMO) return res.status(403).json({ error: "Public demo is read-only" });
  if (!ADMIN_TOKEN) return res.status(403).json({ error: "Admin access not configured" });
  const token = req.get("x-admin-token");
  if (token !== ADMIN_TOKEN) {
    return res
      .status(403)
      .type("application/json")
      .json({ error: "Forbidden: missing or invalid x-admin-token" });
  }
  next();
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.get("/api/config", (req, res) => res.json({ readOnly: PUBLIC_DEMO })); 

const dataPath = path.join(__dirname, 'data.json');

function loadData() {
    try {
        if (!fs.existsSync(dataPath)) {
            const initialData = []; 
            fs.writeFileSync(dataPath, JSON.stringify(initialData));
            return initialData;
        }
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("读取文件出错:", e);
        return [];
    }
}

function saveData(data) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

let films = loadData();

let nextFilmId = films.length > 0 ? Math.max(...films.map(f => f.id)) + 1 : 1;


  

// Helper: compute average rating
function averageRating(film) {
  if (!film.reviews || film.reviews.length === 0) {
    return null;
  }
  const sum = film.reviews.reduce((acc, r) => acc + r.rating, 0);
  return sum / film.reviews.length;
}

// --------------------------------------------------
// REST API
// --------------------------------------------------

// GET /api/films  -> list of films (summary)
app.get("/api/films", (req, res) => {
  const summaries = films.map((f) => ({
    id: f.id,
    title: f.title,
    year: f.year,
    genre: f.genre,
    status: f.status,
    averageRating: averageRating(f)
  }));

  res
    .status(200)
    .type("application/json")
    .json(summaries);
});

// GET /api/films/:id -> full details for one film (including reviews)
app.get("/api/films/:id", (req, res) => {
  const id = Number(req.params.id);
  const film = films.find((f) => f.id === id);

  if (!film) {
    return res
      .status(404)
      .type("application/json")
      .json({ error: "Film not found" });
  }

  res
    .status(200)
    .type("application/json")
    .json(film);
});

// POST /api/films -> add a new film
app.post("/api/films", requireAdmin, (req, res) => {

  const { title, year, genre, status, posterUrl, description } = req.body;

  // Basic validation (important for 400 status)
  if (
    !title ||
    !year ||
    !genre ||
    !status ||
    !description ||
    typeof title !== "string"
  ) {
    return res
      .status(400)
      .type("application/json")
      .json({ error: "Missing or invalid required fields" });
  }

  const newFilm = {
    id: nextFilmId++,
    title,
    year: Number(year),
    genre,
    status,
    posterUrl: posterUrl || "",
    description,
    reviews: []
  };

  films.push(newFilm);
saveData(films);
  res
    .status(201)
    .type("application/json")
    .json(newFilm);
});

// POST /api/films/:id/reviews -> add a review to a film
app.post("/api/films/:id/reviews", requireAdmin, (req, res) => {

  const id = Number(req.params.id);
  const film = films.find((f) => f.id === id);

  if (!film) {
    return res
      .status(404)
      .type("application/json")
      .json({ error: "Film not found" });
  }

  const { rating, text } = req.body;

  if (
    !rating ||
    !text ||
    typeof rating !== "number" ||
    rating < 1 ||
    rating > 5
  ) {
    return res
      .status(400)
      .type("application/json")
      .json({ error: "Invalid rating or text" });
  }

  const review = {
    rating,
    text,
    date: new Date().toISOString().slice(0, 10)
  };

  film.reviews.push(review);
saveData(films);
  res
    .status(201)
    .type("application/json")
    .json(review);
});

// --------------------------------------------------
// Start the server
// --------------------------------------------------
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Film API server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
