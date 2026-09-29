// Compiled with: npm run build:css   (re-run after adding new Tailwind classes to any page)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const tools = ['break-even','calculator','charging-time','tax-credit','tco','tools-hub'].map(n => n + '.html');
const files = fs.readdirSync(root).filter(f => f.endsWith('.html') && !f.startsWith('google') && !tools.includes(f)).map(f => path.join(root, f));
module.exports = { content: [...files, path.join(root,'js/script.js'), path.join(root,'js/consent.js')], darkMode: 'class',
  theme: { extend: { colors: { 'neon-blue':'#00E5FF', 'deep-black':'#0A0A0F', silver:'#C7CCD1' }, fontFamily: { sans:['Inter','system-ui','sans-serif'] } } } };
