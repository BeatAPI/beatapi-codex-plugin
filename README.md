# BeatAPI Codex Plugin

Codex distribution bundle for BeatAPI's AI video workflow Skill.

## Package contents

- `.codex-plugin/plugin.json`: plugin metadata and Codex presentation
- `skills/beatapi-video/`: generated copy of the canonical standalone Skill
- `assets/`: reserved for reviewed marketplace artwork

The canonical Skill lives at `../beatapi-video`. Do not edit the bundled copy
directly. Synchronize it from the toolkit root:

```bash
./scripts/sync-plugin-skill.sh
```

This package currently provides instructions through a Skill. A remote MCP
server can be added later if the plugin needs authenticated first-class tools,
OAuth, account connection UI, or server-managed actions.

This local folder is not automatically listed in the Codex desktop plugin
marketplace. Installation, publishing, review, and catalog inclusion are
separate steps.

