const STORAGE_KEY = 'gta6-trophy-checklist';
const EXPORT_FILENAME = 'leonida-platinum-progress.json';
const PROGRESS_VERSION = 1;

function downloadProgress(earned) {
  const snapshot = { version: PROGRESS_VERSION, earned: [...earned].sort((a, b) => a - b) };
  const file = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = EXPORT_FILENAME;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createTracker(trophies) {
  const validIds = new Set(trophies.map(({ id }) => id));
  const idsByName = new Map(trophies.map(({ name, id }) => [name, id]));
  let earned = new Set();
  let storageAvailable = true;

  // Legacy saves and exports used trophy names as their identifiers.
  const resolveLegacyIds = entries => entries.map(entry => idsByName.get(entry) ?? entry);

  function restore() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      storageAvailable = false;
      return;
    }
    try {
      const entries = JSON.parse(raw ?? '[]');
      if (Array.isArray(entries)) {
        earned = new Set(resolveLegacyIds(entries).filter(id => validIds.has(id)));
      }
    } catch {
      // A malformed save leaves the checklist empty and storage usable.
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
      storageAvailable = true;
    } catch {
      storageAvailable = false;
    }
  }

  async function importProgress(file) {
    const snapshot = JSON.parse(await file.text());
    const entries = Array.isArray(snapshot)
      ? resolveLegacyIds(snapshot)
      : snapshot?.version === PROGRESS_VERSION ? snapshot.earned : null;
    if (!Array.isArray(entries) || !entries.every(id => validIds.has(id))) {
      throw new Error('Invalid trophy progress');
    }
    earned = new Set(entries);
    save();
  }

  restore();

  return {
    get size() { return earned.size; },
    get storageAvailable() { return storageAvailable; },
    has: id => earned.has(id),
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
    export: () => downloadProgress(earned),
    importProgress,
  };
}
