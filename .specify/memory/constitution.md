<!-- Sync Impact Report
Version change: new → 1.0.0
Added sections: Core Principles (I–V), Commit Discipline, Development Workflow with Skills
Modified principles: none (initial ratification)
Templates updated:
  - .specify/templates/plan-template.md ✅ (Constitution Check aligns with all 5 principles)
  - .specify/templates/spec-template.md ✅ (acceptance scenarios align with TDD + UX principles)
  - .specify/templates/tasks-template.md ✅ (commit checkpoints + test-first task ordering enforced)
Deferred TODOs: none
-->

# BGS Check Export Constitution

## Core Principles

### I. Code Quality & Reusability (NON-NEGOTIABLE)

Every function, component, or module that can serve more than one purpose MUST be extracted
into a shared/reusable unit before it is written a second time. No logic duplication is permitted.

- Shared UI components MUST live in `src/components/shared/` (or project-equivalent)
- Shared utility functions MUST live in `src/utils/` (or project-equivalent)
- Before creating any new function or component, existing shared code MUST be checked first
- Code MUST pass linting and formatting checks before every commit
- Each unit MUST have a single, clearly named responsibility

**Rationale**: Duplication multiplies bugs. A single authoritative implementation means every
fix applies everywhere automatically.

### II. Test-First Development (NON-NEGOTIABLE)

TDD is mandatory. Tests MUST be written and confirmed failing (Red) before any implementation
code is written. The Red → Green → Refactor cycle is strictly enforced.

- Unit tests MUST cover all business logic functions
- Integration tests MUST cover all API endpoints and data flows
- E2E tests MUST cover all critical user journeys (via Playwright MCP)
- No commit may introduce untested business logic
- Business logic test coverage MUST remain ≥ 80%
- The Superpowers plugin MUST be used for systematic TDD and debugging cycles

**Rationale**: Tests define requirements precisely and prevent regressions. Writing tests first
eliminates ambiguity and forces clarity of intent before writing a single line of implementation.

### III. Centralized Business Logic

All domain rules, validation logic, and data transformations MUST reside in a dedicated
service/domain layer. UI components and controllers are strictly forbidden from containing
business rules.

- UI components MUST NOT contain business rules — they call services only
- API controllers/handlers MUST NOT contain business rules — they delegate to services
- One service is the single authoritative source for each domain operation
- Business constants and enumerations MUST be defined once in a shared constants module
- Data transformation for export (the core domain of this project) MUST live in a dedicated
  export service layer

**Rationale**: Scattering logic across layers causes inconsistency and makes testing
exponentially harder. A centralized layer is the only location that needs to change when
a business rule changes.

### IV. User Experience Consistency

All screens and interactions MUST follow a unified design language. Ad-hoc styling and
one-off component variants are prohibited.

- Every UI element MUST come from the shared component library before a new one is created
- Colors, spacing, typography, and iconography MUST use design tokens or theme variables
- Loading, error, and empty states MUST be handled consistently across all views
- Accessibility (WCAG 2.1 AA) MUST be met for all interactive elements
- All forms MUST follow a single validation and error-display pattern
- The Frontend Design plugin MUST be consulted for all new UI component design decisions

**Rationale**: Inconsistent UX erodes user trust and increases support burden. Hospital staff
using this system under time pressure cannot afford to relearn patterns screen by screen.

### V. Performance Requirements

A feature is not complete until it passes these performance gates:

- Initial page load: ≤ 3 seconds on a standard hospital intranet connection
- API response time (p95): ≤ 500ms for read operations; ≤ 1000ms for write operations
- Export operations taking > 2 seconds MUST display a progress indicator
- JavaScript bundle size MUST NOT increase by > 10% per feature without written justification
- All database queries on filtered or sorted columns MUST use indexes

**Rationale**: Hospital staff use this system under operational pressure. Slow performance
directly impacts workflow and, indirectly, patient care quality.

## Commit Discipline

Commits are mandatory checkpoints — not optional courtesies. Uncommitted work is lost work.

- A commit MUST be made after every completed task, subtask, or logical unit of work
- Commit messages MUST follow Conventional Commits: `type(scope): description`
  (e.g., `feat(export): add CSV download`, `fix(auth): correct token expiry check`)
- Uncommitted changes MUST NOT exist when switching tasks or ending a session
- The `/speckit-git-commit` skill MUST be used after each spec-kit command completes
- Force-pushes to `main`/`master` are PROHIBITED
- All feature work MUST occur on a named branch; merges to main require a reviewed PR

**Rationale**: Frequent atomic commits create a granular, recoverable history. This directly
prevents the class of mistake where hours of work are lost to an accidental overwrite or
environment failure.

## Development Workflow with Skills

All development MUST follow the spec-driven workflow using available Claude Code skills and
plugins. Skipping steps in the workflow is a constitution violation.

**Mandatory spec-kit sequence for every new feature**:
`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`

**Skill and plugin usage rules**:
- `/speckit-git-feature` MUST be run before starting any new feature branch
- `/review` (Code Review plugin) MUST be run before merging any feature branch
- **Frontend Design plugin**: MUST be invoked for all new UI component design decisions
- **Ralph Loop** (`/ralph-loop`): USE for long multi-step implementations to run autonomously
- **Playwright MCP**: USE for all E2E and browser automation tests
- **Superpowers plugin**: USE for systematic debugging, TDD cycles, and subagent-driven dev
- `/speckit-analyze` SHOULD be run after `/speckit-tasks` and before `/speckit-implement`
  to validate cross-artifact consistency
- `/speckit-clarify` SHOULD be run for ambiguous requirements before planning

**Rationale**: Skills encode proven development patterns. Consistent use reduces decision
fatigue, enforces quality gates automatically, and produces reproducibly high-quality output.

## Governance

This constitution supersedes all other coding practices, conventions, and verbal agreements
for the BGS Check Export project.

**Amendment procedure**:
- Amendments require: documented rationale, impact assessment on existing specs/plans, and
  an update to this file with a version bump
- MAJOR bump: backward-incompatible governance change or principle removal/redefinition
- MINOR bump: new principle or section added, or material expansion of guidance
- PATCH bump: clarifications, wording fixes, non-semantic refinements
- All team members MUST be notified of MAJOR and MINOR amendments before they take effect

**Compliance**:
- Every implementation plan MUST include a Constitution Check gate (per plan-template.md)
- Violations MUST be justified in the plan's Complexity Tracking table
- Unjustified violations are grounds for PR rejection
- Compliance is reviewed at every code review using the `/review` skill

**Runtime guidance**: See `.specify/` directory for templates, active specs, and plans.

**Version**: 1.0.0 | **Ratified**: 2026-05-14 | **Last Amended**: 2026-05-14
