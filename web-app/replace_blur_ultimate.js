/* eslint-disable no-unused-vars */
/* global require, process */
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
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            let modified = false;

            // Downgrade all heavy backdrop-blur to backdrop-blur-sm
            const bgBlurRegex = /backdrop-blur-(md|lg|xl|2xl|3xl|\[.*?\])/g;
            if (bgBlurRegex.test(content)) {
                content = content.replace(bgBlurRegex, 'backdrop-blur-sm');
                modified = true;
            }

            // Downgrade all heavy blur to blur-sm
            const blurRegex = /(?<!backdrop-)blur-(md|lg|xl|2xl|3xl|\[.*?\])/g;
            if (blurRegex.test(content)) {
                content = content.replace(blurRegex, 'blur-sm');
                modified = true;
            }

            // Add transform-gpu and backface-hidden for rendering performance and preventing black screens on mobile
            // We search for backdrop-blur-sm or blur-sm and inject transform-gpu and backface-hidden nearby if not present
            if (content.includes('backdrop-blur-') || content.includes('blur-')) {
                // To avoid multiple transform-gpu or backface-hidden, we just clean up
                const replaceWithGPU = (match) => {
                    return match + ' transform-gpu backface-hidden';
                };
                
                content = content.replace(/backdrop-blur-sm(?!\s*(transform-gpu|backface-hidden))/g, 'backdrop-blur-sm transform-gpu backface-hidden');
                content = content.replace(/blur-sm(?!\s*(transform-gpu|backface-hidden))/g, 'blur-sm transform-gpu backface-hidden');
                
                // Remove duplicates that might have been created or were already there
                content = content.replace(/(transform-gpu\s*)+/g, 'transform-gpu ');
                content = content.replace(/(backface-hidden\s*)+/g, 'backface-hidden ');
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
console.log('Done replacing blur classes safely for maximum performance.');
