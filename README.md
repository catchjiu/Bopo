# Bopo — Zhuyin Learning App

A small web app to help you learn all **37 Zhuyin (注音 / Bopomofo)** characters used in Taiwan.

## Features

- **37 characters** organized into initials (聲母), medials (介音), and finals (韻母)
- **Pronunciation** — hear each character and example word via your browser's speech synthesis (zh-TW)
- **Writing practice** — stroke-order tips and a canvas to trace each character
- **5 example words** per character with Zhuyin spelling and English meaning
- **Progress tracking** — mark characters as learned; progress is saved in localStorage

## Quick start

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
