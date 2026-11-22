# Taste

## Workflow & environment

- Confine all work to the project directory: do not read or modify files outside the workspace (e.g. `~/.nvm/alias/default` or other global toolchain config). Get version/tooling info by running commands inside the project instead. Confidence: 0.85
- Wants least-privilege platform permissions: request only the minimum permissions required (and restrict broader access, e.g. host permissions) rather than granting everything up front. Confidence: 0.6
- Never bypass platform access controls (login walls, private accounts, authentication): surface the restriction gracefully instead of attempting workarounds. Confidence: 0.7
- Wants honest capability reporting: only present something as available/downloadable when it genuinely is, and explicitly report unavailable cases instead of assuming or fabricating support. Confidence: 0.55
