# Bopo — Zhuyin Learning App

A small web app to help you learn all **37 Zhuyin (注音 / Bopomofo)** characters used in Taiwan.

## Features

- **Three sections** — Learning, Flashcard, and Sentences (via the top menu)
- **37 characters** organized into initials (聲母), medials (介音), and finals (韻母)
- **Pronunciation** — hear each character and example word via your browser's speech synthesis (zh-TW)
- **Writing practice** — stroke-order tips and a canvas to trace each character
- **Flashcards** — flip cards, deck filters, Again / Got it grading, weak-card requeue, keyboard shortcuts
- **Sentences & paragraphs** — reading practice with Zhuyin ruby text
- **Progress tracking** — mark characters as learned; flashcard stats saved in localStorage

## Quick start

### Docker / Coolify

Build and run locally:

```bash
docker build -t bopo .
docker run -p 8080:80 bopo
```

Then open [http://localhost:8080](http://localhost:8080).

**Coolify:** create a new application, point it at this repo, and use the included `Dockerfile`. Coolify will build the image and expose port **80** — no extra configuration needed.

### Local development

Because the app uses ES modules, serve it with any static file server:

```bash
# Python
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Then open [http://localhost:8080](http://localhost:8080).

You can also open `index.html` directly in most modern browsers.

## Structure

```
index.html       — main page
css/styles.css   — styles
js/app.js        — app logic
data/zhuyin.js   — character data (37 entries)
```
