# Tracker Module — Gap Analysis & Implementation Plan

## Revised Hierarchy

The new hierarchy adds **Product** as the top-level planning layer above Initiative, and
renames the former "project" execution container to **InitiativeProject** to avoid a naming
conflict with the existing `Project` model used by the Slack standup system.

```
Product
  └── Initiative (belongs to one Product)
        └── InitiativeProject (belongs to one Initiative; formerly "project")
              └── Issue
                    └── Sub-issue (issue with parent_issue_id set)
```

### Why InitiativeProject

The existing codebase has:
- `be/app/models/project.py` → `class Project(Document)` — Slack project catalog
- `be/app/schemas/project.py` → `class Project(ProjectBase)` — API schema
- `fe/src/types/project-type.ts` → `interface Project` — frontend type

These are used by the standup parser, project mapping, and workload tracking features.
Reusing the name "project" for the tracker execution container would cause import collisions
and conceptual confusion across both layers. **InitiativeProject** is distinct, unambiguous, and
accurately describes an execution-scoped container.

---

## Gap Analysis

### What Already Exists

| Existing Asset | Location | Relevance |
|---|---|---|
| `User` (Beanie document) | `be/app/models/user.py` | Reuse as assignee, owner, reporter |
| `Project` (Beanie document) | `be/app/models/project.py` | **Different concept** — Slack catalog, do not touch |
| `SessionToken` auth | `be/app/api/routes/auth.py` | Reuse for request auth |
| `PositionLiteral` roles | `be/app/models/enums.py` | Reuse to drive role-based views |
| shadcn/ui component library | `fe/src/components/ui/` | Reuse for all tracker UI |
| TipTap editor module | `fe/src/components/modules/DocumentEditor/` | Reuse for issue description editing |
| React Query + Zustand | `fe/package.json` | Reuse for tracker data fetching and auth |
| DashboardLayout | `fe/src/components/layouts/DashboardLayout.tsx` | Reuse for all tracker pages |
| Navigation + Sidebar | `fe/src/components/` | Extend with tracker links |

### What Is Missing — Backend

| Gap | Notes |
|---|---|
| `Product` model + CRUD | New Beanie document, `products` collection |
| `Initiative` model + CRUD | New Beanie document, `tracker_initiatives` collection |
| `InitiativeProject` model + CRUD | New Beanie document, `initiative_projects` collection |
| `Issue` model + CRUD | New Beanie document, `tracker_issues` collection |
| `IssueComment` model + CRUD | New Beanie document, `tracker_issue_comments` collection |
| `IssueEvent` model (audit log) | New Beanie document, `tracker_issue_events` collection |
| Role-based dashboard endpoints | Leadership, owner, contributor, triage views |
| Triage inbox endpoint | Filter issues by status=triage |
| Progress aggregation | Derived from issue counts, no stored field |
| Submodule registration | Register new models in `be/app/db/beanie.py` |
| Route registration | Mount tracker routes in `be/app/api/__init__.py` |

### What Is Missing — Frontend

| Gap | Notes |
|---|---|
| Tracker type definitions | Product, Initiative, InitiativeProject, Issue, Comment |
| API client layer | Typed axios calls for each entity |
| React Query hooks | Per-entity query and mutation hooks |
| Page: Leadership Dashboard | Initiative-first summary view |
| Page: Product List + Detail | Top-level planning view |
| Page: Initiative List + Detail | Mid-level planning view |
| Page: InitiativeProject List + Detail | Execution view with issue list |
| Page: Triage Inbox | Intake queue with quick actions |
| Page: My Tasks | Contributor personal view |
| Page: Issue Detail | Full issue view with comments, events |
| Issue status workflow UI | Status transitions with validation |
| Submodule directory scaffold | `fe/src/submodules/tracker/` |
| Navigation entries | Add tracker links to sidebar |
| Route registration | Add tracker routes in `fe/src/App.tsx` |

### What Is Out of Scope (MVP)

Confirmed non-goals carried from proposal:
- Multiple initiatives per initiative_project
- Issue dependencies and blockers
- Custom fields or labels
- Estimates
- Notifications
- Slack/email integrations
- Advanced reporting
- Burndown or velocity charts
- Audit-grade event compliance
- Full-text search across long bodies

---

## Naming Conflict Resolution

### Existing `Project` — No Changes

The existing `Project` class and all related files are untouched:
- `be/app/models/project.py`
- `be/app/schemas/project.py`
- `be/app/services/project.py`
- `be/app/api/routes/projects.py`
- `fe/src/types/project-type.ts`

These continue to serve the Slack standup and workload tracking features.

### New `InitiativeProject` — Tracker Execution Container

All tracker-module references to the "project" concept from the proposal use `InitiativeProject`
in code. API paths use `/initiative_projects`. MongoDB collection is `initiative_projects`.

---

## Module Structure

Both modules live under their respective `submodules/` directories as self-contained
feature modules. They import from the shared application layer but own all tracker-specific
code internally.

### Backend: `be/app/submodules/tracker/`

```
be/app/submodules/
└── tracker/
    ├── __init__.py
    ├── models/
    │   ├── __init__.py
    │   ├── product.py          # Product document → collection: products
    │   ├── initiative.py       # Initiative document → collection: tracker_initiatives
    │   ├── initiative_project.py       # InitiativeProject document → collection: initiative_projects
    │   ├── issue.py            # Issue document → collection: tracker_issues
    │   ├── comment.py          # IssueComment document → collection: tracker_issue_comments
    │   └── event.py            # IssueEvent document → collection: tracker_issue_events
    ├── schemas/
    │   ├── __init__.py
    │   ├── product.py
    │   ├── initiative.py
    │   ├── initiative_project.py
    │   ├── issue.py
    │   └── comment.py
    ├── services/
    │   ├── __init__.py
    │   ├── product.py
    │   ├── initiative.py
    │   ├── initiative_project.py
    │   ├── issue.py
    │   ├── comment.py
    │   └── dashboard.py        # Aggregations for role-based views
    └── routes/
        ├── __init__.py         # Exports tracker_router
        ├── products.py
        ├── initiatives.py
        ├── initiative_projects.py
        ├── issues.py
        ├── comments.py
        └── dashboard.py
```

### Frontend: `fe/src/submodules/tracker/`

```
fe/src/submodules/
└── tracker/
    ├── types/
    │   ├── product.ts
    │   ├── initiative.ts
    │   ├── initiative_project.ts
    │   ├── issue.ts
    │   └── comment.ts
    ├── api/
    │   ├── products.ts
    │   ├── initiatives.ts
    │   ├── initiative_projects.ts
    │   ├── issues.ts
    │   └── dashboard.ts
    ├── hooks/
    │   ├── useProducts.ts
    │   ├── useInitiatives.ts
    │   ├── useInitiativeProjects.ts
    │   ├── useIssues.ts
    │   └── useDashboard.ts
    ├── components/
    │   ├── ProductCard.tsx
    │   ├── InitiativeCard.tsx
    │   ├── InitiativeProjectCard.tsx
    │   ├── IssueRow.tsx
    │   ├── IssueDetail.tsx
    │   ├── IssueStatusBadge.tsx
    │   ├── PriorityBadge.tsx
    │   ├── ProgressBar.tsx
    │   ├── TriageActionBar.tsx
    │   └── CommentThread.tsx
    └── pages/
        ├── leadership/
        │   └── LeadershipDashboard.tsx
        ├── products/
        │   ├── ProductList.tsx
        │   └── ProductDetail.tsx
        ├── initiatives/
        │   ├── InitiativeList.tsx
        │   └── InitiativeDetail.tsx
        ├── initiative_projects/
        │   ├── InitiativeProjectList.tsx
        │   └── InitiativeProjectDetail.tsx
        ├── issues/
        │   └── IssueDetail.tsx
        ├── triage/
        │   └── TriageInbox.tsx
        └── my-tasks/
            └── MyTasks.tsx
```

---

## Data Model (MongoDB / Beanie)

The proposal's SQL schema is adapted for Beanie ODM. References use `PydanticObjectId`
instead of UUID foreign keys. Enums are Python `Literal` types with application-level
validation (consistent with existing `enums.py` pattern).

### `Product`

Collection: `products`

```python
class Product(Document):
    key: str                          # human-readable short id, unique
    name: str
    description: str | None = None
    status: ProductStatus = "active"  # planned | active | done | canceled
    owner_id: PydanticObjectId | None = None   # -> users._id
    target_date: date | None = None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None

    class Settings:
        name = "products"
        indexes = ["key", "status", "owner_id"]
```

### `Initiative`

Collection: `tracker_initiatives`

```python
class Initiative(Document):
    product_id: PydanticObjectId          # -> products._id (required)
    key: str
    name: str
    description: str | None = None
    status: InitiativeStatus = "planned"  # planned | active | done | canceled
    owner_id: PydanticObjectId | None = None
    target_date: date | None = None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None

    class Settings:
        name = "tracker_initiatives"
        indexes = ["product_id", "key", "status", "owner_id"]
```

### `InitiativeProject`

Collection: `initiative_projects`

```python
class InitiativeProject(Document):
    initiative_id: PydanticObjectId        # -> tracker_initiatives._id (required)
    key: str
    name: str
    description: str | None = None
    status: InitiativeProjectStatus = "planned"   # planned | active | done | canceled
    owner_id: PydanticObjectId | None = None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None

    class Settings:
        name = "initiative_projects"
        indexes = ["initiative_id", "key", "status", "owner_id"]
```

### `Issue`

Collection: `tracker_issues`

```python
class Issue(Document):
    initiative_project_id: PydanticObjectId | None = None  # nullable during triage
    parent_issue_id: PydanticObjectId | None = None
    title: str
    description: str | None = None          # HTML via TipTap
    status: IssueStatus = "triage"          # triage | backlog | in_progress | done | canceled
    priority: int = 3                       # 0 (urgent) → 4 (no priority)
    assignee_id: PydanticObjectId | None = None
    reporter_id: PydanticObjectId | None = None
    triage_owner_id: PydanticObjectId | None = None
    source: IssueSource = "manual"          # manual | triage | import
    issue_type: IssueType = "task"          # task | bug | feature
    resolution: IssueResolution | None = None
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None = None
    archived_at: datetime | None = None

    class Settings:
        name = "tracker_issues"
        indexes = [
            "initiative_project_id", "parent_issue_id", "assignee_id",
            "status", "priority", ("created_at", -1)
        ]
```

### `IssueComment`

Collection: `tracker_issue_comments`

```python
class IssueComment(Document):
    issue_id: PydanticObjectId
    author_id: PydanticObjectId
    body: str
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    class Settings:
        name = "tracker_issue_comments"
        indexes = ["issue_id"]
```

### `IssueEvent`

Collection: `tracker_issue_events`

```python
class IssueEvent(Document):
    issue_id: PydanticObjectId
    actor_id: PydanticObjectId | None = None
    event_type: str              # status_changed | assigned | created | commented | ...
    payload: dict = {}
    created_at: datetime

    class Settings:
        name = "tracker_issue_events"
        indexes = ["issue_id", ("created_at", -1)]
```

### Enums / Literals

```python
ProductStatus = Literal["planned", "active", "done", "canceled"]
InitiativeStatus = Literal["planned", "active", "done", "canceled"]
InitiativeProjectStatus = Literal["planned", "active", "done", "canceled"]
IssueStatus = Literal["triage", "backlog", "in_progress", "done", "canceled"]
IssueType = Literal["task", "bug", "feature"]
IssueSource = Literal["manual", "triage", "import"]
IssueResolution = Literal["done", "duplicate", "wont_fix", "irrelevant"]
```

---

## Business Rules

Enforced in services, not at the database layer (consistent with existing pattern):

1. Every initiative must belong to exactly one product.
2. Every initiative_project must belong to exactly one initiative.
3. An issue may have no initiative_project while status is `triage`.
4. A sub-issue is an issue with `parent_issue_id` set. Only one level deep in MVP.
5. Setting `status` to `done` or `canceled` must also set `closed_at`.
6. Moving an issue from `triage` to `backlog` requires `initiative_project_id` to be set.
7. Progress is always derived from issue counts; no stored progress field.
8. Priority must be in range 0–4.

---

## API Surface

All routes are prefixed under `/tracker` to avoid collision with the existing `/projects` routes.

### Products

```
GET    /tracker/products
POST   /tracker/products
GET    /tracker/products/:id
PATCH  /tracker/products/:id
```

### Initiatives

```
GET    /tracker/initiatives                        (filterable by product_id)
POST   /tracker/initiatives
GET    /tracker/initiatives/:id
PATCH  /tracker/initiatives/:id
```

### InitiativeProjects

```
GET    /tracker/initiative_projects                        (filterable by initiative_id)
POST   /tracker/initiative_projects
GET    /tracker/initiative_projects/:id
PATCH  /tracker/initiative_projects/:id
```

### Issues

```
GET    /tracker/issues                             (filterable by initiative_project_id, status, assignee_id, priority)
POST   /tracker/issues
GET    /tracker/issues/:id
PATCH  /tracker/issues/:id
GET    /tracker/issues/:id/comments
POST   /tracker/issues/:id/comments
GET    /tracker/issues/:id/events
```

### Dashboard / Views

```
GET    /tracker/dashboard/leadership               (products → initiatives → initiative_project counts → issue counts)
GET    /tracker/dashboard/owner?user_id=:id        (initiative_projects owned by user, high-priority issues)
GET    /tracker/dashboard/my-work?assignee_id=:id  (issues assigned to user, grouped by status)
GET    /tracker/triage                             (all issues with status=triage)
```

---

## Frontend Routes

Registered in `fe/src/App.tsx` under `/tracker` prefix:

```
/tracker                         → LeadershipDashboard (redirect or role-based)
/tracker/products                → ProductList
/tracker/products/:id            → ProductDetail
/tracker/initiatives             → InitiativeList
/tracker/initiatives/:id         → InitiativeDetail
/tracker/initiative_projects             → InitiativeProjectList
/tracker/initiative_projects/:id         → InitiativeProjectDetail
/tracker/issues/:id              → IssueDetail
/tracker/triage                  → TriageInbox
/tracker/my-tasks                → MyTasks
/tracker/leadership              → LeadershipDashboard
```

---

## Integration Points with Existing App

### Auth

All tracker routes use the same session token middleware already in place.
No new auth mechanism needed.

### Users

`owner_id`, `assignee_id`, `reporter_id`, `triage_owner_id` all reference `User._id`.
The tracker services query the existing `users` collection via `User.get()`.

### Role Detection

`PositionLiteral` values from the existing `User.position` field are used to determine
the default landing view on `/tracker`:

| Position | Default view |
|---|---|
| CEO, Div Lead | `/tracker/leadership` |
| PM, EM | `/tracker/triage` |
| Team Member, others | `/tracker/my-tasks` |

### Beanie Registration

In `be/app/db/beanie.py`, extend `document_models` list:

```python
from app.submodules.tracker.models import (
    Product, Initiative, InitiativeProject,
    Issue, IssueComment, IssueEvent,
)
```

### Route Registration

In `be/app/api/__init__.py`, import and mount `tracker_router`:

```python
from app.submodules.tracker.routes import tracker_router
router.include_router(tracker_router, prefix="/tracker", tags=["tracker"])
```

---

## Phased Implementation Plan

### Phase 1A — Data Layer and CRUD (Backend First)

Deliverables:
- Scaffold `be/app/submodules/tracker/` directory
- Implement all six Beanie models
- Register models in `be/app/db/beanie.py`
- Implement services for Product, Initiative, InitiativeProject, Issue
- Implement routes for all four entities (list, create, get, patch)
- Register `tracker_router` in main API

Outcome: API is functional and testable via curl or Postman with no frontend.

### Phase 1B — Dashboard Aggregations

Deliverables:
- `services/dashboard.py` with leadership, owner, my-work aggregations
- `routes/dashboard.py` exposing the four view endpoints
- Issue comment create/list endpoints
- IssueEvent write path (emit on status change, assignment change)
- Triage endpoint with filter by status=triage

Outcome: All API surfaces needed by the UI are available.

### Phase 1C — Frontend Scaffold and List Views

Deliverables:
- Scaffold `fe/src/submodules/tracker/` directory
- All type definitions
- Typed axios API client layer
- React Query hooks per entity
- Register all routes in `fe/src/App.tsx`
- Add tracker section to Navigation/Sidebar
- ProductList, InitiativeList, InitiativeProjectList pages (table views)

Outcome: User can navigate the tracker hierarchy, see lists.

### Phase 1D — Detail Views and Issue Workflow

Deliverables:
- ProductDetail showing owned initiatives and progress
- InitiativeDetail showing initiative_projects and issue summary
- InitiativeProjectDetail showing issue list with filters
- IssueDetail with TipTap description, comment thread, event history
- Status transition UI (dropdown with allowed transitions)
- Priority selector (0–4)

Outcome: Full read/write workflow for issues is usable.

### Phase 1E — Role-Based Landing Views and Triage

Deliverables:
- LeadershipDashboard (product → initiative cards with progress indicators)
- TriageInbox (filtered inbox with quick-action toolbar: assign, move, close)
- MyTasks (assignee-filtered view grouped by status)
- Role-based redirect on `/tracker` based on `user.position`

Outcome: System is usable day-to-day for all four target roles.

### Phase 1F — Polish and Hardening

Deliverables:
- Client-side filtering for issue lists (status, priority, assignee)
- Progress bars derived from issue counts in initiative_project/initiative/product views
- Sub-issue creation and display in IssueDetail
- Soft delete / archive on all entities (via `archived_at`)
- Error states and empty states for all views

Outcome: MVP is operationally credible.

---

## Progress Calculation

Derived on the fly, never stored. Consistent approach across all levels:

```
initiative_project_progress = done_issues / total_issues
initiative_progress = avg(initiative_project_progress) for all initiative_projects
product_progress    = avg(initiative_progress) for all initiatives
```

Triage-status issues are excluded from denominator to avoid inflating "not started" counts.

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Database | MongoDB / Beanie | Consistent with entire existing stack |
| New "project" name | `InitiativeProject` | Avoids collision with existing `Project` model |
| Collection prefix | `tracker_` for shared names (initiatives, issues) | Avoids future collection name collision |
| Route prefix | `/tracker/*` | Clean namespace separation |
| Issue description | TipTap HTML (reuse existing editor) | Already integrated, avoids new dependency |
| Progress field | Computed, not stored | Prevents stale data; cheap to compute from issue counts |
| Sub-issues | Same `Issue` model, `parent_issue_id` field | Follows proposal; avoids separate model |
| Auth | Reuse existing session token middleware | No new auth work needed |
| Role-based views | Position field drives default landing, not separate data | One shared model, role filters |

---

## Files to Create (New)

```
be/app/submodules/__init__.py
be/app/submodules/tracker/__init__.py
be/app/submodules/tracker/models/__init__.py
be/app/submodules/tracker/models/product.py
be/app/submodules/tracker/models/initiative.py
be/app/submodules/tracker/models/initiative_project.py
be/app/submodules/tracker/models/issue.py
be/app/submodules/tracker/models/comment.py
be/app/submodules/tracker/models/event.py
be/app/submodules/tracker/schemas/__init__.py
be/app/submodules/tracker/schemas/product.py
be/app/submodules/tracker/schemas/initiative.py
be/app/submodules/tracker/schemas/initiative_project.py
be/app/submodules/tracker/schemas/issue.py
be/app/submodules/tracker/schemas/comment.py
be/app/submodules/tracker/services/__init__.py
be/app/submodules/tracker/services/product.py
be/app/submodules/tracker/services/initiative.py
be/app/submodules/tracker/services/initiative_project.py
be/app/submodules/tracker/services/issue.py
be/app/submodules/tracker/services/comment.py
be/app/submodules/tracker/services/dashboard.py
be/app/submodules/tracker/routes/__init__.py
be/app/submodules/tracker/routes/products.py
be/app/submodules/tracker/routes/initiatives.py
be/app/submodules/tracker/routes/initiative_projects.py
be/app/submodules/tracker/routes/issues.py
be/app/submodules/tracker/routes/comments.py
be/app/submodules/tracker/routes/dashboard.py

fe/src/submodules/tracker/types/product.ts
fe/src/submodules/tracker/types/initiative.ts
fe/src/submodules/tracker/types/initiative_project.ts
fe/src/submodules/tracker/types/issue.ts
fe/src/submodules/tracker/types/comment.ts
fe/src/submodules/tracker/api/products.ts
fe/src/submodules/tracker/api/initiatives.ts
fe/src/submodules/tracker/api/initiative_projects.ts
fe/src/submodules/tracker/api/issues.ts
fe/src/submodules/tracker/api/dashboard.ts
fe/src/submodules/tracker/hooks/useProducts.ts
fe/src/submodules/tracker/hooks/useInitiatives.ts
fe/src/submodules/tracker/hooks/useInitiativeProjects.ts
fe/src/submodules/tracker/hooks/useIssues.ts
fe/src/submodules/tracker/hooks/useDashboard.ts
fe/src/submodules/tracker/components/ProductCard.tsx
fe/src/submodules/tracker/components/InitiativeCard.tsx
fe/src/submodules/tracker/components/InitiativeProjectCard.tsx
fe/src/submodules/tracker/components/IssueRow.tsx
fe/src/submodules/tracker/components/IssueDetail.tsx
fe/src/submodules/tracker/components/IssueStatusBadge.tsx
fe/src/submodules/tracker/components/PriorityBadge.tsx
fe/src/submodules/tracker/components/ProgressBar.tsx
fe/src/submodules/tracker/components/TriageActionBar.tsx
fe/src/submodules/tracker/components/CommentThread.tsx
fe/src/submodules/tracker/pages/leadership/LeadershipDashboard.tsx
fe/src/submodules/tracker/pages/products/ProductList.tsx
fe/src/submodules/tracker/pages/products/ProductDetail.tsx
fe/src/submodules/tracker/pages/initiatives/InitiativeList.tsx
fe/src/submodules/tracker/pages/initiatives/InitiativeDetail.tsx
fe/src/submodules/tracker/pages/initiative_projects/InitiativeProjectList.tsx
fe/src/submodules/tracker/pages/initiative_projects/InitiativeProjectDetail.tsx
fe/src/submodules/tracker/pages/issues/IssueDetail.tsx
fe/src/submodules/tracker/pages/triage/TriageInbox.tsx
fe/src/submodules/tracker/pages/my-tasks/MyTasks.tsx
```

## Files to Modify (Existing)

```
be/app/db/beanie.py                    — register 6 new Beanie models
be/app/api/__init__.py                 — mount tracker_router at /tracker
fe/src/App.tsx                         — add /tracker/* routes
fe/src/components/Navigation.tsx       — add tracker nav section
fe/src/components/Sidebar.tsx          — add tracker sidebar links
```
