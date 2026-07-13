const { ZHUYIN, CATEGORIES, SENTENCES, PARAGRAPHS } = window.BOPO || {};

const STORAGE_KEY = 'bopo-learned';

const state = {
  category: 'initials',
  selectedIndex: null,
  learned: new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')),
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const synth = window.speechSynthesis;
let currentUtterance = null;

function speak(text, lang = 'zh-TW') {
  if (!synth) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.85;
  currentUtterance = utterance;
  synth.speak(utterance);
}

function readingText(syllables) {
  return syllables.map((s) => s.hanzi).join('');
}

function flashButton(btn, className) {
  btn.classList.add(className);
  setTimeout(() => btn.classList.remove(className), 350);
}

function exampleWordForChar(hanzi) {
  for (const z of ZHUYIN) {
    for (const ex of z.examples) {
      if (ex.word.includes(hanzi)) return ex.word;
    }
  }
  return null;
}

function bindClickAudio(el, { onSingle, onDouble, flashSingle, flashDouble }) {
  let clickTimer = null;

  el.addEventListener('click', () => {
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      onDouble();
      flashButton(el, flashDouble);
      return;
    }

    clickTimer = setTimeout(() => {
      clickTimer = null;
      onSingle();
      flashButton(el, flashSingle);
    }, 280);
  });
}

function renderRuby(syllables) {
  return syllables
    .map(({ hanzi, zhuyin }) => {
      if (!zhuyin) {
        return `<span class="ruby-punct">${hanzi}</span>`;
      }
      return `<button type="button" class="ruby-btn" data-hanzi="${hanzi}" aria-label="${hanzi} (${zhuyin}): click to pronounce, double-click for example word">
        <span class="ruby-zhuyin">${zhuyin}</span>
        <span class="ruby-hanzi">${hanzi}</span>
      </button>`;
    })
    .join('');
}

function bindReadingSyllables(container, item) {
  const fullText = readingText(item.syllables);

  container.querySelectorAll('.ruby-btn').forEach((btn) => {
    const hanzi = btn.dataset.hanzi;

    bindClickAudio(btn, {
      onSingle: () => speak(hanzi),
      onDouble: () => speak(exampleWordForChar(hanzi) || fullText),
      flashSingle: 'ruby-btn-speak',
      flashDouble: 'ruby-btn-example',
    });
  });
}

function renderReadingContent(container, item) {
  if (!item) {
    container.className = 'reading-content empty';
    container.innerHTML = 'Select an item above';
    return;
  }

  container.className = 'reading-content';
  container.innerHTML = `
    <div class="reading-meta">
      <p class="reading-meaning">${item.meaning}</p>
      <button class="btn btn-primary btn-reading-play" type="button">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
        Listen
      </button>
    </div>
    <p class="reading-hint">Click a character to hear it · Double-click for an example word</p>
    <p class="reading-ruby-line">${renderRuby(item.syllables)}</p>
  `;

  container.querySelector('.btn-reading-play').addEventListener('click', () => {
    speak(readingText(item.syllables));
  });

  bindReadingSyllables(container, item);
}

function initReadings() {
  const sentenceSelect = $('#sentence-select');
  const paragraphSelect = $('#paragraph-select');
  const sentenceContent = $('#sentence-content');
  const paragraphContent = $('#paragraph-content');

  if (!sentenceSelect || !paragraphSelect || !sentenceContent || !paragraphContent) return;

  if (!SENTENCES?.length || !PARAGRAPHS?.length) {
    sentenceContent.className = 'reading-content empty';
    sentenceContent.textContent = 'Readings failed to load — please refresh';
    paragraphContent.className = 'reading-content empty';
    paragraphContent.textContent = 'Readings failed to load — please refresh';
    return;
  }

  const syncOptions = (select, items, placeholder) => {
    const current = select.value;
    select.innerHTML = `
      <option value="">${placeholder}</option>
      ${items.map((item) => `<option value="${item.id}">${item.title}</option>`).join('')}
    `;
    if (current && items.some((item) => item.id === current)) {
      select.value = current;
    }
  };

  syncOptions(sentenceSelect, SENTENCES, '— Select a sentence —');
  syncOptions(paragraphSelect, PARAGRAPHS, '— Select a paragraph —');

  const handleSentenceChange = () => {
    const item = SENTENCES.find((s) => s.id === sentenceSelect.value) || null;
    renderReadingContent(sentenceContent, item);
  };

  const handleParagraphChange = () => {
    const item = PARAGRAPHS.find((p) => p.id === paragraphSelect.value) || null;
    renderReadingContent(paragraphContent, item);
  };

  sentenceSelect.addEventListener('change', handleSentenceChange);
  sentenceSelect.addEventListener('input', handleSentenceChange);
  paragraphSelect.addEventListener('change', handleParagraphChange);
  paragraphSelect.addEventListener('input', handleParagraphChange);
}

function saveLearned() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.learned]));
}

function filteredChars() {
  return ZHUYIN.filter((c) => c.category === state.category);
}

function globalIndex(char) {
  return ZHUYIN.indexOf(char);
}

function updateProgress() {
  const total = ZHUYIN.length;
  const done = state.learned.size;
  const pct = Math.round((done / total) * 100);
  $('.progress-fill').style.width = `${pct}%`;
  $('.progress-count').textContent = `${done} / ${total} learned`;
}

function renderTabs() {
  const tabs = $('.tabs');
  tabs.innerHTML = CATEGORIES.map(
    (cat) => `
    <button class="tab${state.category === cat.id ? ' active' : ''}" data-category="${cat.id}">
      ${cat.label}
      <span>${cat.labelEn} · ${cat.count}</span>
    </button>`
  ).join('');

  tabs.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.category = btn.dataset.category;
      state.selectedIndex = null;
      renderTabs();
      renderGrid();
      renderDetail();
    });
  });
}

function selectCharacter(index, { scroll = true } = {}) {
  state.selectedIndex = index;
  renderGrid();
  renderDetail();
  if (scroll) {
    $('.detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function randomExample(item) {
  return item.examples[Math.floor(Math.random() * item.examples.length)];
}

function flashCharButton(btn, className) {
  flashButton(btn, className);
}

function bindCharButton(btn) {
  const index = Number(btn.dataset.index);
  const item = ZHUYIN[index];

  bindClickAudio(btn, {
    onSingle: () => {
      speak(item.char);
      selectCharacter(index);
    },
    onDouble: () => {
      const example = randomExample(item);
      speak(example.word);
      selectCharacter(index);
    },
    flashSingle: 'char-btn-speak',
    flashDouble: 'char-btn-example',
  });
}

function renderGrid() {
  const chars = filteredChars();
  const grid = $('.grid');
  grid.innerHTML = `
    <p class="grid-hint">Click to pronounce · Double-click for an example word</p>
    ${chars
      .map((c) => {
        const idx = globalIndex(c);
        const isActive = state.selectedIndex === idx;
        const isLearned = state.learned.has(c.char);
        return `<button class="char-btn${isActive ? ' active' : ''}${isLearned ? ' learned' : ''}"
          data-index="${idx}" aria-label="${c.char} (${c.pinyin}): click to pronounce, double-click for example">${c.char}</button>`;
      })
      .join('')}`;

  grid.querySelectorAll('.char-btn').forEach(bindCharButton);
}

let canvas, ctx, drawing = false;

function initCanvas(char) {
  canvas = $('#write-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  ctx.clearRect(0, 0, rect.width, rect.height);
  $('.canvas-guide').textContent = char;

  canvas.onpointerdown = (e) => {
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  canvas.onpointermove = (e) => {
    if (!drawing) return;
    const pos = getPos(e);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#c23b22';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  canvas.onpointerup = canvas.onpointercancel = () => {
    drawing = false;
  };
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function clearCanvas() {
  if (!ctx || !canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
}

function renderDetail() {
  const detail = $('.detail');
  const hint = $('.empty-hint');

  if (state.selectedIndex === null) {
    detail.classList.remove('visible');
    hint.style.display = 'block';
    return;
  }

  hint.style.display = 'none';
  detail.classList.add('visible');

  const item = ZHUYIN[state.selectedIndex];
  const isLearned = state.learned.has(item.char);

  $('.detail-char').textContent = item.char;
  $('.detail-meta h2').textContent = item.char;
  $('.detail-meta .pinyin').textContent = `Pinyin: ${item.pinyin}`;
  $('.pronunciation-tip').textContent = item.tip;

  $('.strokes').innerHTML = item.strokes
    .map((s, i) => `<li><span class="stroke-num">${i + 1}</span>${s}</li>`)
    .join('');

  $('.examples').innerHTML = item.examples
    .map(
      (ex, i) => `
    <li class="example-item">
      <span class="example-word">${ex.word}</span>
      <span class="example-zhuyin">${ex.zhuyin}</span>
      <span class="example-meaning">${ex.meaning}</span>
      <button class="example-play" data-example="${i}" aria-label="Play ${ex.word}">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
    </li>`
    )
    .join('');

  const learnBtn = $('.btn-learn');
  learnBtn.classList.toggle('learned', isLearned);
  learnBtn.innerHTML = isLearned
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg> Learned`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg> Mark learned`;

  $('.example-play').forEach((btn) => {
    btn.addEventListener('click', () => {
      speak(item.examples[Number(btn.dataset.example)].word);
    });
  });

  requestAnimationFrame(() => initCanvas(item.char));
  updateNavButtons();
}

function updateNavButtons() {
  const prev = $('.btn-prev');
  const next = $('.btn-next');
  prev.disabled = state.selectedIndex <= 0;
  next.disabled = state.selectedIndex >= ZHUYIN.length - 1;
}

function navigate(delta) {
  const newIndex = state.selectedIndex + delta;
  if (newIndex < 0 || newIndex >= ZHUYIN.length) return;
  state.category = ZHUYIN[newIndex].category;
  renderTabs();
  selectCharacter(newIndex, { scroll: false });
}

function bindEvents() {
  $('.btn-pronounce').addEventListener('click', () => {
    if (state.selectedIndex === null) return;
    const item = ZHUYIN[state.selectedIndex];
    speak(item.char);
  });

  $('.btn-learn').addEventListener('click', () => {
    if (state.selectedIndex === null) return;
    const item = ZHUYIN[state.selectedIndex];
    if (state.learned.has(item.char)) {
      state.learned.delete(item.char);
    } else {
      state.learned.add(item.char);
    }
    saveLearned();
    updateProgress();
    renderGrid();
    renderDetail();
  });

  $('.btn-clear-canvas').addEventListener('click', clearCanvas);

  $('.btn-prev').addEventListener('click', () => navigate(-1));
  $('.btn-next').addEventListener('click', () => navigate(1));

  document.addEventListener('keydown', (e) => {
    if (state.selectedIndex === null) return;
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });
}

function init() {
  if (!window.BOPO) {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<div style="background:#fde8e4;color:#a32f1a;padding:1rem;text-align:center;font-weight:600;">App failed to load — please refresh the page</div>'
    );
    return;
  }

  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('gestureend', (e) => e.preventDefault());

  renderTabs();
  renderGrid();
  renderDetail();
  initReadings();
  updateProgress();
  bindEvents();
}

init();
