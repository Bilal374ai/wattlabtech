const path = require('path');
const root = path.join(__dirname, '..');
module.exports = { content: ['break-even','calculator','charging-time','tax-credit','tco','tools-hub'].map(n => path.join(root, n + '.html')),
  theme: { extend: { colors: { neon:'#00BFFF','dark-base':'#080C10','dark-card':'#0D1117','dark-border':'#1C2433','dark-input':'#111827' },
    fontFamily: { sans:['Inter','system-ui','sans-serif'], mono:['JetBrainsMono','monospace'] }, boxShadow: { neon:'0 0 16px rgba(0,191,255,0.35)' } } } };
