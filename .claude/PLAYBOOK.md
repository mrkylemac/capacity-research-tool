# Claude Code Playbook

How we work with Claude Code on **sauna-session-stats**. This is the *process* guide — for *what* the code is and how it's organised, see [`CLAUDE.md`](../CLAUDE.md).

---

## Core rule

**A good plan is everything.** The better the brief, the fewer revisions. Treat Claude as a teammate, not a chat window — every non-trivial session starts in plan mode.

---

## The workflow

1. **Enter plan mode** (`Shift+Tab` twice). No edits happen until you approve.
2. **State the goal in one sentence.** "Add X so that Y." Include the *why*.
3. **Let Claude explore & break it down.** Expect clarifying questions — answer them.
4. **Review & iterate the plan.** Push back. Rewrite. Plans are cheap; code is not.
5. **Approve → switch to auto-accept edits** (`Shift+Tab` once more).
6. **Review the output.** Read the diff. Verify in the browser preview. Run tests.

---

## Briefing principles

- **Be specific.** "Fix the chart" → bad. "`DemandIntelligence.tsx` renders zeros on Tuesdays — see screenshot — fix the data pipeline, not the chart" → good.
- **State the why.** Constraints and motivation let Claude make judgement calls on edge cases.
- **Name files and paths.** Links like `src/lib/trybeClient.ts:42` collapse a minute of searching to zero.
- **Flag constraints upfront.** Budget, deadlines, out-of-scope areas, files not to touch.
- **Say when to stop.** "Just the types, don't touch the components yet" beats having to roll back.

---

## Tool usage

- **Subagents** — spawn `Explore` for research sweeps, `Plan` for architectural design, `general-purpose` for parallel grunt work. Protects main context. Cap at ~3 in parallel, each with a tight self-contained brief.
- **Skills** — reusable instruction packs. Drop recurring workflows (repo rituals, boilerplate patterns) in `.claude/skills/SKILL-NAME/SKILL.md`. Claude auto-loads them when relevant.
- **Memory** — persistent across sessions, lives at `~/.claude/projects/…/memory/`. Already captures design system, platform integrations, and file maps. Update when architecture shifts.
- **MCP servers** — Notion, Figma, Google Sheets, Gmail, Granola, Vercel, Preview Browser — all wired. Reach for them before scraping or screenshotting.

---

## Do

- ✅ Start in plan mode for anything beyond a typo.
- ✅ Use Opus for planning & design; Haiku for routine edits and summaries.
- ✅ Keep `CLAUDE.md` current when architecture shifts — stale context misguides every future session.
- ✅ Verify UI changes in the preview browser (`preview_*` tools), not by eye on a diff.
- ✅ Run `yarn test` and `yarn lint` before declaring done.
- ✅ Commit in focused, reviewable chunks — one logical change per commit.
- ✅ Use parallel sessions for independent workstreams (e.g. venue polling + tracker work).

---

## Don't

- ❌ Skip plan mode on ambiguous work — one wrong assumption spreads across the codebase fast.
- ❌ Treat Claude like ChatGPT — don't copy-paste prompts into a chat window and paste back. Claude works across your files.
- ❌ Let agents sprawl. More agents ≠ better output. Tight brief, clear scope.
- ❌ Hand-edit `src/components/ui/` — shadcn-generated; regenerate via CLI.
- ❌ Bypass the `predev` cache-sync hook or commit without checking the venue cache diff.
- ❌ Claim "done" without verification. Types passing ≠ feature working.
- ❌ Work in isolation on this playbook — if a rule breaks, update the file.

---

## When things go sideways

- **Context drifting?** Re-enter plan mode and ask for a summary of the current state before continuing.
- **Lost track of changes?** Ask for a diff summary (`git status` + `git diff`) and a short plain-English walk-through.
- **Session polluted?** Start a fresh one. Memory + `CLAUDE.md` will carry the important state across.

---

*Last reviewed: 2026-04-20. Revise when the workflow changes.*
