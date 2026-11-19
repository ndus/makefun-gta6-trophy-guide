import { createTracker } from './tracker.js';
import { renderRoadmap, stages } from './roadmap.js';

const content = document.getElementById('content');
const detail = document.getElementById('detail');
const detailContent = document.getElementById('detail-content');
const filters = document.getElementById('filters');
const kinds = document.getElementById('kinds');
const grade = document.getElementById('grade');
const search = document.getElementById('search');
const spoiler = document.getElementById('spoiler');
const listView = document.getElementById('list-view');
const roadmapView = document.getElementById('roadmap-view');
const status = document.getElementById('status');
const exportButton = document.getElementById('export');
const importButton = document.getElementById('import');
const importFile = document.getElementById('import-file');
const progressCopy = document.getElementById('progress-copy');
const progressBar = document.getElementById('progress-bar');
const percentage = document.getElementById('percentage');
const gradeCounts = document.getElementById('grade-counts');
const collectionTitle = document.getElementById('collection-title');
const resultCount = document.getElementById('result-count');

const grades = ['platinum', 'gold', 'silver', 'bronze'];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function boot() {
  const response = await fetch('data/trophies.json');
  if (!response.ok) throw new Error('Trophy data could not be loaded');
  const { trophies } = await response.json();
  const byId = new Map(trophies.map(trophy => [trophy.id, trophy]));
  const tracker = createTracker(trophies);
  const query = new URLSearchParams(location.search);
  const kindButtons = [...kinds.querySelectorAll('button')];

  let view = query.get('view') === 'roadmap' ? 'roadmap' : 'list';
  let kind = kindButtons.some(button => button.dataset.kind === query.get('kind')) ? query.get('kind') : 'all';
  let selectedId = Number(query.get('open'));
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
    progressCopy.replaceChildren(element('strong', '', tracker.size), ` of ${trophies.length} earned`);
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
    row.append(box, button);
    box.addEventListener('change', () => {
      tracker.set(trophy.id, box.checked);
      saveStatus();
      render();
      findRowControl(trophy.id, '.trophy-check')?.focus({ preventScroll: true });
    });
    button.addEventListener('click', () => {
      selectedId = trophy.id;
      syncSelection();
      renderDetail();
      detailContent.querySelector('h3').focus();
    });
    return row;
  }

  function findRowControl(id, selector) {
    return content.querySelector(`[data-id="${id}"] ${selector}`);
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
        stages.forEach(([name], index) => {
          const item = element('li');
          const jump = element('button', '', name);
          jump.type = 'button';
          jump.addEventListener('click', () => content.querySelector(`#stage-${index + 1} h3`).focus());
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
    close.addEventListener('click', () => {
      const previous = selectedId;
      selectedId = 0;
      syncSelection();
      renderDetail();
      (findRowControl(previous, '.trophy-trigger') ?? (view === 'list' ? search : roadmapView)).focus();
    });
    heading.append(element('span', 'eyebrow', 'TROPHY GUIDE'), close);
    const title = element('h3', '', nameOf(trophy));
    title.tabIndex = -1;
    const tags = element('div', 'detail-tags');
    tags.append(gradeChip(trophy.grade));
    if (trophy.missable) tags.append(element('span', 'missable', 'MISSABLE'));

    detailContent.append(heading, title, tags, element('p', 'detail-muted', descriptionOf(trophy)));
    detailContent.append(element('p', 'stage-reference', `Stage ${trophy.stage} · ${stages[trophy.stage - 1][0]}`));
    detailContent.append(element('h4', '', 'How to unlock'));

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
      detailContent.append(element('p', 'guide-text', trophy.guide));
      if (trophy.missable_note) {
        const note = element('div', 'missable-note');
        note.append(element('h4', '', 'Missable note'), element('p', 'guide-text', trophy.missable_note));
        detailContent.append(note);
      }
    }
    detailContent.append(element('p', 'citation', `Source: ${trophy.source}`));
  }

  function render() {
    const onRoadmap = view === 'roadmap';
    listView.setAttribute('aria-pressed', String(!onRoadmap));
    roadmapView.setAttribute('aria-pressed', String(onRoadmap));
    filters.hidden = onRoadmap;
    collectionTitle.textContent = onRoadmap ? 'Roadmap' : 'Trophy checklist';

    if (onRoadmap) {
      resultCount.textContent = '6 stages';
      content.replaceChildren(renderRoadmap(trophies, tracker.has, renderRow));
    } else {
      for (const button of kindButtons) button.setAttribute('aria-pressed', String(button.dataset.kind === kind));
      const term = search.value.trim().toLowerCase();
      const matches = trophies.filter(trophy => {
        const matchesKind = kind === 'all' || (kind === 'missable' ? trophy.missable : trophy.kind === kind);
        return matchesKind && (grade.value === 'all' || trophy.grade === grade.value)
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

  listView.addEventListener('click', () => { view = 'list'; render(); });
  roadmapView.addEventListener('click', () => { view = 'roadmap'; render(); });
  for (const button of kindButtons) {
    button.addEventListener('click', () => { kind = button.dataset.kind; render(); });
  }
  grade.addEventListener('change', render);
  search.addEventListener('input', render);
  spoiler.addEventListener('change', render);
  exportButton.addEventListener('click', () => tracker.export());
  importButton.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const file = importFile.files[0];
    if (!file) return;
    try {
      await tracker.import(file);
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
