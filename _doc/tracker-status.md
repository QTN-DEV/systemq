# Tracker Module — Implementation Status

_Last updated: 2026-04-17_

---

## Hierarchy

```
Product → Initiative → InitiativeProject → Issue → Sub-issue
```

`InitiativeProject` is the execution container (renamed from "project" to avoid collision
with the existing Slack-catalog `Project` model).

---

## What's Done

### Backend (`be/app/submodules/tracker/`)

**Models** — all 7 Beanie documents, fully registered in `be/app/db/beanie.py`:

| Model | Collection |
|---|---|
| `TrackerProduct` | `tracker_products` |
| `TrackerInitiative` | `tracker_initiatives` |
| `InitiativeProject` | `tracker_initiative_projects` |
| `TrackerIssue` | `tracker_issues` |
| `IssueComment` | `tracker_issue_comments` |
| `IssueEvent` | `tracker_issue_events` |
| `TrackerConfig` | `tracker_config` |

**Services** — full CRUD per entity plus business rules:
- `closed_at` auto-set when issue status → `done` or `canceled`
- Self-parent guard on `parent_issue_id`
- Key uniqueness enforced at service layer
- Event emission on status change and assignment change
- Config seeded on startup with default values

**Routes** — 22 endpoints, all under `/tracker/*`, registered in `be/app/api/routes/__init__.py`:

```
GET/POST   /tracker/products
GET/PATCH  /tracker/products/{id}

GET/POST   /tracker/initiatives           ?product_id=
GET/PATCH  /tracker/initiatives/{id}

GET/POST   /tracker/initiative-projects   ?initiative_id=
GET/PATCH  /tracker/initiative-projects/{id}

GET/POST   /tracker/issues                ?initiative_project_id= ?status= ?assignee_id= ?priority=
GET/PATCH  /tracker/issues/{id}
GET/POST   /tracker/issues/{id}/comments
GET        /tracker/issues/{id}/events    (write path only; read route pending)

GET/PUT    /tracker/config/planning-statuses
GET/PUT    /tracker/config/issue-statuses
```

**Config seeded defaults:**
- Planning statuses: `planned | active | halted | done | canceled`
- Issue statuses: `triage | todo | backlog | in_progress | in_review | done | canceled`

---

### Frontend (`fe/src/submodules/tracker/`)

**Types** — `product.ts`, `initiative.ts`, `initiative-project.ts`, `issue.ts`, `comment.ts`, `config.ts`

**API layer** — typed functions using existing `apiClient` (axios, retry, base URL):
- `api/products.ts` — list, get, create, update
- `api/initiatives.ts` — list (filterable by product_id), get, create, update
- `api/initiative-projects.ts` — list (filterable by initiative_id), get, create, update
- `api/issues.ts` — list (filterable), get, create, update, comments CRUD
- `api/config.ts` — get/put planning-statuses, get/put issue-statuses

**Hooks** — React Query wrappers per entity with query invalidation on mutations:
- `useProducts`, `useProduct`, `useCreateProduct`, `useUpdateProduct`
- `useInitiatives`, `useInitiative`, `useCreateInitiative`, `useUpdateInitiative`
- `useInitiativeProjects`, `useInitiativeProject`, `useCreateInitiativeProject`, `useUpdateInitiativeProject`
- `useIssues`, `useIssue`, `useCreateIssue`, `useUpdateIssue`, `useComments`, `useCreateComment`
- `usePlanningStatuses`, `useIssueStatuses`, `useUpdatePlanningStatuses`, `useUpdateIssueStatuses`

**Shared components:**
- `StatusBadge` — color-coded badge per status value
- `PriorityBadge` — color-coded priority label (0=Urgent → 4=No Priority)

**Pages — Phase 1A (list views, create dialogs):**
- `/tracker/products` — `ProductList` — table + create dialog
- `/tracker/initiatives` — `InitiativeList` — table + create dialog, filterable via `?product_id=`
- `/tracker/initiative-projects` — `InitiativeProjectList` — table + create dialog, filterable via `?initiative_id=`
- `/tracker/config` — `TrackerConfigPage` — editable chip lists for both status types

**Registration:**
- All routes added to `fe/src/App.tsx`
- Two menu entries added to `fe/src/config/menuConfig.json`:
  - `Tracker` — all authenticated roles → `/tracker/products`
  - `Tracker Config` — admin/ceo/internalops only → `/tracker/config`

---

## Known Gaps / Not Yet Built

### Backend

| Item | Notes |
|---|---|
| `GET /tracker/issues/{id}/events` read route | `IssueEvent` write path exists; read endpoint not wired |
| Status validation against config | Services accept any `str`; should validate against `TrackerConfig.values` at write time |
| Soft delete endpoints | `archived_at` field exists on all models; no `DELETE` or archive route yet |
| Auth enforcement | Routes have no `Depends(get_current_user)` — consistent with rest of app but worth hardening |

### Frontend — Phase 1B (detail views)

| Page | Route | Notes |
|---|---|---|
| `ProductDetail` | `/tracker/products/:id` | Initiatives list + progress |
| `InitiativeDetail` | `/tracker/initiatives/:id` | Projects list + issue summary |
| `InitiativeProjectDetail` | `/tracker/initiative-projects/:id` | Issue list with filters + create |
| `IssueDetail` | `/tracker/issues/:id` | Full issue view, TipTap description, comments, event history |

### Frontend — Phase 1C (dashboard views, deferred)

| Page | Route | Notes |
|---|---|---|
| `LeadershipDashboard` | `/tracker/leadership` | Product-first summary cards with progress |
| `TriageInbox` | `/tracker/triage` | Issues filtered by `status=triage`, quick-action toolbar |
| `MyTasks` | `/tracker/my-tasks` | Issues assigned to current user, grouped by status |

### Out of Scope (Post-MVP)

- Issue dependency/blocker graph
- Notifications and reminders
- Labels and custom fields
- Estimates
- Burndown / velocity reporting
- Slack/email integrations
- Advanced access control
- Full-text search across descriptions

---

## Suggested Next Steps

1. **Add `GET /tracker/issues/{id}/events`** read endpoint — one-liner route + service query
2. **Wire status validation** in issue/planning services — fetch allowed values from `TrackerConfig` before write
3. **Build Phase 1B detail pages** — start with `InitiativeProjectDetail` (most day-to-day useful), then `IssueDetail`
4. **`IssueDetail`** — reuse TipTap editor (`fe/src/components/modules/DocumentEditor/TipTapEditor.tsx`) for description field
5. **Build `TriageInbox`** — filtered issue list with quick-action buttons (assign, move to project, close)
6. **Build `MyTasks`** — issues assigned to `authStore.user.id`, grouped by status
