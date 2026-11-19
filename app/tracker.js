const STORAGE_KEY = 'gta6-trophy-checklist';

export function createTracker(trophies) {
  const validIds = new Set(trophies.map(trophy => trophy.id));
  const idsByName = new Map(trophies.map(trophy => [trophy.name, trophy.id]));
  let earned = new Set();
  let storageAvailable = true;

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (Array.isArray(saved)) {
      // Older checklists stored names instead of IDs.
      earned = new Set(saved.map(value => idsByName.get(value) ?? value).filter(id => validIds.has(id)));
    }
  } catch (error) {
    storageAvailable = error instanceof SyntaxError;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
      storageAvailable = true;
    } catch {
      storageAvailable = false;
    }
  }

  return {
    get size() { return earned.size; },
    get storageAvailable() { return storageAvailable; },
    has(id) { return earned.has(id); },
    set(id, checked) {
      if (!validIds.has(id)) return;
      if (checked) earned.add(id);
      else earned.delete(id);
      save();
    },
    seed(ids) {
      for (const id of ids) {
        if (validIds.has(id)) earned.add(id);
      }
      save();
    },
    export() {
      const snapshot = { version: 1, earned: [...earned].sort((a, b) => a - b) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'leonida-platinum-progress.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    async importProgress(file) {
      const snapshot = JSON.parse(await file.text());
      const ids = Array.isArray(snapshot)
        ? snapshot.map(value => idsByName.get(value) ?? value)
        : snapshot?.version === 1 ? snapshot.earned : null;
      if (!Array.isArray(ids) || !ids.every(id => validIds.has(id))) {
        throw new Error('Invalid trophy progress');
      }
      earned = new Set(ids);
      save();
    },
  };
}
