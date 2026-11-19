[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/ndus/makefun-gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/ndus/makefun-gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# GTA VI Trophy Guide

An offline guide and progress tracker for all 55 GTA VI trophies on PlayStation 5. Check off trophies as you earn them and pick up where you left off with progress saved in your browser. Export your progress for backup and import it to resume on another browser.

Search the checklist, filter by kind or grade, and look for missable flags when planning a playthrough. Follow the platinum roadmap to plan your route, and turn on the spoiler shield to hide details until you're ready to see them.

Trophy names, descriptions and grades match the official list supplied in the kit starter (2026-11-18). Every guide is original planning advice inferred from that list, with its source identified in the detail panel. Exact triggers not established by the list are explicitly marked as uncertain. The choice-driven #48 is conservatively flagged missable; other descriptions do not establish permanent lockouts. Partner trophies are not assumed to require online play.

Run `node serve.ts` from the repository root and open <http://localhost:8080>. You can also use any static file server rooted at `app/`.

To prepare the make.fun hand-in, run `node scripts/take-screenshots.mjs` from the repository root to capture the four scenes in `shots.json`. Then stage the app and captures and build the dossier.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
