# Technical Specification: Pure FileSystem Workspace Service (Hybrid Metadata)

This specification defines a workspace system where **physical structure** is governed by a strict template and **workspace-level identity** is managed by Beanie (MongoDB). Individual file structures and navigation are handled dynamically via the FileSystem to ensure the system remains a "Single Source of Truth" for content.

---

## 1. System Architecture
Each workspace is initialized with a standardized boilerplate. While the workspace identity exists in MongoDB, the internal hierarchy is purely directory-based.

### Workspace Template
When a workspace is created, the following structure is scaffolded:
* `data/`: Primary user storage (Google Drive style).
* `outputs/`: Read-only/System-generated LLM outputs.
* `workflows/`: Storage for `.yaml` automation files.
* `.claude/skills/`: Markdown files defining specific AI behaviors.

### Workspace Metadata (Beanie)
```python
from beanie import Document
from pydantic import Field
from bson import ObjectId

class WorkspaceMetadata(Document):
    name: str
    owner_id: str
    # Physical folder on disk matches the Document _id
    
    class Settings:
        name = "workspaces"
```

---

## 2. API Endpoints

### Workspace Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/workspaces/create` | Creates Beanie entry and physical directory scaffold. |
| `GET` | `/workspaces/list` | Returns all `WorkspaceMetadata` for an `owner_id`. |

### File & Folder Operations
All file operations (List, Create, Upload) default to the `/data` subdirectory unless otherwise specified.

**Endpoint:** `GET /workspaces/files`  
**Query Params:** `{in?: string}`  
**Returns:** ```json
{
  "previous": "string_or_null",
  "result": [
    {"id": "data/notes", "isFolder": true, "name": "notes", "mimeType": "folder"},
    {"id": "data/readme.md", "isFolder": false, "name": "readme.md", "mimeType": "text/markdown"}
  ]
}
```

### Skills Management (Custom Endpoints)
Skills are specialized Markdown files stored in `.claude/skills/`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/skills` | Creates `[name].md` in `.claude/skills/`. |
| `PUT` | `/skills/:name` | Updates content of a specific skill file. |
| `DELETE` | `/skills/:name` | Removes the `.md` file from the skills folder. |

---

## 3. Workspace Service Implementation

```python
class WorkspaceService:
    def __init__(self, storage_path: str):
        self.base_path = Path(storage_path).resolve()

    def create_workspace_scaffold(self, workspace_id: str):
        """Initializes the physical structure for a new Beanie Workspace."""
        ws_path = self.base_path / workspace_id
        folders = [
            "data", 
            "outputs", 
            "workflows", 
            ".claude/skills"
        ]
        for folder in folders:
            (ws_path / folder).mkdir(parents=True, exist_ok=True)

    def _resolve_safe_path(self, workspace_id: str, sub_path: str) -> Path:
        """Ensures all operations stay within the specific workspace folder."""
        ws_root = (self.base_path / workspace_id).resolve()
        target = (ws_root / sub_path.lstrip("/")).resolve()
        
        if not str(target).startswith(str(ws_root)):
            raise PermissionError("Path Traversal Detected")
        return target
```

---

## 4. Operational Rules

### Navigation Logic
* **The `in` Parameter:** In the file browser, the `in` parameter should be relative to the workspace root (e.g., `in=data/photos`).
* **Previous Field:** * If `in="data/photos"`, `previous` is `"data"`.
    * If `in="data"`, `previous` is `""` (root).
    * If `in=""`, `previous` is `null`.

### Storage Strategy
* **Data vs. Output:** The `/workspaces/upload` and `/workspaces/files/create` endpoints should automatically prepend `data/` to the path if no specific subfolder is provided.
* **Skills:** The Skills API bypasses the generic file list and targets `.claude/skills/` directly. These files are treated as standard Markdown but isolated from the general "user data" area.

### Reliability
* **Cleanup:** When a workspace Beanie document is deleted, the service must perform a `shutil.rmtree()` on the corresponding `workspace_object_id` folder to prevent orphaned data.