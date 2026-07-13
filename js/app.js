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

let writeCanvas, writeCtx;
let drawing = false;
let canvasChar = '';
let strokePoints = 0;
let strokeDistance = 0;
let lastStrokePos = null;
let canvasReady = false;
let touchActive = false;

const CANVAS_SIZE = 280;
const MIN_STROKE_POINTS = 5;
const MIN_STROKE_DISTANCE = 18;

function sizeWriteCanvas() {
  if (!writeCanvas || !writeCtx) return false;

  const dpr = window.devicePixelRatio || 1;
  writeCanvas.width = Math.round(CANVAS_SIZE * dpr);
  writeCanvas.height = Math.round(CANVAS_SIZE * dpr);
  writeCtx.setTransform(1, 0, 0, 1, 0, 0);
  writeCtx.scale(dpr, dpr);
  writeCanvas.style.width = `${CANVAS_SIZE}px`;
  writeCanvas.style.height = `${CANVAS_SIZE}px`;
  canvasReady = true;
  return true;
}

function setCanvasOutline(char) {
  const outlineText = $('#canvas-outline-text');
  if (outlineText) {
    outlineText.textContent = char;
  }
  canvasChar = char;
}

function getCanvasPos(clientX, clientY) {
  const rect = writeCanvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function strokeDistanceBetween(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function markCanvasDone() {
  const wrap = $('#canvas-wrap');
  if (!wrap) return;
  wrap.classList.add('canvas-done');
  setTimeout(() => wrap.classList.remove('canvas-done'), 700);
}

function finishStroke() {
  if (strokePoints >= MIN_STROKE_POINTS || strokeDistance >= MIN_STROKE_DISTANCE) {
    speak(canvasChar);
    markCanvasDone();
  }
  drawing = false;
  strokePoints = 0;
  strokeDistance = 0;
  lastStrokePos = null;
}

function beginStroke(x, y) {
  if (!writeCtx || !canvasReady) return;
  drawing = true;
  strokePoints = 1;
  strokeDistance = 0;
  lastStrokePos = { x, y };
  writeCtx.beginPath();
  writeCtx.moveTo(x, y);
}

function continueStroke(x, y) {
  if (!drawing || !writeCtx) return;
  if (lastStrokePos) {
    strokeDistance += strokeDistanceBetween(lastStrokePos, { x, y });
  }
  strokePoints += 1;
  lastStrokePos = { x, y };

  writeCtx.lineWidth = 7;
  writeCtx.lineCap = 'round';
  writeCtx.lineJoin = 'round';
  writeCtx.strokeStyle = '#c23b22';
  writeCtx.lineTo(x, y);
  writeCtx.stroke();
}

function bindCanvasDrawing() {
  const wrap = $('#canvas-wrap');
  writeCanvas = $('#write-canvas');
  if (!wrap || !writeCanvas) return;

  writeCtx = writeCanvas.getContext('2d');
  sizeWriteCanvas();

  const pointFromEvent = (e) => {
    const touch = e.touches?.[0] ?? e.changedTouches?.[0];
    if (touch) return getCanvasPos(touch.clientX, touch.clientY);
    return getCanvasPos(e.clientX, e.clientY);
  };

  const onStart = (e) => {
    if (e.type === 'mousedown' && touchActive) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = pointFromEvent(e);
    beginStroke(pos.x, pos.y);
  };

  const onMove = (e) => {
    if (!drawing) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = pointFromEvent(e);
    continueStroke(pos.x, pos.y);
  };

  const onEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type.startsWith('touch')) touchActive = false;
    finishStroke();
  };

  wrap.addEventListener('touchstart', (e) => {
    touchActive = true;
    onStart(e);
  }, { passive: false });
  wrap.addEventListener('touchmove', onMove, { passive: false });
  wrap.addEventListener('touchend', onEnd, { passive: false });
  wrap.addEventListener('touchcancel', onEnd, { passive: false });

  writeCanvas.addEventListener('mousedown', onStart);
  writeCanvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    onMove(e);
  });
  writeCanvas.addEventListener('mouseup', onEnd);
  writeCanvas.addEventListener('mouseleave', () => {
    if (drawing) finishStroke();
  });
}

function setupWritingPractice(char) {
  setCanvasOutline(char);
  clearCanvas();
  if (!canvasReady) {
    sizeWriteCanvas();
  }
}

function clearCanvas() {
  if (!writeCtx) return;
  writeCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  $('#canvas-wrap')?.classList.remove('canvas-done');
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

  setupWritingPractice(item.char);

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
  bindCanvasDrawing();
}

init();
