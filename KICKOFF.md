# Kickoff prompts — paste these into Claude Code in VS Code

Before pasting, switch the main session to Opus by typing `/model` in the Claude Code panel and picking Opus. The main session is the Manager.

---

## Prompt 1 — start the build (paste once)

```
You are the Manager for MakanLens. Read CLAUDE.md fully, and look at the agents in .claude/agents/. Then run the plan in CLAUDE.md section 1, phase by phase.

Phase 0 (do this yourself):
- Scaffold Next.js (App Router, TypeScript, Tailwind, ESLint) in this folder. If create-next-app refuses because the folder isn't empty, scaffold into ./_app, move everything up into the root, and delete ./_app. Keep CLAUDE.md, KICKOFF.md, .env.example and .claude/.
- Install fuse.js, zod, html5-qrcode, and vitest as a dev dependency. Add an "npm test" script that runs vitest.
- Write lib/types.ts exactly as in CLAUDE.md section 4. Create stub files for every path the workers own, so imports resolve.
- Make sure .gitignore covers .env* but not .env.example. Create PROGRESS.md. Run git init and make the first commit.

Phase 1: spawn frontend-builder, api-builder and data-curator IN PARALLEL in one message. Give each a complete, self-contained brief: goal, exact files, acceptance criteria, report format.

Then continue through Phases 2–6 without waiting for me, except when you need an API key or a decision only I can make. After each phase: verify with npm run build (or the qa-tester), update PROGRESS.md and commit. If time runs short, follow the cut list in CLAUDE.md section 8 and never cut the core loop.

When Phase 6 is done, give me a short summary: what works, what doesn't, how to run it, and what to test on my phone.
```

---

## Prompt 2 — when it asks for the API key

1. Get a free key from Google AI Studio (aistudio.google.com → Get API key).
2. Create `.env.local` in the project root yourself (don't paste the key into the chat), by copying `.env.example` and filling in `GEMINI_API_KEY`.
3. Set `GEMINI_MODEL` to the current Flash model name shown in AI Studio.
4. Tell Claude: `Key is in .env.local — continue.`

To use your Claude Console credits instead, set `VISION_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` (from console.anthropic.com → API keys).

---

## Prompt 3 — if something breaks or you want a status

```
Status check: read PROGRESS.md and docs/qa-report.md, run the qa-tester, then fix the failures by delegating to the owning agents in parallel. Report what changed.
```

---

## Prompt 4 — optional stretch (only once the acceptance criteria pass)

```
Run Phase 7 from CLAUDE.md: weight log + adaptive target, with seeded demo data. Don't break anything that already passes; run the qa-tester after.
```

---

## Test it on your phone

- Run `npm run dev`, and open the "Network" URL it prints (e.g. http://192.168.x.x:3000) on a phone on the same Wi-Fi.
- Photo upload works over that address. The live barcode camera needs HTTPS, so test it on localhost or after deploying to Vercel. Manual barcode entry works anywhere.
