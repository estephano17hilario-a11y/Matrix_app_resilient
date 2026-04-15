const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            let modified = false;

            // Find all occurrences of backdrop-blur-X
            const regex = /backdrop-blur-(sm|md|lg|xl|2xl|3xl)/g;
            if (regex.test(content)) {
                content = content.replace(regex, (match) => {
                    // Always downgrade to sm for performance, and ensure transform-gpu is nearby
                    // However, adding transform-gpu directly next to it in a string might duplicate it 
                    // if it's already in the className string. 
                    return 'backdrop-blur-sm';
                });
                modified = true;
            }

            if (modified) {
                // Also let's try to add transform-gpu to the same string if not present
                // We'll just look for 'backdrop-blur-sm' that doesn't have 'transform-gpu' in the same quote
                // A simpler way: just replace backdrop-blur-sm with backdrop-blur-sm transform-gpu, 
                // then clean up duplicates.
                content = content.replace(/backdrop-blur-sm/g, 'backdrop-blur-sm transform-gpu');
                content = content.replace(/(transform-gpu\s*)+/g, 'transform-gpu ');
                
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

walkDir(directoryPath);
console.log('Done replacing blur classes.');
