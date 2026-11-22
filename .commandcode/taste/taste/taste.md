# Taste
- Confine all work to the project directory: do not read or modify files outside the workspace (e.g. `~/.nvm/alias/default` or other global toolchain config). Get version/tooling info by running commands inside the project instead. Confidence: 0.85
- Wants least-privilege platform permissions: request only the minimum permissions required (and restrict broader access, e.g. host permissions) rather than granting everything up front. Confidence: 0.6
- Never bypass platform access controls (login walls, private accounts, authentication, download restrictions, anti-bot/security systems): surface the restriction gracefully instead of attempting workarounds. Confidence: 0.8
- Wants bounded resource usage: never fire unlimited concurrent requests; cap concurrency and respect browser resource and platform rate limits. Confidence: 0.6
- Wants honest capability reporting: only present something as available/downloadable when it genuinely is, and explicitly report unavailable cases (with a clear user-facing message) instead of assuming or fabricating support. Confidence: 0.7
- Wants platform-specific logic isolated per platform (its own adapter module) and kept separate from other platforms and shared/generic code. Confidence: 0.6
