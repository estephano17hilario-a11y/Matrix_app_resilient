const fs = require('fs');
const path = require('path');

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('t(')) {
                const hasUseTranslation = content.includes('useTranslation');
                const hasT = content.includes('const { t }') || content.includes('const {t}') || content.includes('const t =') || content.includes('const { t,') || content.includes('(t,') || content.includes(', t)');
                
                if (!hasUseTranslation && !hasT) {
                    console.log(`❌ FILE: ${fullPath} has t( but no useTranslation/t definition!`);
                }
            }
        }
    }
}

scanDir(path.join(__dirname, '..', 'web-app', 'src'));
