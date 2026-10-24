# Film Library — Full-Stack Portfolio Project

A personal film collection website built with HTML, CSS, Bootstrap, JavaScript, Node.js and Express.

Features: searchable film library, genre and watch-status filters, sorting, film details, reviews and ratings, and basic statistics.

## Run locally

```bash
npm ci
npm start
```

Open http://localhost:3000.

## Deploy on Render

Upload this repository to GitHub, then in Render choose **New > Blueprint** and select the repository. `render.yaml` specifies a free Node web service with `PUBLIC_DEMO=true`.

In public demo mode, visitors can browse films and ratings but cannot modify them. No password is exposed. The app stores initial sample film data in `data.json`. Changes from local admin-mode editing aren't guaranteed to survive on an ephemeral hosting filesystem.

## Notes

The poster images are movie promotional artwork, owned by their respective rights holders, and are included only as illustrative assets for this student portfolio demo. Consider using licensed assets for wider commercial use.
