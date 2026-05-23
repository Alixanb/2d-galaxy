Generate a machine-readable handoff document for the next Claude instance.

1. Read `.claude/plan_state.json` find the first `status: "pending"` step.
2. Run `git status --short` and `git log --oneline -5`.
3. Write `.claude/handoff.json` with these exact fields:
   ```json
   {
     "generated_at": "<ISO timestamp>",
     "current_step": <n>,
     "step_title": "<title>",
     "step_status": "pending | in_progress | blocked",
     "uncommitted_changes": "<git status --short output>",
     "files_modified": ["list of files touched this session"],
     "decisions_made": ["any non-obvious choices made this session"],
     "blockers": ["any issues or errors encountered"],
     "next_action": "<exact one-sentence instruction for the next instance>"
   }
   ```
4. Output one line: `Handoff saved → step N: <title>.`
