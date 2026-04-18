const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'index.css');
let content = fs.readFileSync(cssPath, 'utf-8');

// Replace the corrupted selectors
content = content.replace(/\.backdrop-blur-sm transform-gpu/g, '.backdrop-blur-sm, .backdrop-blur-md, .backdrop-blur-lg, .backdrop-blur-xl, .backdrop-blur-2xl, .backdrop-blur-3xl');

// Since there were multiple repetitions, we might end up with duplicates. Let's simplify the selector.
// We can just use a regex to match lines containing multiple .backdrop-blur-* and replace the whole block.
// Let's just do a string replacement.
content = content.replace(/(\.backdrop-blur-[a-z0-9]+,?\s*)+/g, '.backdrop-blur-sm, .backdrop-blur-md, .backdrop-blur-lg, .backdrop-blur-xl, .backdrop-blur-2xl, .backdrop-blur-3xl, .backdrop-blur ');

// Let's write it out and then we can review it.
fs.writeFileSync(cssPath, content, 'utf-8');
console.log('Fixed index.css');
