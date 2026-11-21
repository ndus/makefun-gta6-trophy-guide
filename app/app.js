(async () => {
  const byId = id => document.getElementById(id);
  const query = new URLSearchParams(location.search);
  const list = byId('trophies');
  const search = byId('search');
  const spoiler = byId('spoiler');
  const remaining = byId('remaining');
  const chips = [...byId('kinds').querySelectorAll('button[data-kind]')];
  const make = (tag, text = '', className = '') => {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    return element;
  };

  let trophies;
  try {
    const response = await fetch('data/trophies.json');
    if (!response.ok) throw new Error('Trophy data unavailable');
    ({ trophies } = await response.json());
  } catch {
    byId('result-count').textContent = 'Unavailable';
    byId('notice').textContent = 'Could not load the trophy list. Open this guide through the local server.';
    return;
  }

  const index = new Map(trophies.map(trophy => [trophy.id, trophy]));
  Tracker.load(trophies, query.get('earned'));
  let kind = chips.find(chip => chip.dataset.kind === query.get('kind'))?.dataset.kind ?? 'all';
  let selected = index.has(Number(query.get('open'))) ? Number(query.get('open')) : null;
  let view = query.get('view') === 'roadmap' ? 'roadmap' : 'checklist';
  spoiler.checked = query.get('spoiler') === '1';

  const concealed = trophy => spoiler.checked && trophy.kind === 'story' && !Tracker.earned.has(trophy.id);
  const titleFor = trophy => concealed(trophy) ? 'Hidden trophy' : trophy.name;
  const descriptionFor = trophy => concealed(trophy) ? 'Story details are hidden.' : trophy.description;
  const badge = grade => make('span', grade, 'badge ' + grade);

  function renderProgress() {
    const stats = Tracker.counts(trophies);
    byId('progress-count').textContent = stats.earned + ' / ' + stats.total;
    byId('percent').textContent = stats.percent + '%';
    byId('progress').max = stats.total;
    byId('progress').value = stats.earned;
    byId('grades').replaceChildren(...Object.entries(stats.grades).map(([grade, count]) =>
      make('span', count.earned + '/' + count.total + ' ' + grade, 'badge ' + grade)
    ));
  }

  function filtered() {
    const words = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return trophies.filter(trophy => {
      if (remaining.checked && Tracker.earned.has(trophy.id)) return false;
      if (kind === 'missable' ? !trophy.missable : kind !== 'all' && trophy.kind !== kind) return false;
      const haystack = [titleFor(trophy), descriptionFor(trophy), trophy.grade, trophy.kind].join(' ').toLowerCase();
      return words.every(word => haystack.includes(word));
    });
  }

  function open(id) {
    selected = id;
    for (const row of list.children) {
      const active = Number(row.dataset.id) === id;
      row.classList.toggle('selected', active);
      row.querySelector('.row-open')?.setAttribute('aria-expanded', String(active));
    }
    renderDetail();
    if (matchMedia("(max-width: 650px)").matches) byId("detail-title").focus();
  }

  function renderList() {
    const visible = filtered();
    for (const chip of chips) chip.setAttribute('aria-pressed', String(chip.dataset.kind === kind));
    byId('result-count').textContent = visible.length + ' of ' + trophies.length;
    list.replaceChildren();
    for (const trophy of visible) {
      const row = make('li', '', 'trophy-row');
      row.dataset.id = trophy.id;
      row.classList.toggle('selected', selected === trophy.id);
      const checkbox = make('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Tracker.earned.has(trophy.id);
      checkbox.setAttribute('aria-label', 'Earned: ' + titleFor(trophy));
      checkbox.addEventListener('change', () => toggle(trophy.id, 'input'));
      const button = make('button', '', 'row-open');
      button.type = 'button';
      button.setAttribute('aria-controls', 'detail');
      button.setAttribute('aria-expanded', String(selected === trophy.id));
      button.addEventListener('click', () => open(trophy.id));
      const copy = make('span', '', 'row-copy');
      copy.append(make('strong', titleFor(trophy)), make('span', descriptionFor(trophy), 'description'));
      const tags = make('span', '', 'row-tags');
      tags.append(make('span', trophy.kind, 'kind'));
      if (trophy.missable) tags.append(make('span', 'Missable', 'risk'));
      button.append(badge(trophy.grade), copy, tags);
      row.append(checkbox, button);
      list.append(row);
    }
    if (!visible.length) {
      const message = kind === 'online' && !trophies.some(trophy => trophy.kind === 'online')
        ? 'The supplied trophy list has no online trophies.'
        : 'No trophies match these filters.';
      list.append(make('li', message, 'empty'));
    }
  }

  function renderDetail() {
    const detail = byId('detail');
    const trophy = index.get(selected);
    const heading = make('h2', trophy ? titleFor(trophy) : 'Trophy guide');
    heading.id = 'detail-title';
    heading.tabIndex = -1;
    detail.replaceChildren(make('p', trophy ? 'Trophy / ' + String(trophy.id).padStart(2, '0') : 'Field notes', 'eyebrow'), heading);
    if (!trophy) {
      detail.append(make('p', 'Select a trophy to see its guide and source.', 'detail-copy'),
        make('p', '↑ ↓ Move · Space Mark earned · Enter Open guide', 'key-hint'));
      return;
    }
    const tags = make('div', '', 'detail-tags');
    tags.append(badge(trophy.grade), make('span', trophy.kind, 'kind'));
    detail.append(tags, make('p', descriptionFor(trophy), 'official'));
    const stage = Stages.find(entry => entry.id === trophy.stage);
    if (stage) detail.append(make('p', 'Stage ' + stage.id + ' / ' + stage.title, 'eyebrow'));
    if (trophy.missable) {
      const warning = make('div', '', 'warning');
      warning.append(make('strong', 'Potentially missable'), make('p', concealed(trophy)
        ? 'Keep a separate save before advancing.'
        : trophy.missable_note || 'Keep a separate save before attempting this trophy.'));
      detail.append(warning);
    }
    if (concealed(trophy)) {
      detail.append(make('p', 'Turn off spoiler protection to read this guide.', 'detail-copy'));
    } else {
      detail.append(make('h3', 'How to approach it'), make('p', trophy.guide, 'detail-copy'),
        make('p', 'Source: ' + trophy.source, 'citation'));
    }
  }

  function toggle(id, focusSelector) {
    if (!Tracker.toggle(id)) byId('notice').textContent = 'Browser storage is unavailable. Export a backup to keep your progress.';
    const oldRows = [...list.querySelectorAll('.trophy-row')];
    const position = oldRows.findIndex(row => Number(row.dataset.id) === id);
    render();
    const rows = [...list.querySelectorAll('.trophy-row')];
    const target = rows.find(row => Number(row.dataset.id) === id) ?? rows[Math.min(position, rows.length - 1)];
    (target?.querySelector(focusSelector) ?? remaining).focus({ preventScroll: true });
  }

  function render() {
    renderProgress();
    renderList();
    renderDetail();
    byId('checklist').hidden = view !== 'checklist';
    byId('roadmap').hidden = view !== 'roadmap';
    byId('checklist-view').setAttribute('aria-pressed', String(view === 'checklist'));
    byId('roadmap-view').setAttribute('aria-pressed', String(view === 'roadmap'));
    if (view === 'roadmap') {
      Roadmap.render(byId('roadmap'), trophies, titleFor, id => {
        view = 'checklist';
        kind = 'all';
        search.value = '';
        remaining.checked = false;
        selected = id;
        render();
        byId('detail-title').focus();
      });
    }
  }

  list.addEventListener('keydown', event => {
    const row = event.target.closest('.trophy-row');
    if (!row) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = event.key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling;
      next?.querySelector('.row-open')?.focus();
    } else if (event.key === ' ' && event.target.matches('.row-open')) {
      event.preventDefault();
      if (!event.repeat) toggle(Number(row.dataset.id), '.row-open');
    } else if (event.key === 'Enter' && event.target.matches('input')) {
      event.preventDefault();
      open(Number(row.dataset.id));
    }
  });
  byId('reset-filters').addEventListener('click', () => {
    kind = 'all';
    search.value = '';
    remaining.checked = false;
    renderList();
    search.focus();
  });
  search.addEventListener('input', renderList);
  remaining.addEventListener('change', renderList);
  spoiler.addEventListener('change', render);
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      kind = chip.dataset.kind;
      renderList();
    });
  }
  for (const name of ['checklist', 'roadmap']) {
    byId(name + '-view').addEventListener('click', () => {
      view = name;
      render();
    });
  }
  byId('export').addEventListener('click', Tracker.exportState);
  const fileInput = byId('backup-file');
  byId('import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const saved = await Tracker.importState(file);
      byId('notice').textContent = Tracker.preview ? 'Backup loaded for this preview.'
        : saved ? 'Progress restored.' : 'Progress restored for this session. Browser storage is unavailable.';
      render();
    } catch {
      byId('notice').textContent = 'Could not read this backup. Choose a JSON file with valid trophy IDs.';
    } finally {
      fileInput.value = '';
    }
  });
  if (Tracker.preview) byId('notice').textContent = 'Preview progress · changes stay on this page';
  render();
})();
