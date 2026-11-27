// Captures El Monitor's gallery screenshots from the running lab app.
// Run with the Playwright MCP (`browser_run_code_unsafe` → filename) while the
// dev server runs (BASE below). Writes public/tutorial/<lang>/<slide>.jpg and
// returns the manifest JSON to paste into src/modules/monitor/gallery.manifest.json.
async (page) => {
  const BASE = 'http://localhost:5175/lab.html?demo';
  const OUT = 'C:/Users/estep/Matrix_app_resilient/web-app/public/tutorial';
  const W = 390, H = 844;
  const manifest = {};
  const wait = (ms) => page.waitForTimeout(ms);
  const ev = (name, detail) => page.evaluate(([n, d]) => window.dispatchEvent(new CustomEvent(n, { detail: d })), [name, detail]);
  const nav = async (view) => { await ev('monitor:navigate', { view }); await wait(1600); };
  const esc = async (n = 3) => { for (let i = 0; i < n; i++) { await page.keyboard.press('Escape'); await wait(250); } await wait(600); };
  const clean = () => page.addStyleTag({ content: '.lux-whisper-area,.lux-whisper-life,[data-monitor-stage],div[role="status"]{display:none!important} *{caret-color:transparent!important}' });

  const shoot = async (lang, id) => {
    await clean();
    await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    await wait(500);
    const gallery = await page.evaluate(() => window.__monitor.GALLERY);
    const def = Object.values(gallery).flat().find(s => s.id === id);
    const spots = await page.evaluate(({ spots, W, H }) => {
      const out = {};
      for (const sp of spots) {
        const els = Array.from(document.querySelectorAll(sp.sel));
        const el = els.find(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < H; });
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const x = Math.max(0, r.left), y = Math.max(0, r.top);
        const w = Math.min(W, r.right) - x, h = Math.min(H, r.bottom) - y;
        if (w > 4 && h > 4) out[sp.id] = [Math.round(x), Math.round(y), Math.round(w), Math.round(h)];
      }
      return out;
    }, { spots: def.spots, W, H });
    await page.screenshot({ path: `${OUT}/${lang}/${id}.jpg`, type: 'jpeg', quality: 80 });
    manifest[id] = manifest[id] || { w: W, h: H, langs: [], spots: {} };
    manifest[id].langs.push(lang);
    manifest[id].spots[lang] = spots;
  };

  for (const lang of ['es', 'en']) {
    await page.setViewportSize({ width: W, height: H });
    await page.goto(BASE);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE}&lang=${lang}`);
    await wait(9000);
    await page.mouse.click(5, 300);

    // Tasks
    await nav('TASKS'); await page.evaluate(() => window.scrollTo(0, 0));
    await shoot(lang, 'tasks-home');
    await ev('open-quest-modal'); await wait(1300);
    await shoot(lang, 'task-wiz-1');
    await page.locator('[data-tour="wiz-body"] input').first().fill(lang === 'es' ? 'Llamar a mamá' : 'Call mom');
    await page.locator('[data-tour="wiz-cta"]').click(); await wait(700);
    await page.locator('[data-tour="wiz-cta"]').click(); await wait(1100);
    await shoot(lang, 'task-wiz-3');
    await esc(4);

    // Rank / ELO plan
    await page.locator('[data-tour="rank-badge"]').first().click(); await wait(1800);
    await page.evaluate(() => { const m = document.querySelector('.prog-root main'); if (m) m.scrollTop = 330; }); await wait(700);
    await shoot(lang, 'rank-screen');
    await esc(2);

    // Habits
    await nav('HABITS');
    await shoot(lang, 'habits-home');
    await ev('open-habit-modal'); await wait(1300);
    await page.locator('[data-tour="wiz-body"] input').first().fill(lang === 'es' ? 'Leer 10 min' : 'Read 10 min');
    await wait(300);
    if (await page.locator('[data-tour="wiz"][data-wiz-valid="1"]').count()) { await page.locator('[data-tour="wiz-cta"]').click(); await wait(1100); }
    await shoot(lang, 'habit-wiz-2');
    await esc(4);

    // Focus
    await nav('FOCUS');
    await shoot(lang, 'focus-home');
    await ev('open-project-modal'); await wait(1300);
    await page.locator('[data-tour="wiz-body"] input').first().fill(lang === 'es' ? 'Aprender piano' : 'Learn piano');
    await wait(300);
    if (await page.locator('[data-tour="wiz"][data-wiz-valid="1"]').count()) { await page.locator('[data-tour="wiz-cta"]').click(); await wait(1100); }
    await shoot(lang, 'project-wiz-2');
    await esc(4);

    // Notes & journal
    await nav('NOTES'); await ev('monitor:notes-subview', { sub: 'NOTES' }); await wait(900);
    await shoot(lang, 'notes-home');
    await page.locator('[data-tour="notes-fab"]').first().click(); await wait(1300);
    await page.locator('[data-tour="ed-title"]').first().fill(lang === 'es' ? 'Ideas de negocio' : 'Business ideas');
    await page.locator('[data-tour="ed-body"] [contenteditable="true"]').first().click().catch(() => {});
    await page.keyboard.type(lang === 'es' ? 'Una app para organizar el día.' : 'An app to organise the day.');
    await wait(500);
    await shoot(lang, 'note-editor');
    await page.locator('[data-tour="ed-done"]').click(); await wait(1200);
    await ev('monitor:open-journal-today'); await wait(1400);
    if (await page.locator('[data-tour="journal-reminders"]').count()) { await page.mouse.click(195, 40); await wait(900); }
    await page.locator('[data-tour="ed-mood"] button').nth(1).click(); await wait(1600);
    await page.locator('[data-tour="ed-body"] [contenteditable="true"]').first().click().catch(() => {});
    await page.keyboard.type(lang === 'es' ? 'Hoy terminé el informe y fui al gimnasio.' : 'Finished the report and went to the gym today.');
    await wait(500);
    await shoot(lang, 'journal-editor');
    await page.locator('[data-tour="ed-done"]').click(); await wait(1200);

    // Routine & store
    await nav('ROUTINE'); await wait(600);
    await shoot(lang, 'routine-home');
    await nav('STORE'); await wait(600);
    await shoot(lang, 'store-home');
  }
  return JSON.stringify(manifest);
}
