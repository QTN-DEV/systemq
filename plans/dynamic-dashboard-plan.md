# Technical Architecture Specification: Dynamic Dashboard System

**Module Location:** be/app/submodules/dashboard
**Project:** Backend Dynamic Dashboard Rendering Engine
**Stack:** MongoDB, Beanie ODM, Pydantic

---

## 1. Executive Summary
The **Dynamic Dashboard System** is a decoupled architecture designed to serve version-controlled React components as data. It allows for the dynamic modification of frontend UI logic without requiring a full application redeploy. This specification outlines the backend storage strategy, the service layer logic for asset management, and the optimistic concurrency control required to ensure data integrity.

---

## 2. System Architecture
The system consists of a centralized MongoDB repository managed by a Python-based backend. The frontend consumes raw source code and executes it within a secure runtime.

### 2.1 Architectural Flow
1.  **Storage:** MongoDB acts as the "Source of Truth."
2.  **Validation:** Pydantic ensures incoming and outgoing data structures are type-safe.
3.  **Persistence:** Beanie ODM handles asynchronous mapping between Python objects and MongoDB.

---

## 3. Data Modeling

### 3.1 MongoDB Collection: `dynamic_dashboard`
Each user is assigned a single document containing their entire asset directory. This ensures atomic updates to the user's dashboard context.

### 3.2 Document Schema (JSON Logical View)
The schema uses a **Materialized Path** as a key for quick lookup and organized structure.

```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "files": {
    "src/components/Header.tsx": {
      "version": 1,
      "content": "export const Header = () => <div>Hello World</div>;"
    }
  }
}
```

### 3.3 Data Constraints
* **user_id:** Unique identifier; indexed for high-performance retrieval. reference to `users` collection
* **materializedPath:** String key representing the file location.
* **version:** Integer; incremented on every successful update.
* **content:** String; defaults to an empty string `""`.

---

## 4. Service Layer: `DynamicDashboardService`

The service layer is responsible for the business logic and ensuring that the versioning state remains consistent across multiple editors.

### 4.1 Capability: `get_asset_files`
* **Input:** `user_id` (ObjectId)
* **Process:** Query the `dynamic_dashboard` collection for the specific user.
* **Output:** Returns a dictionary mapping `materializedPath` to an object containing `{content, version}`.
* **Note:** If no document exists for the user, return an empty map.

### 4.2 Capability: `update_asset_files`
This method implements **Optimistic Concurrency Control (OCC)** to prevent the "Lost Update" problem.

* **Input:** `user_id`, `files_to_update` (Array of objects containing `materializedPath`, `target_version`, and `content`).
* **Logic:**
    1.  Fetch the current document for the `user_id`.
    2.  For each file in the update request:
        * Compare the `target_version` (provided by the client) against the `existing_version` (in the database).
        * **If mismatch:** Reject the entire update. This indicates another process has modified the file since the client last fetched it.
        * **If match:** Update the `content` and increment the `version` counter (`existing_version + 1`).
    3.  Persist changes using Beanie's asynchronous save methods.

---

## 5. API Endpoints

### 5.1 Fetch User Assets
* **Method:** `GET`
* **Endpoint:** `/dashboard/assets/{user_id}`
* **Functionality:** Returns the full tree of React source code for the user.
* **Response:** `200 OK` with the `files` object.

### 5.2 Update User Assets
* **Method:** `POST`
* **Endpoint:** `/dashboard/assets/{user_id}`
* **Payload:** A list of updates including the `target_version`.
* **Success Response:** `200 OK` with the updated document state.
* **Error Response:** `409 Conflict` if any `target_version` fails the validation check.
---

## 6. Strategic Implementation Notes
* **Beanie Integration:** Beanie will be configured to use Pydantic v2 for performance.
* **Indexing:** A unique index on `user_id` is mandatory to ensure document lookups are O(1).
* **Atomic Updates:** Because MongoDB documents are atomic at the document level, updating multiple files within one user's document remains an atomic operation.

# UPDATES
- ~~when getting dynamic dashboard files, if user dynamic dashboard doesnt exists, create new one document for that user.~~
- adjust service, beanie, api route to new document shape change
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "content": "...",
  "version": 1
}
```

