[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/ndus/makefun-gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/ndus/makefun-gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# Leonida Platinum

Leonida Platinum is an offline trophy guide and progress tracker for all 55 Grand Theft Auto VI trophies on PlayStation 5.

## Features

- Search the checklist and filter by kind or grade.
- Follow the platinum roadmap and spot trophies flagged as potentially missable.
- Turn on the spoiler shield to hide details until you’re ready.
- Save progress in your browser, export a backup, and import it on another browser.

## Run locally

From the repository root, run `node serve.ts` and open <http://localhost:8080>. You can also use any static server rooted at `app/`.

## Trophy data

Trophy names, descriptions, and grades match the official list supplied in the kit starter (2026-11-18). The guides are original planning advice based on that list. When a description leaves the unlock trigger unclear, the guide marks it as uncertain. Trophy #48, Actions Speak Louder, is conservatively flagged as missable because its description refers to choices and leaves their consequences unclear.

## Prepare the make.fun hand-in

Run these commands from the repository root to capture the screenshots and build `out/dossier.json`.

```sh
node scripts/take-screenshots.mjs
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
