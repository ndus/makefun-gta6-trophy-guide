const Roadmap = {
  render(host, trophies, titleFor, select) {
    const make = (tag, text, className) => {
      const element = document.createElement(tag);
      if (text) element.textContent = text;
      if (className) element.className = className;
      return element;
    };
    const title = make('h2', 'The platinum roadmap');
    title.id = 'roadmap-title';
    const summary = make('div', '', 'path-summary');
    for (const [grade, count] of Object.entries(Tracker.counts(trophies).grades)) {
      summary.append(make('span', count.total + ' ' + grade, 'badge ' + grade));
    }
    const grid = make('div', '', 'stage-grid');
    for (const stage of Stages) {
      const card = make('article', '', 'stage');
      const group = trophies.filter(trophy => trophy.stage === stage.id);
      const done = group.filter(trophy => Tracker.earned.has(trophy.id)).length;
      card.append(
        make('p', 'Stage ' + stage.id + ' · ' + done + '/' + group.length + ' earned', 'eyebrow'),
        make('h3', stage.title),
        make('p', stage.note, 'stage-note')
      );
      const list = make('ul');
      for (const trophy of group) {
        const item = make('li');
        const link = make('button', titleFor(trophy), 'stage-link');
        link.type = 'button';
        link.addEventListener('click', () => select(trophy.id));
        item.append(link);
        if (trophy.missable) item.append(make('span', 'Missable', 'risk'));
        list.append(item);
      }
      card.append(list);
      grid.append(card);
    }
    host.replaceChildren(title, summary, grid);
  }
};
