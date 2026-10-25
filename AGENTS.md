# Project rules

- Never commit changes without an explicit request.
- Follow Conventional Commits: `<type>(<optional scope>): <description>` (for example, `fix(volley-clash): avoid unreachable blocks`).
- Run tests appropriate to the change before reporting completion.
- Keep comments for reasoning that code cannot express. Avoid type casts unless alternatives fail.
- Keep games independently embeddable, entirely playable on the client, and compatible with the portal's static build.

## Game work

Before adding or changing a game, read [the game design standard](docs/game-design.md). Design for sustained play: a skilled player should have worthwhile decisions and changing challenges through a 15–30 minute session. Use linked rounds, expanding mechanics, varied stages, and earned tactical boosts. Keep new content easy to add through game-owned data and mechanics.

Verify the opening, later stages, losses, retries, and saved progression. A short match needs a longer run or series around it. Increasing enemy health or repeating the opening at a higher speed does not satisfy the long-play requirement.
