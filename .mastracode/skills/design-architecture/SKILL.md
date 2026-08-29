---
name: design-architecture
description: Produce the smallest safe implementation plan and decision record for an approved Factory work item.
---

# Design Architecture

Inspect the refined requirements and repository evidence. Create a small plan covering files, interfaces, data changes, rollback, tests and security implications. Mark assumptions explicitly. Do not edit files, create commits, deploy or invoke OpenHands.

When the plan is ready, request the Factory transition to `execute` exactly once. If approval is required, rely on the persisted Factory approval queue and stop. Never invent an approval or a WAITING state.
