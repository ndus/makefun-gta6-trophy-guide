import { stages } from './stages.js';

const intros = [
  'Track the named mission trophies as you clear Chapters 1–4 and the finale. Before major story choices, keep a separate save if possible for Actions Speak Louder (#48). Its description points to choices without identifying the decision or outcome that counts.',
  'Follow Andy, Kenton, Billy, Randy and Tyrone through their final missions. Keep a separate count of completed stranger strands for Strangers & Freaks. It requires eight, and the description does not identify which strands qualify.',
  'Bundle exploration with meditation and WAiNK It stops. Log 100 WAiNK It locations, three complete card sets, 100 vehicle discoveries and ten Scooter Bros registrations as separate goals. Finding a meditation spot is a reminder to meditate there before moving on.',
  'Try each activity type once, then track shooting range golds, drone race wins by location, 20 distinct race wins, 250 stunts and 50 completed challenges separately. For the two partner trophies, track the four-star escape and the three-shop streak as separate runs with opposite wanted-level goals.',
  'Keep separate totals for $100,000 in shop spending, $250,000 earned by laundering Marked Bills, and garage purchases. Count bank vault and armored truck robberies after the escape. Track gang operations by owner and check the jewelry store attempt for detection.',
  'Track 100% completion and the platinum as separate milestones. Use the unchecked trophies to guide cleanup, and keep clues with unspecified triggers open until the corresponding trophy unlocks.',
];

function buildStage(name, index, trophies, hasEarned, renderRow) {
  const stage = document.createElement('section');
  stage.className = 'stage';
  stage.id = `stage-${index + 1}`;
  stage.innerHTML = `
    <div class="stage-header">
      <span class="stage-number"></span>
      <div><h3 tabindex="-1"></h3><p></p></div>
      <span class="stage-count"></span>
    </div>
    <ul class="trophy-list"></ul>`;

  stage.querySelector('.stage-number').textContent = String(index + 1).padStart(2, '0');
  stage.querySelector('h3').textContent = name;
  stage.querySelector('p').textContent = intros[index];
  const earned = trophies.filter(trophy => hasEarned(trophy.id)).length;
  stage.querySelector('.stage-count').textContent = `${earned} / ${trophies.length}`;
  stage.querySelector('ul').append(...trophies.map(renderRow));
  return stage;
}

export function renderRoadmap(trophies, hasEarned, renderRow) {
  const roadmap = document.createElement('div');
  roadmap.className = 'roadmap';
  const groups = stages.map(() => []);
  for (const trophy of trophies) groups[trophy.stage - 1]?.push(trophy);

  roadmap.append(...stages.map((name, index) =>
    buildStage(name, index, groups[index], hasEarned, renderRow)));
  return roadmap;
}
