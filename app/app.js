import { createTracker } from './tracker.js';
import { stages } from './stages.js';

const {
  content, detail, 'detail-content': detailContent, filters, kinds, grade, search,
  spoiler, remaining, 'remaining-option': remainingOption,
  'list-view': listView, 'roadmap-view': roadmapView, status,
  export: exportButton, import: importButton, 'import-file': importFile,
  'progress-copy': progressCopy, 'progress-bar': progressBar, percentage,
  'grade-counts': gradeCounts, 'collection-title': collectionTitle, 'result-count': resultCount,
} = Object.fromEntries([...document.querySelectorAll('[id]')].map(node => [node.id, node]));

const grades = ['platinum', 'gold', 'silver', 'bronze'];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function progressMilestone(earned, total, hasPlatinum) {
  if (hasPlatinum) return 'Platinum earned';
  if (earned === 0) return 'Ready to start';
  const completion = earned / total;
  if (completion >= 0.9) return 'Nearly there';
  if (completion >= 0.5) return 'Halfway or further';
  if (completion >= 0.2) return 'Underway';
  return 'Just started';
}

async function boot() {
  const response = await fetch('data/trophies.json');
  if (!response.ok) throw new Error('Trophy data could not be loaded');
  const { trophies } = await response.json();
  trophies.sort((a, b) => a.id - b.id);
  const platinum = trophies.find(trophy => trophy.grade === 'platinum');
  const byId = new Map(trophies.map(trophy => [trophy.id, trophy]));
  const tracker = createTracker(trophies);
  const query = new URLSearchParams(location.search);
  const kindButtons = [...kinds.querySelectorAll('button')];

  let view = query.get('view') === 'roadmap' ? 'roadmap' : 'list';
  let renderRoadmap;
  let roadmapPromise;
  let kind = kindButtons.some(button => button.dataset.kind === query.get('kind')) ? query.get('kind') : 'all';
  let selectedId = Number(query.get('open'));
  let openerId = selectedId;
  grade.value = grades.includes(query.get('grade')) ? query.get('grade') : 'all';
  spoiler.checked = query.get('spoiler') === '1';
  if (query.has('earned')) tracker.seed(query.get('earned').split(',').map(Number));

  exportButton.disabled = false;
  importButton.disabled = false;
  progressBar.max = trophies.length;

  function masked(trophy) {
    return spoiler.checked && trophy.kind === 'story' && !tracker.has(trophy.id);
  }

  function nameOf(trophy) {
    return masked(trophy) ? 'Hidden trophy' : trophy.name;
  }

  function descriptionOf(trophy) {
    return masked(trophy) ? 'Story description hidden by spoiler shield.' : trophy.description;
  }

  function gradeChip(value) {
    return element('span', `grade-chip ${value}`, value);
  }

  function renderProgress() {
    const milestone = progressMilestone(tracker.size, trophies.length, tracker.has(platinum?.id));
    progressCopy.replaceChildren(element('strong', '', tracker.size), ` of ${trophies.length} earned · ${milestone}`);
    progressBar.value = tracker.size;
    percentage.textContent = `${Math.round(tracker.size / trophies.length * 100)}%`;
    gradeCounts.replaceChildren(...grades.map(value => {
      const group = trophies.filter(trophy => trophy.grade === value);
      const count = group.filter(trophy => tracker.has(trophy.id)).length;
      const item = element('div', `grade-total ${value}`);
      item.append(element('span', 'grade-label', value), element('strong', '', `${count}/${group.length}`));
      return item;
    }));
  }

  function renderRow(trophy) {
    const row = element('li', 'trophy-row');
    row.dataset.id = trophy.id;
    const box = element('input', 'trophy-check');
    box.type = 'checkbox';
    box.checked = tracker.has(trophy.id);
    box.setAttribute('aria-label', `Mark ${nameOf(trophy)} as earned`);
    const button = element('button', 'trophy-trigger');
    button.type = 'button';
    button.setAttribute('aria-controls', 'detail');
    button.setAttribute('aria-expanded', String(trophy.id === selectedId));
    const copy = element('span', 'row-copy');
    copy.append(element('strong', 'trophy-name', nameOf(trophy)), element('span', 'trophy-desc', descriptionOf(trophy)));
    const tags = element('span', 'row-tags');
    if (trophy.missable) tags.append(element('span', 'missable', 'MISSABLE'));
    tags.append(gradeChip(trophy.grade));
    const arrow = element('span', 'arrow', '›');
    arrow.setAttribute('aria-hidden', 'true');
    button.append(copy, tags, arrow);
    const printState = element('span', 'print-state');
    printState.append(element('strong', '', nameOf(trophy)), element('span', '', trophy.grade),
      element('span', '', box.checked ? 'Earned' : 'Open'));
    row.append(box, button, printState);
    box.addEventListener('change', () => {
      tracker.set(trophy.id, box.checked);
      saveStatus();
      const rows = [...content.querySelectorAll('.trophy-trigger')];
      const index = rows.indexOf(button);
      render();
      const visible = content.querySelectorAll('.trophy-trigger');
      const fallback = visible[Math.min(index, visible.length - 1)] ?? remaining;
      (findRowControl(trophy.id, '.trophy-check') ?? fallback).focus({ preventScroll: true });
    });
    button.addEventListener('click', () => {
      openerId = trophy.id;
      openTrophy(trophy.id);
    });
    return row;
  }

  function findRowControl(id, selector) {
    return content.querySelector(`[data-id="${id}"] ${selector}`);
  }

  function openTrophy(id, focusSelector = 'h3') {
    selectedId = id;
    syncSelection();
    renderDetail();
    detail.scrollTop = 0;
    detailContent.querySelector(focusSelector).focus();
  }

  function closeTrophy() {
    const closingId = selectedId;
    selectedId = 0;
    syncSelection();
    renderDetail();
    const fallback = view === 'list' ? search : roadmapView;
    (findRowControl(closingId, '.trophy-trigger')
      ?? findRowControl(openerId, '.trophy-trigger')
      ?? fallback).focus();
  }

  function detailNavigation(trophy) {
    const navigation = element('nav', 'detail-navigation');
    navigation.setAttribute('aria-label', 'Browse all trophies');
    const index = trophies.indexOf(trophy);
    for (const [label, step] of [['Previous', -1], ['Next', 1]]) {
      const button = element('button', '', label);
      button.type = 'button';
      button.dataset.step = step;
      button.setAttribute('aria-label', `${label} trophy`);
      button.addEventListener('click', () => {
        const next = trophies[(index + step + trophies.length) % trophies.length];
        openTrophy(next.id, `[data-step="${step}"]`);
      });
      navigation.append(button);
    }
    return navigation;
  }

  function syncSelection() {
    for (const row of content.querySelectorAll('.trophy-row')) {
      const selected = Number(row.dataset.id) === selectedId;
      row.classList.toggle('selected', selected);
      row.querySelector('.trophy-trigger').setAttribute('aria-expanded', String(selected));
    }
  }

  function renderDetail() {
    detail.classList.toggle('has-selection', byId.has(selectedId));
    detailContent.replaceChildren();
    const trophy = byId.get(selectedId);
    if (!trophy) {
      const marker = element('span', 'detail-mark', '✦');
      marker.setAttribute('aria-hidden', 'true');
      detailContent.append(marker, element('h3', '', 'Trophy guide'),
        element('p', 'detail-muted', 'Select a trophy to read its guide, roadmap stage and source.'));
      if (view === 'roadmap') {
        const jumps = element('ol', 'stage-jumps');
        stages.forEach((name, index) => {
          const item = element('li');
          const jump = element('button', '', name);
          jump.type = 'button';
          jump.addEventListener('click', () => content.querySelector(`#stage-${index + 1} h3`)?.focus());
          item.append(jump);
          jumps.append(item);
        });
        detailContent.append(jumps);
      }
      return;
    }

    const heading = element('div', 'detail-heading');
    const close = element('button', 'close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close trophy guide');
    close.addEventListener('click', closeTrophy);
    const title = element('h3', '', nameOf(trophy));
    title.tabIndex = -1;
    const tags = element('div', 'detail-tags');
    tags.append(gradeChip(trophy.grade));
    if (trophy.missable) tags.append(element('span', 'missable', 'MISSABLE'));

    heading.append(title, close);
    detailContent.append(heading, detailNavigation(trophy), tags, element('p', 'detail-muted', descriptionOf(trophy)));
    detailContent.append(element('p', 'stage-reference', `Stage ${trophy.stage} · ${stages[trophy.stage - 1]}`));
    const citation = element('p', 'citation');
    citation.append(element('strong', '', 'Source: '), trophy.source);
    detailContent.append(citation);

    if (masked(trophy)) {
      const reveal = element('button', 'reveal', 'Turn off spoiler shield');
      reveal.type = 'button';
      reveal.addEventListener('click', () => {
        spoiler.checked = false;
        render();
        detailContent.querySelector('h3').focus();
      });
      detailContent.append(element('p', 'guide-text', 'The guide may reveal story spoilers.'), reveal);
    } else {
      if (trophy.missable_note) {
        const note = element('div', 'missable-note');
        note.append(element('h4', '', 'Missable · save before choices'), element('p', 'guide-text', trophy.missable_note));
        detailContent.append(note);
      }
      detailContent.append(element('h4', 'guide-label', 'How to unlock'), element('p', 'guide-text', trophy.guide));
    }
  }

  function render() {
    const onRoadmap = view === 'roadmap';
    listView.setAttribute('aria-pressed', String(!onRoadmap));
    roadmapView.setAttribute('aria-pressed', String(onRoadmap));
    filters.hidden = onRoadmap;
    remainingOption.hidden = onRoadmap;
    collectionTitle.textContent = onRoadmap ? 'Roadmap' : 'Trophy checklist';

    if (onRoadmap) {
      resultCount.textContent = `${stages.length} stages`;
      if (renderRoadmap) {
        content.replaceChildren(renderRoadmap(trophies, tracker.has, renderRow));
      } else {
        content.replaceChildren(element('p', 'empty', 'Loading roadmap…'));
        roadmapPromise ??= import('./roadmap.js').then(module => {
          renderRoadmap = module.renderRoadmap;
          if (view === 'roadmap') render();
        }).catch(() => {
          roadmapPromise = undefined;
          status.textContent = 'Could not load the roadmap. Select Roadmap to retry.';
        });
      }
    } else {
      for (const button of kindButtons) button.setAttribute('aria-pressed', String(button.dataset.kind === kind));
      const term = search.value.trim().toLowerCase();
      const matches = trophies.filter(trophy => {
        const matchesKind = kind === 'all' || (kind === 'missable' ? trophy.missable : trophy.kind === kind);
        return matchesKind && (!remaining.checked || !tracker.has(trophy.id)) && (grade.value === 'all' || trophy.grade === grade.value)
          && `${trophy.name} ${trophy.description}`.toLowerCase().includes(term);
      });
      resultCount.textContent = `${matches.length} of ${trophies.length} trophies`;
      const list = element('ul', 'trophy-list');
      list.append(...matches.map(renderRow));
      content.replaceChildren(matches.length ? list : element('p', 'empty', 'No trophies match these filters.'));
    }

    syncSelection();
    renderDetail();
    renderProgress();
  }

  function saveStatus(message = '') {
    status.textContent = tracker.storageAvailable ? message : 'Browser storage is unavailable. Export your progress to keep a copy.';
  }

  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape' && byId.has(selectedId)) {
      event.preventDefault();
      closeTrophy();
      return;
    }
    if (view !== 'list' || !(event.target instanceof Element)) return;
    if (event.target.matches('input:not([type="checkbox"]), select, textarea') || event.target.isContentEditable) return;

    if (event.key === '/') {
      event.preventDefault();
      search.focus();
      return;
    }

    if (detail.contains(event.target)) return;
    const direction = { ArrowDown: 1, j: 1, ArrowUp: -1, k: -1 }[event.key];
    if (direction !== 1 && direction !== -1) return;
    const rows = [...content.querySelectorAll('.trophy-row')];
    if (!rows.length) return;
    const index = rows.indexOf(event.target.closest('.trophy-row'));
    const next = index < 0
      ? (direction === 1 ? 0 : rows.length - 1)
      : Math.max(0, Math.min(rows.length - 1, index + direction));
    event.preventDefault();
    rows[next].querySelector('.trophy-trigger').focus();
  });

  listView.addEventListener('click', () => { view = 'list'; render(); });
  roadmapView.addEventListener('click', () => { view = 'roadmap'; render(); });
  for (const button of kindButtons) {
    button.addEventListener('click', () => { kind = button.dataset.kind; render(); });
  }
  grade.addEventListener('change', render);
  search.addEventListener('input', render);
  spoiler.addEventListener('change', render);
  remaining.addEventListener('change', render);
  exportButton.addEventListener('click', () => tracker.export());
  importButton.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const file = importFile.files[0];
    if (!file) return;
    try {
      await tracker.importProgress(file);
      saveStatus('Progress imported.');
      render();
    } catch {
      status.textContent = 'Could not import this file. Choose a valid Leonida Platinum progress JSON.';
    } finally {
      importFile.value = '';
    }
  });

  render();
  saveStatus();
}

boot().catch(() => {
  progressCopy.textContent = 'Trophy data unavailable';
  status.textContent = 'Could not load data/trophies.json. Open the app from a local static server.';
});
