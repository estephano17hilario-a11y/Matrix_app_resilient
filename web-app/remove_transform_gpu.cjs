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
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            
            // Remove transform-gpu and backface-hidden that were injected by previous scripts
            const regex = /\btransform-gpu\b|\bbackface-hidden\b/g;
            if (regex.test(content)) {
                content = content.replace(regex, '');
                
                // Clean up multiple spaces left over
                content = content.replace(/ +/g, ' ');
                
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

walkDir(directoryPath);
console.log('Done removing transform-gpu and backface-hidden.');
