export const stages = [
  ['Story campaign', 'Follow the main missions and keep a separate manual save before major decisions. Check the missable flags as you go.'],
  ['Strangers & strands', 'Visit the side encounters that appear as the story opens up. Follow each strand to its conclusion while its contacts are still available.'],
  ['Exploration & collectibles', 'Sweep Leonida one area at a time. Tally your finds as you go so you can retrace a route without starting over.'],
  ['Activities & challenges', 'Work through the available activities and check each trophy’s target before spending time on repeat runs.'],
  ['Crime, cash & property', 'Set aside time for jobs, purchases and any online requirements. Check the relevant trophy guides before committing your in-game cash.'],
  ['100% & the platinum', 'Compare your checklist with the in-game progress screen, then clear any remaining requirements to unlock the platinum.'],
];

export function renderRoadmap(trophies, hasEarned, renderRow) {
  const roadmap = document.createElement('div');
  roadmap.className = 'roadmap';
  stages.forEach(([name, intro], index) => {
    const stage = document.createElement('section');
    stage.className = 'stage';
    stage.id = `stage-${index + 1}`;
    stage.innerHTML = `
      <div class="stage-header">
        <span class="stage-number">${String(index + 1).padStart(2, '0')}</span>
        <div><h3 tabindex="-1">${name}</h3><p>${intro}</p></div>
        <span class="stage-count"></span>
      </div>
      <ul class="trophy-list"></ul>`;
    const group = trophies.filter(trophy => trophy.stage === index + 1);
    const earned = group.filter(trophy => hasEarned(trophy.id)).length;
    stage.querySelector('.stage-count').textContent = `${earned} / ${group.length}`;
    stage.querySelector('ul').append(...group.map(renderRow));
    roadmap.append(stage);
  });
  return roadmap;
}
