# Boleiros data model

## Current release: `sa-2026.2`

- 20 Série A clubs
- 20 Série B clubs
- 20 Série C clubs
- 96 Série D clubs in the official 16 regional groups
- Série A and Série B registered-player names from the CBF 2026 competition pages
- Top-flight club universes for Argentina, Uruguay, Paraguay, Colombia, Chile, Ecuador, Peru, Bolivia and Venezuela
- Club strengths and all player ratings are original Boleiros values

Club and registration snapshot date: 2026-06-25.

The `scripts/update-cbf-rosters.mjs` script rebuilds `cbf-rosters-2026.js` from the CBF competition pages. It aborts instead of writing a release when fewer than 40 club pages are parsed. The generated change must be reviewed before it is committed.

## Next data releases

1. Add registered squads for Série C and Série D.
2. Add positions, dates of birth, preferred foot and contract status from verifiable sources.
3. Add Argentina, Uruguay, Paraguay, Colombia, Chile, Ecuador, Peru, Bolivia and Venezuela top divisions.
4. Add transfer-window updates without resetting compatible career saves.

## Product rules

- Never copy ratings from another football game.
- Never invent a real player's club assignment when a source is unavailable.
- Keep factual roster data separate from the simulation engine.
- Version every database change and migrate saves deliberately.
