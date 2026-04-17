# Linear Replacement Proposal

## Purpose

This document proposes a narrow internal replacement for Linear focused on the minimum workflow our team actually needs in order to operate day to day without depending on Linear.

The goal is not to rebuild Linear as a product. The goal is to deliver a usable internal tool with the smallest scope that still supports planning, execution, and intake.

This proposal is intentionally optimized for:

- lower implementation cost
- faster time to usable MVP
- lower product and engineering complexity
- clear workflow for leadership, project owners, and individual contributors

## Executive Summary

The recommended MVP includes:

- initiatives
- projects
- issues
- sub-issues
- triage inbox
- basic statuses
- assignee and owner fields
- priority
- comments and activity log
- role-based landing views on top of the same data

The recommended product structure is:

- `Product` = strategic portfolio layer
- `Initiative` = planning bucket (belongs to one Product)
- `InitiativeProject` = execution bucket (belongs to one Initiative; renamed from "Project" to avoid conflict with internal project catalog)
- `Issue` = work item
- `Sub-issue` = child work item
- `Triage` = intake lane for new work before initiative_project assignment

Each initiative belongs to exactly one product. Each initiative_project belongs to exactly one initiative.

This is a good MVP compromise because leadership gets visibility at the initiative level, while execution remains project and issue based.

## Product Goal

The internal tool should allow the team to:

1. capture incoming work
2. triage and prioritize it
3. organize work under projects
4. group projects under initiatives
5. assign work clearly
6. break work into sub-issues
7. track work to completion
8. give leadership a simple view of progress

If the system can do those things reliably, it is already usable.

## Non-Goal

This MVP is not intended to provide:

- feature parity with Linear
- advanced automation
- complex portfolio planning
- detailed reporting and forecasting
- custom workflows per team
- broad integration ecosystem
- enterprise-grade permission granularity

Trying to match Linear too early would significantly increase time, cost, and maintenance burden.

## Why This Scope

The main business constraint is that paying for Linear is perceived as expensive compared to internal engineering cost. However, building an internal replacement is only rational if the scope is heavily constrained.

The correct approach is:

- replace the essential workflow first
- defer everything else
- deliver a narrow usable tool quickly

That means the MVP should focus on operational workflow, not on product polish or feature completeness.

## Recommended MVP Scope

### In Scope

- initiative management
- project management
- issue management
- one-level sub-issues
- triage inbox
- basic status workflow
- assignee and owner assignment
- priority
- issue comments
- issue activity history
- role-based dashboards and filtered views
- basic filtering and search by primary fields

### Out of Scope

- multiple initiatives per project
- project dependencies
- issue dependencies and blockers
- labels and tag explosion
- custom fields
- estimates
- SLA rules
- workflow automations
- notifications and reminders
- Slack/email integrations
- dashboards with custom widgets
- burndown/velocity reporting
- workload balancing analytics
- advanced access control rules
- audit/compliance-grade eventing
- attachments and document collaboration
- full-text search across long descriptions and comments

## Core Product Concepts

### Product

Product is the top-level portfolio layer. It groups related initiatives under a single
strategic objective or business area.

Allowed complexity in MVP:

- name
- description
- status
- owner
- optional target date

### Initiative

Initiative is a planning layer below Product and above InitiativeProjects.

Use initiative to represent a strategic stream, major business objective, or high-level delivery bucket. It should remain simple in MVP.

Allowed complexity in MVP:

- name
- description
- status
- owner
- optional target date

Avoid turning initiative into a full portfolio-management object in phase 1.

### InitiativeProject

InitiativeProject is the primary execution container. Work is delivered through initiative_projects.
This was called "project" in the original proposal but is renamed to avoid a naming
collision with the existing internal project catalog used by the standup system.

Each initiative_project:

- belongs to exactly one initiative
- contains many issues
- has one owner
- has a simple lifecycle

This one-to-many relationship keeps data modeling and reporting simple.

### Issue

Issue is the primary work item. It represents a task, bug, or feature item.

Each issue may:

- belong to a project
- be unassigned to a project while still in triage
- have one assignee
- have one parent issue

### Sub-Issue

Sub-issue is not a separate entity. It is an issue with `parent_issue_id`.

For MVP, only support one level of nesting:

- issue
- sub-issue

Do not support deeper hierarchies in phase 1.

### Triage

Triage is the intake lane for new work.

All new work can enter triage first, even before it is assigned to a project. This avoids fake placeholder projects and keeps intake operationally simple.

Triage actions in MVP:

- review new issue
- assign priority
- assign triage owner if needed
- assign assignee
- move to project and backlog
- close as duplicate or irrelevant

## Target Users and Their Views

The system should not have separate data models for different roles. It should use one shared data model and expose different filtered views for different audiences.

### Leadership View

Primary user:

- CEO
- leadership
- managers who need top-level visibility

Primary questions:

- which initiatives are active
- which projects sit under each initiative
- what is moving
- what is stuck

Recommended view:

- initiative-first summary
- project count per initiative
- issue count by status
- simple progress indicator
- recent movement

### Project Owner View

Primary user:

- project owner
- delivery lead
- manager responsible for execution

Primary questions:

- what projects do I own
- what is blocked or unassigned
- what is high priority
- what is the current execution state

Recommended view:

- project cards
- issue count by status
- high-priority issue list
- unassigned issues
- triage items requiring decision
- recent activity

### Individual Contributor View

Primary user:

- engineer
- designer
- operator
- any team member doing assigned work

Primary questions:

- what is assigned to me
- what should I do next
- what is in progress
- what has changed recently

Recommended view:

- my tasks
- grouped by status
- sorted by priority and recent updates
- parent issue and sub-issue context

### Triage Owner View

Primary user:

- PM
- EM
- operations owner
- designated triager

Primary questions:

- what just came in
- what needs clarification
- what should be accepted, assigned, or closed

Recommended view:

- triage inbox
- sortable/filterable intake list
- quick actions for accept/assign/close

## Information Architecture

Recommended primary screens:

1. Leadership dashboard
2. Initiative list
3. Initiative detail
4. Project list
5. Project detail
6. Triage inbox
7. My tasks
8. Issue detail

This is enough for MVP. Additional screens should be justified carefully.

## Workflow Model

### Issue Lifecycle

Recommended issue statuses for MVP:

- `triage`
- `backlog`
- `in_progress`
- `done`
- `canceled`

Suggested flow:

```text
new issue
  -> triage
  -> backlog
  -> in_progress
  -> done

or

new issue
  -> triage
  -> canceled
```

Meaning:

- `triage`: newly captured work not yet accepted into active planning
- `backlog`: accepted but not started
- `in_progress`: actively being worked on
- `done`: completed
- `canceled`: closed without delivery

### Initiative Lifecycle

Recommended statuses:

- `planned`
- `active`
- `done`
- `canceled`

### Project Lifecycle

Recommended statuses:

- `planned`
- `active`
- `done`
- `canceled`

## Progress Model

MVP should avoid sophisticated progress formulas.

Recommended simple progress model:

- initiative progress derived from project and issue completion counts
- project progress derived from issue completion counts

Example:

`progress = done issues / total issues`

This is not perfect, but it is sufficient for an early internal tool. If needed, a more nuanced progress model can be added later.

## Data Model

Recommended relational backbone:

- `users`
- `initiatives`
- `projects`
- `issues`
- `issue_comments`
- `issue_events`

### Relationship Summary

```text
users
  ├─ owns many initiatives
  ├─ owns many projects
  ├─ assigned many issues
  ├─ reports many issues
  ├─ writes many comments
  └─ triggers many events

initiatives
  └─ 1 -> many projects

projects
  └─ 1 -> many issues

issues
  ├─ 0..1 -> project   (nullable during triage)
  ├─ 0..1 -> parent issue
  ├─ 1 -> many sub-issues
  ├─ 1 -> many comments
  └─ 1 -> many events
```

### ASCII ER Diagram

```text
+------------------+
|   initiatives    |
+------------------+
| id (PK)          |
| key              |
| name             |
| description      |
| status           |
| owner_id -> users.id
| target_date      |
| created_at       |
| updated_at       |
| archived_at      |
+------------------+
          |
          | 1 -> many
          v
+------------------+
|     projects     |
+------------------+
| id (PK)          |
| initiative_id FK |
| key              |
| name             |
| description      |
| status           |
| owner_id -> users.id
| created_at       |
| updated_at       |
| archived_at      |
+------------------+
          |
          | 1 -> many
          v
+------------------+
|      issues      |
+------------------+
| id (PK)          |
| project_id FK ?  |  <- nullable for triage inbox
| parent_issue_id ?|----+
| title            |    |
| description      |    |
| status           |    |
| priority         |    |
| assignee_id ?    | -> users.id
| reporter_id ?    | -> users.id
| triage_owner_id ?| -> users.id
| source           |    |
| type             |    |
| resolution ?     |    |
| created_at       |    |
| updated_at       |    |
| closed_at ?      |    |
| archived_at ?    |    |
+------------------+    |
          |             |
          | 1 -> many   | self-reference
          v             |
+------------------+    |
|  issue_comments  |    |
+------------------+    |
| id (PK)          |    |
| issue_id FK      |----+
| author_id -> users.id
| body             |
| created_at       |
| updated_at       |
| deleted_at ?     |
+------------------+

+------------------+
|   issue_events   |
+------------------+
| id (PK)          |
| issue_id FK -----> issues.id
| actor_id  -> users.id
| event_type       |
| payload (jsonb)  |
| created_at       |
+------------------+

+------------------+
|      users       |
+------------------+
| id (PK)          |
| name             |
| email            |
| created_at       |
| updated_at       |
+------------------+
```

## SQL Draft Schema

```sql
create table users (
  id uuid primary key,
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table initiatives (
  id uuid primary key,
  key text not null unique,
  name text not null,
  description text,
  status text not null default 'planned',
  owner_id uuid references users(id),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table projects (
  id uuid primary key,
  initiative_id uuid not null references initiatives(id),
  key text not null unique,
  name text not null,
  description text,
  status text not null default 'planned',
  owner_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table issues (
  id uuid primary key,
  project_id uuid references projects(id),
  parent_issue_id uuid references issues(id),
  title text not null,
  description text,
  status text not null default 'triage',
  priority smallint not null default 3,
  assignee_id uuid references users(id),
  reporter_id uuid references users(id),
  triage_owner_id uuid references users(id),
  source text not null default 'manual',
  type text not null default 'task',
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  archived_at timestamptz,
  constraint chk_issue_priority check (priority between 0 and 4),
  constraint chk_issue_not_self_parent check (id is distinct from parent_issue_id)
);

create table issue_comments (
  id uuid primary key,
  issue_id uuid not null references issues(id) on delete cascade,
  author_id uuid not null references users(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table issue_events (
  id uuid primary key,
  issue_id uuid not null references issues(id) on delete cascade,
  actor_id uuid references users(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

## Field Semantics

### Initiative

- `key`: human-readable short identifier
- `status`: lifecycle state
- `owner_id`: accountable owner
- `target_date`: optional planning date

### Project

- `initiative_id`: mandatory single-parent relation
- `key`: human-readable identifier
- `owner_id`: accountable owner

### Issue

- `project_id`: nullable to allow triage before project assignment
- `parent_issue_id`: used for sub-issues
- `status`: issue lifecycle state
- `priority`: simple integer ranking
- `assignee_id`: current executor
- `reporter_id`: original creator/requester
- `triage_owner_id`: optional owner of intake decision
- `source`: where the issue came from
- `type`: task, bug, feature
- `resolution`: reason for non-active closure if needed

## Recommended Value Sets

Use plain text values with application validation in MVP. Database enums can be introduced later if needed.

### Initiative Status

- `planned`
- `active`
- `done`
- `canceled`

### Project Status

- `planned`
- `active`
- `done`
- `canceled`

### Issue Status

- `triage`
- `backlog`
- `in_progress`
- `done`
- `canceled`

### Issue Type

- `task`
- `bug`
- `feature`

### Issue Source

- `manual`
- `triage`
- `import`

### Resolution

- `done`
- `duplicate`
- `wont_fix`
- `irrelevant`

## Indexing Recommendations

Minimum recommended indexes:

```sql
create index idx_projects_initiative_id on projects(initiative_id);
create index idx_issues_project_id on issues(project_id);
create index idx_issues_parent_issue_id on issues(parent_issue_id);
create index idx_issues_assignee_id on issues(assignee_id);
create index idx_issues_status on issues(status);
create index idx_issues_priority on issues(priority);
create index idx_issues_created_at on issues(created_at desc);
create index idx_issue_comments_issue_id on issue_comments(issue_id);
create index idx_issue_events_issue_id on issue_events(issue_id);
```

## Business Rules

These rules should be implemented explicitly in application logic:

1. Every project must belong to exactly one initiative.
2. An issue may have no project while it is in triage.
3. A sub-issue is just an issue whose `parent_issue_id` is set.
4. Only one level of sub-issue nesting is supported in MVP.
5. If an issue status becomes `done` or `canceled`, `closed_at` should be set.
6. Triage issues can be accepted into a project and moved to `backlog`.
7. Progress displayed to users should be derived from current issue data, not manually edited.

## Suggested API Surface

The first backend version only needs a narrow API.

### Initiatives

- `GET /initiatives`
- `POST /initiatives`
- `GET /initiatives/:id`
- `PATCH /initiatives/:id`

### Projects

- `GET /projects`
- `POST /projects`
- `GET /projects/:id`
- `PATCH /projects/:id`

### Issues

- `GET /issues`
- `POST /issues`
- `GET /issues/:id`
- `PATCH /issues/:id`

### Comments

- `GET /issues/:id/comments`
- `POST /issues/:id/comments`

### Views

- `GET /dashboard/leadership`
- `GET /dashboard/owner`
- `GET /dashboard/my-work`
- `GET /triage`

This can expand later, but this is enough for MVP.

## Screen-Level Requirements

### 1. Leadership Dashboard

Must show:

- initiatives
- initiative owner
- initiative status
- project count per initiative
- issue summary by status
- simple progress indicator
- recent movement

### 2. Initiative Detail

Must show:

- initiative metadata
- related projects
- high-level issue summary across those projects
- quick navigation into projects

### 3. Project List

Must show:

- projects
- initiative relation
- owner
- status
- open issue count
- progress summary

### 4. Project Detail

Must show:

- project metadata
- issue list
- issue counts by status
- unassigned issues
- high-priority issues
- sub-issue visibility
- recent activity

### 5. Triage Inbox

Must show:

- all issues in `triage`
- reporter
- current priority
- age
- quick actions

Quick actions:

- assign priority
- assign assignee
- assign project
- move to backlog
- close

### 6. My Tasks

Must show:

- issues assigned to current user
- grouped by status
- sorted by priority and updated time
- parent and project context

### 7. Issue Detail

Must show:

- title and description
- status
- priority
- assignee
- reporter
- project
- parent issue
- child sub-issues
- comments
- event history

## MVP UX Principles

The product should feel fast and obvious. For internal tools, operational clarity matters more than polish.

Key UX principles:

- one clear source of truth
- role-specific landing page, shared workflow underneath
- fast list views
- minimal clicks for common actions
- obvious state transitions
- clear ownership on every object

## Implementation Strategy

Build the product in phased slices instead of trying to deliver everything at once.

### Phase 1A

Deliver:

- users
- initiatives
- projects
- issues
- status fields
- assignee and owner fields
- basic list/detail screens

Outcome:

- basic planning and tracking structure exists

### Phase 1B

Deliver:

- sub-issues
- triage inbox
- issue filters
- leadership view
- owner view
- my tasks view

Outcome:

- day-to-day workflow becomes usable

### Phase 1C

Deliver:

- comments
- activity log
- progress summaries
- bug fixes and UX polish

Outcome:

- system becomes operationally credible for real team use

### Phase 2

Consider adding:

- notifications
- better reporting
- search improvements
- permissions hardening
- integrations
- labels/custom fields if truly necessary

## Delivery Assumptions

This proposal assumes:

- one team
- one shared workflow
- internal usage
- no need for enterprise feature depth
- willing to postpone non-essential convenience features

If those assumptions change, scope and timeline will expand quickly.

## Estimated Complexity

This MVP is feasible only if the team is disciplined about scope.

Risk increases significantly when any of these are added too early:

- advanced reporting
- custom workflows
- notifications
- integrations
- detailed permission systems
- multi-dimensional planning models

The internal replacement becomes expensive when it stops being a workflow tool and starts trying to become a platform.

## Recommended MVP Definition of Done

MVP is done when users can do all of the following inside this system without falling back to spreadsheets or chat as the primary tracker:

1. create initiatives
2. create projects under initiatives
3. create issues and sub-issues
4. capture new incoming work into triage
5. assign work to a project and owner
6. move work through backlog and in-progress to done
7. see project and initiative progress at a simple summary level
8. see role-appropriate landing views for leadership, owners, and contributors

If those outcomes are achieved, the system is already delivering business value.

## Final Recommendation

Proceed with an MVP that includes initiatives, but keep them thin.

Recommended product structure:

- initiative-first for leadership visibility
- project-first for delivery ownership
- issue-first for actual work execution
- triage-first for intake handling

Recommended constraints:

- each project belongs to one initiative
- each issue belongs to zero or one project
- each issue can have zero or one parent issue
- only one level of sub-issue nesting
- one shared workflow, multiple audience-specific views

This is the smallest version that still gives:

- leadership reporting
- project execution structure
- contributor task clarity
- operational triage

Anything beyond this should be treated as post-MVP unless a concrete operational need proves otherwise.
