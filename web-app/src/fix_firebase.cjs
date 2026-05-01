const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./', (filePath) => {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content
            .replace(/from\s+['"].*?firebaseService['"]/g, "from '@/services/supabase'")
            .replace(/from\s+['"].*?firebase['"]/g, "from '@/services/supabase'");

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent);
            console.log('Updated:', filePath);
        }
    }
});