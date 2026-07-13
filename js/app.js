import { ZHUYIN, CATEGORIES } from '../data/zhuyin.js';

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

function renderGrid() {
  const chars = filteredChars();
  const grid = $('.grid');
  grid.innerHTML = chars
    .map((c) => {
      const idx = globalIndex(c);
      const isActive = state.selectedIndex === idx;
      const isLearned = state.learned.has(c.char);
      return `<button class="char-btn${isActive ? ' active' : ''}${isLearned ? ' learned' : ''}"
        data-index="${idx}" aria-label="${c.char} (${c.pinyin})">${c.char}</button>`;
    })
    .join('');

  grid.querySelectorAll('.char-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedIndex = Number(btn.dataset.index);
      renderGrid();
      renderDetail();
      $('.detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
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
  state.selectedIndex = newIndex;
  state.category = ZHUYIN[newIndex].category;
  renderTabs();
  renderGrid();
  renderDetail();
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
  renderTabs();
  renderGrid();
  renderDetail();
  updateProgress();
  bindEvents();
}

init();
