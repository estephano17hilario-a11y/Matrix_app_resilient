import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('./.env', 'utf-8');
let url = '';
let key = '';
envFile.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function testUpdate() {
    // 1. Get first user
    const { data: users, error: err1 } = await supabase.from('users').select('id, stats, preferences').limit(1);
    if (err1 || !users || users.length === 0) {
        console.log("Error getting user:", err1);
        return;
    }
    
    const user = users[0];
    console.log("Current user:", user);
    
    // 2. Update stats
    const newStats = { ...(user.stats || {}), xp: (user.stats?.xp || 0) + 10 };
    console.log("Updating to new stats:", newStats);
    
    const { data: updated, error: err2 } = await supabase.from('users').update({ stats: newStats }).eq('id', user.id).select('stats');
    console.log("Update result:", updated, "Error:", err2);
}

testUpdate();