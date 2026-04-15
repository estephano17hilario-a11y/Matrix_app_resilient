import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

            // Replace backdrop-blur-(md|lg|xl|2xl|3xl|\[.*?\]) with backdrop-blur-sm
            const regex = /backdrop-blur-(md|lg|xl|2xl|3xl|\[.*?\])/g;
            if (regex.test(content)) {
                content = content.replace(regex, 'backdrop-blur-sm');
                modified = true;
            }

            // Ensure transform-gpu is present next to backdrop-blur-sm
            // Only if it's not already there.
            // A safer regex: find "backdrop-blur-sm" that is NOT followed by "transform-gpu" within the same string.
            // Actually, simply replacing "backdrop-blur-sm" with "backdrop-blur-sm transform-gpu" 
            // and then replacing "transform-gpu transform-gpu" with "transform-gpu"
            if (content.includes('backdrop-blur-sm')) {
                // Temporarily replace all to have transform-gpu
                content = content.replace(/backdrop-blur-sm(?!\s+transform-gpu)/g, 'backdrop-blur-sm transform-gpu');
                // Clean up any double transform-gpu that might have happened on the same line
                content = content.replace(/transform-gpu\s+transform-gpu/g, 'transform-gpu');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

walkDir(directoryPath);
console.log('Done replacing blur classes safely.');