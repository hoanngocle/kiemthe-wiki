# Apply quest rewards implementation plan

**Goal:** Apply the accepted Wiki reward proposal to the game's 659 configured quest references while preserving existing rewards.

**Architecture:** Export a frozen per-reference proposal using the existing TypeScript calculation. Append one tagged fixed script award per reference using the engine's existing script reward handler. The script grants regular coin, locked silver, doubled energy top-ups, a uniform one-of-seven reputation reward for nonrepeat quests, and bound end-of-chain materials. Preserve original XML bytes outside the first award value. Install identical XML payloads in highest-priority Client/Server packages and keep rollback snapshots.

**Tech stack:** TypeScript, Python XML/literal readers, Lua 5.1-compatible award scripts, PACK.

**Spec:** Accepted reward tiers and seven reputation IDs in lib/quest-wiki.ts; user now requests applying them to game code.

## Constraints

- Preserve every original reward, condition, quest order and step.
- Coin means regular coin; silver remains locked. Energy additions equal twice the previous calculated top-up.
- Repeated quests add no reputation or end-of-chain items. Do not reset progress or pay completed quests retroactively.
- Use engine MathRandom(1,7); reputation IDs: 1/1, 1/2, 2/1, 2/2, 2/3, 5/1, 5/3.
- No process restart without a concrete need; report that running processes must reload after files change.

## Tasks

- [x] Test proposal generation and byte-preserving XML patching; test Lua grant behavior for all seven random outcomes and repeat/zero reward cases.
- [x] Generate tagged fixed awards with bound material stacks; back up sources and package configurations; install synchronized task/sub XML packages.
- [x] Teach Wiki export to distinguish applied bonus awards from original rewards and mark its supplemental rows as configured.
- [x] Verify original awards unchanged, proposal and executable payloads match for every reference, package contents and priority match, Lua scripts compile, and Wiki checks pass.

## Review focus

Unknown reference IDs, duplicate bonus application, mismatched Client/Server definitions, incorrect currency kind, conditional rewards counted as guaranteed, binding and stack quantities, repeated quest farming, engine daily reputation caps. Runtime inventory and daily caps remain engine-enforced; live play cannot be claimed without a real completion.

## Rulings and verification

User additionally approved raising both crystal count and grade: two bound crystals, +1 grade over the original Wiki tier (5–9). Grant scripts use existing Task:GiveAward script handling; no new Lua hook is needed. Each bonus carries versioned metadata so Wiki can separate original and added rewards. 659 references were verified over all seven RNG endpoints (4,613 simulated grants); original XML bytes outside the inserted award are unchanged. Backups and package manifest: .diagnostics/quest-rewards-20261109. Running game processes have not been restarted.

## Revision v2 — user-approved formulas

Supersedes v1 constraints on repeat reputation and energy top-ups: regular coin is (floor(level/10)+1)*500 for every quest; random reputation points are (floor(level/10)+1)*5 for every quest, including repeats. Energy totals are exactly original*15 (original+14*original). Original crystals are replaced at max(5, old grade+2), quantity unchanged; retain the two-crystal final-chain gift. Rebuild from the original v1 baseline, back up the installed v1, and activate v2 PACK first on Client/Server. Native crystal replacements carry original-grade metadata for Wiki comparison.
