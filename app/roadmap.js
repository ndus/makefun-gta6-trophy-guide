import { stages } from './stages.js';

const intros = [
  "Play the campaign, but check Actions Speak Louder (#48) before story choices: keep a separate manual save so an outcome remains reachable. This is the flagged missable to plan for now, not during final cleanup. Named mission trophies can be tracked alongside chapter progress.",
  "Finish the Andy, Kenton, Billy, Randy and Tyrone chains, then three more stranger strands for Strangers & Freaks. Count completed storylines, not individual jobs. Record each contact’s last task so you can resume a chain; keep your story-choice save from Stage 1.",
  "Sweep one region at a time, combining meditation spots, WAiNK It locations, cards and vehicle discovery. Track missing cards by set and completed interactions by location. Check Scooter Bros registrations as you go; The Truth Is Out There has no confirmed trigger in the supplied list.",
  "Try each activity type first, then target gold medals, new race wins and unfinished challenges. Plan partner sessions for Hot Together and Retail Therapy: escape four stars for the first, but keep your wanted level between three shop robberies for the second. Neither description proves a one-time window.",
  "Budget for all garages before spending freely toward $100,000. Track laundering income separately from other earnings, and record vault robberies and gang operations as you finish them. Save before Sneakthief attempts: detection fails that attempt, without proving the trophy permanently missable.",
  "Compare the game’s completion record with your unchecked trophies; 100% and the platinum are separate targets. Review cryptic clues without assuming an unverified trigger. If #48 is still locked, return to your preserved story-choice save. Export your checklist before the last cleanup pass."
];

export function renderRoadmap(trophies, hasEarned, renderRow) {
  const roadmap = document.createElement('div');
  roadmap.className = 'roadmap';
  stages.forEach((name, index) => {
    const intro = intros[index];
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
