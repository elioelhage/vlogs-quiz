# Vlogs Quiz

A small static quiz site for the vlog trivia question bank.

## Features

- Easy and Medium are enabled; Hard and Extreme are marked Coming soon.
- Multiple choice (choose a vlog / detail from a vlog) and True/False.
- Ten questions per active category.
- Scores, attempts and best scores are saved in browser localStorage.
- Pass mark is 70%; passed results are highlighted in green.
- Users can retake either quiz; the dashboard retains the best score.

## Run locally

Serve this folder over HTTP, not by opening index.html directly:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Deploy with GitHub Pages

1. Open repository Settings → Pages.
2. Select Deploy from a branch, branch main, folder / (root).
3. Save. GitHub Pages will publish the static site.

No build step, backend or API key is required.

## Score storage

Scores are stored per browser and device using localStorage. They are not synchronized between devices or browsers. Clearing browser storage removes them.
