# Film Library REST API

Base URL: `/api`  
All responses are JSON (`Content-Type: application/json`).

## Authentication (403 demonstration)
All `POST` endpoints require header:

- `x-admin-token: letmein`

If missing or invalid, server returns:

- `403 Forbidden`
- Body: `{ "error": "Forbidden: missing or invalid x-admin-token" }`

---

## Films

### GET `/films`
Returns a summary list of films.

**200 OK**
```json
[
  {
    "id": 1,
    "title": "Interstellar",
    "year": 2014,
    "genre": "Sci-Fi",
    "status": "watchlist",
    "averageRating": 4.5
  }
]
