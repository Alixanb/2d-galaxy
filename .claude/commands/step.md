Implement the next step in Plan.md.

## Process

1. **Find the step**: Read `.claude/plan_state.json`. Find the entry with the lowest `n` where `status === "pending"`.
2. **Read the spec**: In `.claude/Plan.md`, find `### Step N` for that number. Extract **Files**, **What**, and **Test**.
3. **Implement**: Edit only the listed files. Total delta ≤ 80 lines. No comments, no `any`, no abstractions beyond what the step requires.
4. **Report**: One sentence what changed visually.
5. **Type-check**: Run `npx tsc --noEmit`. Fix all errors before continuing.
6. **Verify**: Use chrome-devtools to navigate to `http://localhost:5174` and take a screenshot. Confirm the **Test** criterion is met visually. If the dev server is not running, stop and say so.
7. **Commit**: Stage only `src/` files. Never stage `.claude/`. Commit format: `feat: step N <title>`, backdated 3 h with `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE`. Push to `origin main:master`.
8. **Mark done**: In `.claude/plan_state.json`, set the completed step's `status` to `"done"`.
9. **Don't** Use chrome devtools MCP

Do not start the next step.
