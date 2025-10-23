# Pages Folder Structure Guide

**📁 Folder-Based Routing Pattern - MANDATORY**

This guide defines the **required** folder structure for all pages in the SystemQ frontend application.

---

## Table of Contents

1. [Why Folder-Based Pattern?](#why-folder-based-pattern)
2. [Core Principles](#core-principles)
3. [Folder Structure Rules](#folder-structure-rules)
4. [Naming Conventions](#naming-conventions)
5. [Complete Examples](#complete-examples)
6. [File Organization Guidelines](#file-organization-guidelines)
7. [Code Examples](#code-examples)
8. [Best Practices](#best-practices)
9. [Common Patterns](#common-patterns)
10. [Migration Guide](#migration-guide)

---

## Why Folder-Based Pattern?

### Benefits

✅ **Colocation**: Keep related files together
✅ **Scalability**: Easy to find and modify page-specific code
✅ **Encapsulation**: Page-specific logic stays within the page folder
✅ **Clear Ownership**: Each page owns its components, hooks, and forms
✅ **Better Navigation**: Developers can quickly locate page-related files
✅ **Reduced Conflicts**: Teams can work on different pages without conflicts
✅ **Easier Testing**: Test files live next to implementation

### Problems It Solves

❌ **Scattered Components**: No more hunting through shared component folders
❌ **Unclear Dependencies**: Dependencies are clear from folder structure
❌ **Large Shared Folders**: Avoids monolithic `components/` directory
❌ **Naming Conflicts**: Page-specific components can have simple names

---

## Core Principles

### 1. One Folder Per Route

Each route gets its own folder containing everything needed for that page.

### 2. Underscored Internal Folders

Internal folders (components, sections, hooks, forms) use underscore prefix (`_`) to indicate they are private to the page.

### 3. Single Entry Point

Each page folder has exactly **ONE** `page.tsx` file as the entry point.

### 4. Self-Contained

Pages should be as self-contained as possible. Share code only when truly needed across multiple pages.

---

## Folder Structure Rules

### Rule 1: Folder Naming

```
✅ CORRECT:
- pages/home-page/
- pages/documents/
- pages/employee-management/
- pages/login/

❌ INCORRECT:
- pages/HomePage/          (PascalCase - wrong)
- pages/home_page/         (snake_case - wrong)
- pages/home/Home.tsx      (no page.tsx - wrong)
```

**Convention**: Use `kebab-case` for folder names

### Rule 2: Required Structure

Every page folder MUST contain:

```
page-name/
├── page.tsx              ⚠️ REQUIRED - Main page component (default export)
├── _components/          📦 Optional - Page-specific components
├── _sections/            📦 Optional - Page section components
├── _hooks/               🎣 Optional - Page-specific custom hooks
├── _forms/               📝 Optional - Page-specific form components
└── __tests__/            🧪 Optional - Page tests
```

### Rule 3: Dynamic Routes

For dynamic routes (with parameters), use square brackets:

```
pages/
├── issue/
│   └── [id]/
│       ├── page.tsx
│       ├── _components/
│       ├── _sections/
│       └── _hooks/
```

Maps to: `/issue/:id`

---

## Naming Conventions

### File Naming

| Type       | Convention                      | Example                    |
| ---------- | ------------------------------- | -------------------------- |
| Page Entry | `page.tsx`                    | `page.tsx`               |
| Components | `PascalCase.tsx`              | `DocumentCard.tsx`       |
| Hooks      | `camelCase.ts`                | `useDocumentData.ts`     |
| Forms      | `PascalCase.tsx`              | `CreateDocumentForm.tsx` |
| Utils      | `camelCase.ts`                | `formatDate.ts`          |
| Types      | `camelCase.types.ts`          | `document.types.ts`      |
| Tests      | `*.test.tsx` or `*.test.ts` | `page.test.tsx`          |

### Component Naming

```typescript
// ✅ CORRECT - Components use PascalCase
export function DocumentCard() { }
export function UserProfileSection() { }

// ❌ INCORRECT
export function documentCard() { }  // camelCase - wrong
export function document_card() { } // snake_case - wrong
```

### Hook Naming

```typescript
// ✅ CORRECT - Hooks start with 'use'
export function useDocumentData() { }
export function useFormValidation() { }

// ❌ INCORRECT
export function documentData() { }     // No 'use' prefix
export function getDocumentData() { }  // Not a hook
```

---

## Complete Examples

### Example 1: Simple Page (Root Route)

**Route**: `http://localhost:3000/`

**Folder Structure**:

```
src/pages/home-page/
├── page.tsx                          # Main page component
├── _components/
│   ├── HeroSection.tsx              # Hero banner component
│   ├── FeatureCard.tsx              # Feature display card
│   └── StatisticsPanel.tsx          # Stats dashboard
├── _sections/
│   ├── FeaturesSection.tsx          # Features overview section
│   └── TestimonialsSection.tsx      # Customer testimonials
├── _hooks/
│   ├── useHomeData.ts               # Fetch home page data
│   └── useStatistics.ts             # Real-time statistics
└── __tests__/
    └── page.test.tsx                # Page tests
```

**Router Configuration**:

```typescript
import HomePage from '@/pages/home-page/page';

<Route path="/" element={<HomePage />} />
```

### Example 2: Nested Route

**Route**: `http://localhost:3000/documents`

**Folder Structure**:

```
src/pages/documents/
├── documents-page.tsx                          # Documents list page
├── _components/
│   ├── DocumentTable.tsx            # Documents table view
│   ├── DocumentCard.tsx             # Card view for documents
│   ├── DocumentToolbar.tsx          # Action toolbar
│   ├── SearchBar.tsx                # Document search
│   └── FilterPanel.tsx              # Filtering options
├── _sections/
│   ├── DocumentListSection.tsx      # Main document list
│   ├── BreadcrumbSection.tsx        # Navigation breadcrumbs
│   └── SidebarSection.tsx           # Folder tree sidebar
├── _hooks/
│   ├── useDocuments.ts              # Fetch documents
│   ├── useDocumentActions.ts        # CRUD operations
│   ├── useDocumentSearch.ts         # Search functionality
│   └── useBreadcrumbs.ts            # Breadcrumb data
├── _forms/
│   ├── CreateDocumentForm.tsx       # Create document modal
│   ├── RenameDocumentForm.tsx       # Rename dialog
│   └── MoveDocumentForm.tsx         # Move document modal
└── __tests__/
    ├── page.test.tsx
    ├── DocumentTable.test.tsx
    └── useDocuments.test.ts
```

### Example 3: Dynamic Route with Parameters

**Route**: `http://localhost:3000/documents/[id]/edit`

**Folder Structure**:

```
src/pages/documents/
├── page.tsx                          # Document list (index)
└── [id]/
    ├── [id]-page.tsx                      # Document detail view
    ├── edit/
    │   ├── page.tsx                  # Document editor
    │   ├── _components/
    │   │   ├── EditorToolbar.tsx
    │   │   ├── EditorCanvas.tsx
    │   │   ├── PropertiesPanel.tsx
    │   │   └── VersionHistory.tsx
    │   ├── _sections/
    │   │   ├── EditorHeader.tsx
    │   │   ├── EditorMain.tsx
    │   │   └── EditorFooter.tsx
    │   ├── _hooks/
    │   │   ├── useDocumentEditor.ts
    │   │   ├── useAutoSave.ts
    │   │   └── useVersionControl.ts
    │   └── _forms/
    │       └── MetadataForm.tsx
    └── _components/
        ├── DocumentViewer.tsx
        └── CommentsList.tsx
```

**Router Configuration**:

```typescript
import DocumentListPage from '@/pages/documents/page';
import DocumentDetailPage from '@/pages/documents/[id]/page';
import DocumentEditPage from '@/pages/documents/[id]/edit/page';

<Route path="/documents">
  <Route index element={<DocumentListPage />} />
  <Route path=":id" element={<DocumentDetailPage />} />
  <Route path=":id/edit" element={<DocumentEditPage />} />
</Route>
```

### Example 4: Authentication Pages

**Folder Structure**:

```
src/pages/
├── login/
│   ├── page.tsx
│   ├── _components/
│   │   ├── LoginHeader.tsx
│   │   └── SocialLoginButtons.tsx
│   ├── _forms/
│   │   └── LoginForm.tsx
│   └── _hooks/
│       └── useLogin.ts
│
├── register/
│   ├── page.tsx
│   ├── _forms/
│   │   ├── RegistrationForm.tsx
│   │   └── validation.ts
│   └── _hooks/
│       └── useRegistration.ts
│
└── forgot-password/
    ├── page.tsx
    ├── _forms/
    │   └── ForgotPasswordForm.tsx
    └── _hooks/
        └── usePasswordReset.ts
```

### Example 5: Complex Multi-Step Page

**Route**: `http://localhost:3000/employee/onboarding`

**Folder Structure**:

```
src/pages/employee/
└── onboarding/
    ├── page.tsx                      # Main onboarding page
    ├── _components/
    │   ├── StepIndicator.tsx        # Progress indicator
    │   ├── StepNavigation.tsx       # Next/Previous buttons
    │   └── OnboardingLayout.tsx     # Layout wrapper
    ├── _sections/
    │   ├── PersonalInfoStep.tsx     # Step 1: Personal info
    │   ├── EmploymentStep.tsx       # Step 2: Employment details
    │   ├── DocumentsStep.tsx        # Step 3: Documents upload
    │   ├── ReviewStep.tsx           # Step 4: Review & submit
    │   └── ConfirmationStep.tsx     # Step 5: Confirmation
    ├── _hooks/
    │   ├── useOnboardingFlow.ts     # Multi-step state management
    │   ├── useFormPersistence.ts    # Auto-save to localStorage
    │   └── useOnboardingSubmit.ts   # Final submission
    ├── _forms/
    │   ├── PersonalInfoForm.tsx
    │   ├── EmploymentForm.tsx
    │   └── DocumentUploadForm.tsx
    └── _types/
        └── onboarding.types.ts
```

---

## File Organization Guidelines

### `_components/` Folder

**Purpose**: Reusable UI components specific to this page

**What Goes Here**:

- ✅ Page-specific display components
- ✅ Components used multiple times within the page
- ✅ Smaller, focused UI components

**What Doesn't**:

- ❌ Shared components (use `src/shared/components/`)
- ❌ UI primitives (use `src/ui/components/`)
- ❌ Layout components (use `_sections/`)

**Example**:

```typescript
// pages/documents/_components/DocumentCard.tsx
export function DocumentCard({ document }: { document: Document }) {
  return (
    <div className="card">
      <h3>{document.name}</h3>
      <p>{document.description}</p>
    </div>
  );
}
```

### `_sections/` Folder

**Purpose**: Large layout sections that compose the page

**What Goes Here**:

- ✅ Major page sections (header, main, footer, sidebar)
- ✅ Complex composite components
- ✅ Components that represent a significant portion of the page

**What Doesn't**:

- ❌ Small, reusable components (use `_components/`)
- ❌ Form components (use `_forms/`)

**Example**:

```typescript
// pages/documents/_sections/DocumentListSection.tsx
import { DocumentCard } from '../_components/DocumentCard';
import { DocumentToolbar } from '../_components/DocumentToolbar';
import { useDocuments } from '../_hooks/useDocuments';

export function DocumentListSection() {
  const { documents, loading } = useDocuments();

  return (
    <section className="document-list">
      <DocumentToolbar />
      <div className="grid">
        {documents.map(doc => (
          <DocumentCard key={doc.id} document={doc} />
        ))}
      </div>
    </section>
  );
}
```

### `_hooks/` Folder

**Purpose**: Custom React hooks specific to this page

**What Goes Here**:

- ✅ Data fetching hooks (using TanStack Query)
- ✅ Business logic hooks
- ✅ State management hooks
- ✅ Side effect hooks (auto-save, polling, etc.)

**What Doesn't**:

- ❌ Shared hooks (use `src/shared/hooks/`)
- ❌ Generic utility hooks (use `src/shared/hooks/`)

**Example**:

```typescript
// pages/documents/_hooks/useDocuments.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { DocumentService } from '@/lib/shared/services';

export function useDocuments(parentId?: string) {
  const query = useQuery({
    queryKey: ['documents', parentId],
    queryFn: () => DocumentService.getDocuments(parentId),
  });

  return {
    documents: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: DocumentService.createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
```

### `_forms/` Folder

**Purpose**: Form components with validation and submission logic

**What Goes Here**:

- ✅ Form components (using React Hook Form)
- ✅ Validation schemas (Zod/Yup)
- ✅ Form-specific utilities

**What Doesn't**:

- ❌ Shared form components (use `src/shared/components/forms/`)
- ❌ Input primitives (use `src/ui/components/`)

**Example**:

```typescript
// pages/documents/_forms/CreateDocumentForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateDocument } from '../_hooks/useDocuments';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['file', 'folder']),
  category: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CreateDocumentForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createDocument = useCreateDocument();

  const onSubmit = async (data: FormData) => {
    await createDocument.mutateAsync(data);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}

      <select {...register('type')}>
        <option value="file">File</option>
        <option value="folder">Folder</option>
      </select>

      <button type="submit">Create</button>
    </form>
  );
}
```

### `__tests__/` Folder

**Purpose**: Test files for the page and its components

**What Goes Here**:

- ✅ Page component tests
- ✅ Hook tests
- ✅ Component integration tests

**Example**:

```typescript
// pages/documents/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DocumentsPage from '../page';

describe('DocumentsPage', () => {
  it('should render document list', async () => {
    render(<DocumentsPage />);

    expect(screen.getByText(/documents/i)).toBeInTheDocument();
  });
});
```

---

## Code Examples

### Complete Page Example

**File**: `pages/dashboard/page.tsx`

```typescript
import { Suspense } from 'react';
import { DashboardHeader } from './_sections/DashboardHeader';
import { MetricsSection } from './_sections/MetricsSection';
import { RecentActivitySection } from './_sections/RecentActivitySection';
import { useDashboardData } from './_hooks/useDashboardData';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <div className="dashboard-page">
        <DashboardHeader />

        <Suspense fallback={<LoadingSpinner />}>
          <div className="dashboard-content">
            <MetricsSection />
            <RecentActivitySection />
          </div>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
```

### Section Component Example

**File**: `pages/dashboard/_sections/MetricsSection.tsx`

```typescript
import { MetricCard } from '../_components/MetricCard';
import { useDashboardMetrics } from '../_hooks/useDashboardData';

export function MetricsSection() {
  const { metrics, loading } = useDashboardMetrics();

  if (loading) return <div>Loading metrics...</div>;

  return (
    <section className="metrics-section">
      <h2>Key Metrics</h2>
      <div className="metrics-grid">
        {metrics.map(metric => (
          <MetricCard
            key={metric.id}
            title={metric.title}
            value={metric.value}
            trend={metric.trend}
          />
        ))}
      </div>
    </section>
  );
}
```

### Hook with TanStack Query Example

**File**: `pages/dashboard/_hooks/useDashboardData.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/shared/api/client';

interface DashboardMetric {
  id: string;
  title: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
}

export function useDashboardMetrics() {
  const query = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      const response = await apiClient.get<DashboardMetric[]>('/dashboard/metrics');
      return response;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60, // Refetch every minute
  });

  return {
    metrics: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useDashboardData() {
  const metrics = useDashboardMetrics();

  return {
    metrics,
  };
}
```

---

## Best Practices

### 1. Keep Components Small

```typescript
// ✅ GOOD - Small, focused component
export function DocumentName({ name }: { name: string }) {
  return <h3 className="document-name">{name}</h3>;
}

// ❌ BAD - Component doing too much
export function DocumentCard({ document }) {
  // 200 lines of logic, multiple responsibilities
}
```

### 2. Composition Over Props

```typescript
// ✅ GOOD - Composition
export function DocumentCard({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>;
}

<DocumentCard>
  <DocumentName name={doc.name} />
  <DocumentMeta date={doc.date} />
</DocumentCard>

// ❌ BAD - Many props
export function DocumentCard({
  name,
  date,
  author,
  size,
  type,
  // ... 20 more props
}) { }
```

### 3. Extract Business Logic to Hooks

```typescript
// ✅ GOOD - Logic in hook
export function useDocumentActions(documentId: string) {
  const deleteDocument = useMutation(...);
  const renameDocument = useMutation(...);

  return { deleteDocument, renameDocument };
}

// Component
function DocumentCard() {
  const { deleteDocument } = useDocumentActions(doc.id);
  // Clean component code
}

// ❌ BAD - Business logic in component
function DocumentCard() {
  const handleDelete = async () => {
    // 50 lines of business logic
  };
}
```

### 4. Use TypeScript Types

```typescript
// ✅ GOOD - Proper types
interface DocumentCardProps {
  document: Document;
  onSelect?: (id: string) => void;
}

export function DocumentCard({ document, onSelect }: DocumentCardProps) {
  // Type-safe component
}

// ❌ BAD - No types
export function DocumentCard({ document, onSelect }: any) {
  // Unsafe
}
```

### 5. Co-locate Tests

```
pages/documents/
├── page.tsx
├── _components/
│   ├── DocumentCard.tsx
│   └── DocumentCard.test.tsx    ✅ Test next to component
└── __tests__/
    └── page.test.tsx            ✅ Page tests in __tests__
```

### 6. Use Barrel Exports When Needed

**File**: `pages/documents/_components/index.ts`

```typescript
// Barrel export for cleaner imports
export { DocumentCard } from './DocumentCard';
export { DocumentTable } from './DocumentTable';
export { DocumentToolbar } from './DocumentToolbar';
```

**Usage**:

```typescript
// ✅ GOOD - Clean import
import { DocumentCard, DocumentTable } from './_components';

// ❌ BAD - Multiple imports
import { DocumentCard } from './_components/DocumentCard';
import { DocumentTable } from './_components/DocumentTable';
```

---

## Common Patterns

### Pattern 1: Master-Detail Page

```
pages/employees/
├── page.tsx                      # Employee list (master)
└── [id]/
    ├── page.tsx                  # Employee detail
    ├── _components/
    │   ├── EmployeeHeader.tsx
    │   ├── EmployeeInfo.tsx
    │   └── EmployeeActivity.tsx
    └── _hooks/
        └── useEmployee.ts
```

### Pattern 2: Wizard/Multi-Step Form

```
pages/project/
└── create/
    ├── page.tsx                  # Wizard orchestrator
    ├── _sections/
    │   ├── Step1Basic.tsx
    │   ├── Step2Team.tsx
    │   ├── Step3Settings.tsx
    │   └── Step4Review.tsx
    ├── _hooks/
    │   └── useWizardFlow.ts
    └── _components/
        └── StepIndicator.tsx
```

### Pattern 3: Tab-Based Page

```
pages/settings/
├── page.tsx                      # Settings container
├── _sections/
│   ├── ProfileTab.tsx
│   ├── SecurityTab.tsx
│   ├── NotificationsTab.tsx
│   └── BillingTab.tsx
└── _hooks/
    └── useSettings.ts
```

### Pattern 4: Modal/Dialog Page

```
pages/documents/
├── page.tsx
└── _components/
    ├── CreateDocumentModal.tsx   # Modal component
    ├── ShareModal.tsx
    └── DeleteConfirmModal.tsx
```

---

## Migration Guide

### Step 1: Create New Folder Structure

```bash
# For existing page: pages/Documents.tsx
mkdir -p pages/documents/{_components,_sections,_hooks,_forms}
```

### Step 2: Move Main Component

```bash
# Rename and move
mv pages/Documents.tsx pages/documents/page.tsx
```

### Step 3: Extract Components

Identify page-specific components and move them:

```bash
# Move components
mv components/DocumentCard.tsx pages/documents/_components/
mv components/DocumentToolbar.tsx pages/documents/_components/
```

### Step 4: Extract Hooks

Create custom hooks from inline logic:

```typescript
// Before: Inline in component
function DocumentsPage() {
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(setDocuments);
  }, []);

  // ...
}

// After: Extract to hook
// pages/documents/_hooks/useDocuments.ts
import { getDocumentsByParentId } from '@/lib/shared/services/DocumentService';

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => getDocumentsByParentId(null),
  });
}
```

### Step 5: Update Imports

Update router imports:

```typescript
// Before
import Documents from '@/pages/Documents';

// After
import DocumentsPage from '@/pages/documents/page';
```

### Step 6: Update Tests

Move and update test files:

```bash
mv tests/Documents.test.tsx pages/documents/__tests__/page.test.tsx
```

---

## Decision Tree: Where Should This File Go?

```
Is it a page entry point?
├─ YES → page.tsx
└─ NO → Continue...

Is it used on multiple pages?
├─ YES → src/shared/...
└─ NO → Continue...

Is it a small UI component?
├─ YES → _components/
└─ NO → Continue...

Is it a large section of the page?
├─ YES → _sections/
└─ NO → Continue...

Is it a React hook?
├─ YES → _hooks/
└─ NO → Continue...

Is it a form with validation?
├─ YES → _forms/
└─ NO → Continue...

Is it a test file?
├─ YES → __tests__/
└─ NO → _components/ (default)
```

---

## Quick Reference

### Folder Structure Template

```
pages/[page-name]/
├── page.tsx                 # ⚠️ REQUIRED - Page entry point
├── _components/             # Small, reusable page components
├── _sections/               # Large layout sections
├── _hooks/                  # Custom hooks (data, business logic)
├── _forms/                  # Form components with validation
├── _types/                  # Page-specific TypeScript types
├── _utils/                  # Page-specific utilities
└── __tests__/               # Test files
```

### Import Aliases

```typescript
// Absolute imports (recommended)
import { Button } from '@/ui/components/button';
import { useAuth } from '@/shared/hooks/useAuth';
import apiClient from '@/lib/shared/api/client';

// Relative imports (for page-internal files)
import { DocumentCard } from './_components/DocumentCard';
import { useDocuments } from './_hooks/useDocuments';
```

### File Naming Cheatsheet

| Type      | Pattern            | Example                    |
| --------- | ------------------ | -------------------------- |
| Page      | `page.tsx`       | `page.tsx`               |
| Component | `PascalCase.tsx` | `DocumentCard.tsx`       |
| Hook      | `use*.ts`        | `useDocuments.ts`        |
| Form      | `*Form.tsx`      | `CreateDocumentForm.tsx` |
| Section   | `*Section.tsx`   | `HeaderSection.tsx`      |
| Type      | `*.types.ts`     | `document.types.ts`      |
| Util      | `camelCase.ts`   | `formatDate.ts`          |
| Test      | `*.test.tsx`     | `page.test.tsx`          |

---

## Common Mistakes to Avoid

### ❌ DON'T: Mix flat files with folders

```
pages/
├── Documents.tsx              ❌ Flat file
├── documents/                 ❌ Folder with same name
│   └── page.tsx
└── Login.tsx                  ❌ Inconsistent
```

### ❌ DON'T: Skip the page.tsx file

```
pages/documents/
└── Documents.tsx              ❌ Wrong name
```

Should be:

```
pages/documents/
└── page.tsx                   ✅ Correct
```

### ❌ DON'T: Put shared components in page folders

```
pages/documents/_components/
└── Button.tsx                 ❌ Shared component in page folder
```

Should be:

```
src/ui/components/
└── button.tsx                 ✅ In shared UI
```

### ❌ DON'T: Use incorrect folder names

```
pages/documents/
├── components/                ❌ No underscore
├── hooks/                     ❌ No underscore
└── sections/                  ❌ No underscore
```

Should be:

```
pages/documents/
├── _components/               ✅ Underscore prefix
├── _hooks/                    ✅ Underscore prefix
└── _sections/                 ✅ Underscore prefix
```

---

## Questions & Answers

### Q: When should I create a `_sections/` folder?

**A**: When you have large composite components that represent major portions of the page. If a component is complex enough that it might have its own sub-components, it belongs in `_sections/`.

### Q: Can I have nested folders in `_components/`?

**A**: Yes, if it improves organization:

```
_components/
├── cards/
│   ├── DocumentCard.tsx
│   └── ProjectCard.tsx
└── tables/
    ├── DocumentTable.tsx
    └── UserTable.tsx
```

### Q: Should I use barrel exports?

**A**: Optional but recommended for cleaner imports. Create an `index.ts` file:

```typescript
// pages/documents/_components/index.ts
export * from './DocumentCard';
export * from './DocumentTable';
```

### Q: What about shared types?

**A**: Types used across multiple pages go in `src/shared/types/`. Page-specific types go in the page folder.

### Q: How do I handle deeply nested routes?

**A**: Mirror the URL structure:

```
pages/
└── admin/
    └── users/
        └── [id]/
            └── permissions/
                └── page.tsx
```

Maps to: `/admin/users/:id/permissions`

---

## Checklist for New Pages

- [ ] Created folder with kebab-case name
- [ ] Added `page.tsx` with default export
- [ ] Created `_components/` if needed
- [ ] Created `_sections/` if needed
- [ ] Created `_hooks/` if needed
- [ ] Created `_forms/` if needed
- [ ] Added tests in `__tests__/`
- [ ] Updated router configuration
- [ ] Verified page renders correctly
- [ ] Checked mobile responsiveness
- [ ] Added loading states
- [ ] Added error boundaries

---

## Resources

- **React Router**: https://reactrouter.com/
- **TanStack Query**: https://tanstack.com/query/latest
- **React Hook Form**: https://react-hook-form.com/
- **File-based Routing**: https://nextjs.org/docs/routing/introduction

---

**Last Updated**: 2025-10-23
**Maintained By**: Frontend Team
**Questions?**: Ask in #frontend-architecture Slack channel
