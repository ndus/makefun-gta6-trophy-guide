const Tracker = (() => {
  const key = 'gta6-trophy-tracker-v1';
  const earned = new Set();
  let validIds = new Set();
  let preview = false;

  function apply(ids) {
    const next = ids.map(id => typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id);
    earned.clear();
    for (const id of next) {
      if (validIds.has(id)) earned.add(id);
    }
  }

  function load(trophies, seed) {
    validIds = new Set(trophies.map(trophy => trophy.id));
    preview = seed !== null;
    if (preview) {
      apply(seed.split(','));
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      const ids = Array.isArray(stored) ? stored : stored?.earned;
      apply(Array.isArray(ids) ? ids : []);
    } catch {
      apply([]);
    }
  }

  function snapshot() {
    return { version: 1, earned: [...earned].sort((a, b) => a - b) };
  }

  function save() {
    if (preview) return true;
    try {
      localStorage.setItem(key, JSON.stringify(snapshot()));
      return true;
    } catch {
      return false;
    }
  }

  function toggle(id) {
    if (!validIds.has(id)) return false;
    if (!earned.delete(id)) earned.add(id);
    return save();
  }

  function counts(trophies) {
    const grades = Object.fromEntries(['platinum', 'gold', 'silver', 'bronze'].map(grade => [grade, { earned: 0, total: 0 }]));
    for (const trophy of trophies) {
      const count = grades[trophy.grade];
      count.total++;
      if (earned.has(trophy.id)) count.earned++;
    }
    const total = trophies.length;
    return { grades, total, earned: earned.size, percent: total ? Math.round(100 * earned.size / total) : 0 };
  }

  function exportState() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leonida-progress.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importState(file) {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data?.earned;
    if (!Array.isArray(ids) || ids.some(id => !validIds.has(typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id))) {
      throw new Error('Choose a progress backup with valid trophy IDs.');
    }
    apply(ids);
    return save();
  }

  return { earned, load, save, toggle, counts, exportState, importState, get preview() { return preview; } };
})();
