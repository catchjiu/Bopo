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

let guideCanvas, writeCanvas, guideCtx, writeCtx;
let drawing = false;
let canvasChar = '';
let strokePoints = 0;
let strokeDistance = 0;
let lastStrokePos = null;

const CANVAS_FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
const MIN_STROKE_POINTS = 8;
const MIN_STROKE_DISTANCE = 24;

function setupCanvasSize(canvas, ctx) {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  return rect;
}

function drawGuideOutline(char) {
  if (!guideCtx || !guideCanvas) return;
  const rect = guideCanvas.parentElement.getBoundingClientRect();
  guideCtx.clearRect(0, 0, rect.width, rect.height);

  const fontSize = Math.min(rect.width, rect.height) * 0.72;
  guideCtx.font = `700 ${fontSize}px ${CANVAS_FONT}`;
  guideCtx.textAlign = 'center';
  guideCtx.textBaseline = 'middle';
  const x = rect.width / 2;
  const y = rect.height / 2;

  guideCtx.fillStyle = 'rgba(194, 59, 34, 0.07)';
  guideCtx.fillText(char, x, y);

  guideCtx.lineWidth = Math.max(2.5, fontSize * 0.045);
  guideCtx.strokeStyle = 'rgba(194, 59, 34, 0.32)';
  guideCtx.lineJoin = 'round';
  guideCtx.strokeText(char, x, y);
}

function getCanvasPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
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

function initCanvas(char) {
  guideCanvas = $('#guide-canvas');
  writeCanvas = $('#write-canvas');
  if (!guideCanvas || !writeCanvas) return;

  canvasChar = char;
  guideCtx = guideCanvas.getContext('2d');
  writeCtx = writeCanvas.getContext('2d');

  const setup = () => {
    setupCanvasSize(guideCanvas, guideCtx);
    setupCanvasSize(writeCanvas, writeCtx);
    drawGuideOutline(char);
    clearCanvas();
  };

  setup();
  requestAnimationFrame(setup);

  writeCanvas.onpointerdown = (e) => {
    e.preventDefault();
    drawing = true;
    strokePoints = 0;
    strokeDistance = 0;
    lastStrokePos = null;
    writeCanvas.setPointerCapture(e.pointerId);
    const pos = getCanvasPos(e, writeCanvas);
    writeCtx.beginPath();
    writeCtx.moveTo(pos.x, pos.y);
    lastStrokePos = pos;
    strokePoints = 1;
  };

  writeCanvas.onpointermove = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const pos = getCanvasPos(e, writeCanvas);
    if (lastStrokePos) {
      strokeDistance += strokeDistanceBetween(lastStrokePos, pos);
    }
    strokePoints += 1;
    lastStrokePos = pos;

    writeCtx.lineWidth = 5;
    writeCtx.lineCap = 'round';
    writeCtx.lineJoin = 'round';
    writeCtx.strokeStyle = '#c23b22';
    writeCtx.lineTo(pos.x, pos.y);
    writeCtx.stroke();
  };

  writeCanvas.onpointerup = (e) => {
    e.preventDefault();
    if (writeCanvas.hasPointerCapture(e.pointerId)) {
      writeCanvas.releasePointerCapture(e.pointerId);
    }
    finishStroke();
  };

  writeCanvas.onpointercancel = (e) => {
    if (writeCanvas.hasPointerCapture(e.pointerId)) {
      writeCanvas.releasePointerCapture(e.pointerId);
    }
    finishStroke();
  };

  writeCanvas.onpointerleave = () => {
    if (drawing) finishStroke();
  };
}

function clearCanvas() {
  if (!writeCtx || !writeCanvas) return;
  const rect = writeCanvas.parentElement.getBoundingClientRect();
  writeCtx.clearRect(0, 0, rect.width, rect.height);
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
