import { writeFileSync } from 'fs';
import { ZHUYIN, CATEGORIES } from '../data/zhuyin.js';
import { SENTENCES, PARAGRAPHS } from '../data/readings.js';

writeFileSync(
  'js/data.js',
  `window.BOPO=${JSON.stringify({ ZHUYIN, CATEGORIES, SENTENCES, PARAGRAPHS })};\n`
);

console.log('Built js/data.js');
