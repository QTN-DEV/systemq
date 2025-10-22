"""API tests for document routes."""

from __future__ import annotations

import pytest

from app.models.qdrive import QDrive, QDrivePermission

pytestmark = pytest.mark.asyncio


class TestDocumentAPI:
    """Test document API endpoints."""

    async def test_create_document_unauthorized(self, test_client):
        """Test creating document without authorization."""
        response = await test_client.post(
            "/documents/",
            json={
                "name": "Test Doc",
                "type": "file",
            },
        )
        # FastAPI returns 422 when required header (Authorization) is missing
        assert response.status_code == 422

    async def test_create_root_folder(self, test_client, user_token, regular_user):
        """Test creating a root folder."""
        response = await test_client.post(
            "/documents/",
            json={
                "name": "Root Folder",
                "type": "folder",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Root Folder"
        assert data["type"] == "folder"
        assert data["creator_id"] == regular_user.employee_id
        assert data["parent_id"] is None

    async def test_create_file_with_content(self, test_client, user_token):
        """Test creating a file with content."""
        response = await test_client.post(
            "/documents/",
            json={
                "name": "Test Document.txt",
                "type": "file",
                "category": "Documentation",
                "content": "This is test content",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Document.txt"
        assert data["category"] == "Documentation"
        assert data["content"] == "This is test content"

    async def test_list_documents_root(self, test_client, user_token, regular_user):
        """Test listing documents at root level."""
        # Create test documents
        doc1 = QDrive(
            name="Doc 1",
            type="folder",
            creator_id=regular_user.employee_id,
            parent_id=None,
        )
        await doc1.insert()

        doc2 = QDrive(
            name="Doc 2",
            type="file",
            creator_id=regular_user.employee_id,
            parent_id=None,
        )
        await doc2.insert()

        # List root documents
        response = await test_client.get(
            "/documents/",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert {d["name"] for d in data} == {"Doc 1", "Doc 2"}

    async def test_list_documents_by_parent(
        self, test_client, user_token, regular_user
    ):
        """Test listing documents by parent folder."""
        # Create parent folder
        parent = QDrive(
            name="Parent",
            type="folder",
            creator_id=regular_user.employee_id,
        )
        await parent.insert()

        # Create children
        child1 = QDrive(
            name="Child 1",
            type="file",
            creator_id=regular_user.employee_id,
            parent_id=str(parent.id),
        )
        await child1.insert()

        child2 = QDrive(
            name="Child 2",
            type="file",
            creator_id=regular_user.employee_id,
            parent_id=str(parent.id),
        )
        await child2.insert()

        # List children
        response = await test_client.get(
            f"/documents/?parent_id={parent.id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert {d["name"] for d in data} == {"Child 1", "Child 2"}

    async def test_get_document(self, test_client, user_token, regular_user):
        """Test retrieving a specific document."""
        doc = QDrive(
            name="Test Doc",
            type="file",
            creator_id=regular_user.employee_id,
            content="Test content",
        )
        await doc.insert()

        response = await test_client.get(
            f"/documents/{doc.id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Doc"
        assert data["content"] == "Test content"

    async def test_get_document_not_found(self, test_client, user_token):
        """Test retrieving non-existent document."""
        response = await test_client.get(
            "/documents/507f1f77bcf86cd799439011",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 404

    async def test_update_document(self, test_client, user_token, regular_user):
        """Test updating document."""
        doc = QDrive(
            name="Original",
            type="file",
            creator_id=regular_user.employee_id,
            content="Original content",
        )
        await doc.insert()

        response = await test_client.patch(
            f"/documents/{doc.id}",
            json={
                "name": "Updated",
                "content": "Updated content",
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated"
        assert data["content"] == "Updated content"

    async def test_delete_document(self, test_client, user_token, regular_user):
        """Test soft deleting document."""
        doc = QDrive(
            name="To Delete",
            type="file",
            creator_id=regular_user.employee_id,
        )
        await doc.insert()

        response = await test_client.delete(
            f"/documents/{doc.id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 200
        assert response.json()["message"] == "Document deleted successfully"

        # Verify soft deleted
        deleted_doc = await QDrive.get(doc.id)
        assert deleted_doc.deleted_at is not None

    async def test_search_documents(self, test_client, user_token, regular_user):
        """Test searching documents."""
        # Create test documents
        await QDrive(
            name="Python Tutorial",
            type="file",
            creator_id=regular_user.employee_id,
        ).insert()

        await QDrive(
            name="JavaScript Guide",
            type="file",
            creator_id=regular_user.employee_id,
        ).insert()

        # Search for Python
        response = await test_client.get(
            "/documents/search?q=Python",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert any("Python" in item["name"] for item in data["items"])

    async def test_get_item_count(self, test_client, regular_user):
        """Test getting item count for a folder."""
        parent = QDrive(
            name="Parent",
            type="folder",
            creator_id=regular_user.employee_id,
        )
        await parent.insert()

        # Add children
        for i in range(3):
            child = QDrive(
                name=f"Child {i}",
                type="file",
                creator_id=regular_user.employee_id,
                parent_id=str(parent.id),
            )
            await child.insert()

        response = await test_client.get(f"/documents/{parent.id}/item-count")

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 3

    async def test_get_path_ids(self, test_client, regular_user):
        """Test getting ancestor path IDs."""
        # Create hierarchy
        root = QDrive(
            name="Root", type="folder", creator_id=regular_user.employee_id
        )
        await root.insert()

        folder = QDrive(
            name="Folder",
            type="folder",
            creator_id=regular_user.employee_id,
            parent_id=str(root.id),
        )
        await folder.insert()

        file = QDrive(
            name="File",
            type="file",
            creator_id=regular_user.employee_id,
            parent_id=str(folder.id),
        )
        await file.insert()

        response = await test_client.get(f"/documents/{file.id}/path-ids")

        assert response.status_code == 200
        path_ids = response.json()
        assert len(path_ids) == 3
        assert path_ids == [str(root.id), str(folder.id), str(file.id)]

    async def test_get_breadcrumbs(self, test_client, regular_user):
        """Test getting breadcrumb trail."""
        root = QDrive(
            name="Root", type="folder", creator_id=regular_user.employee_id
        )
        await root.insert()

        folder = QDrive(
            name="Folder",
            type="folder",
            creator_id=regular_user.employee_id,
            parent_id=str(root.id),
        )
        await folder.insert()

        response = await test_client.get(f"/documents/{folder.id}/breadcrumbs")

        assert response.status_code == 200
        breadcrumbs = response.json()
        assert len(breadcrumbs) == 2
        assert breadcrumbs[0]["name"] == "Root"
        assert breadcrumbs[1]["name"] == "Folder"

    async def test_get_document_types(self, test_client, regular_user):
        """Test getting distinct document types."""
        await QDrive(
            name="Folder", type="folder", creator_id=regular_user.employee_id
        ).insert()
        await QDrive(
            name="File", type="file", creator_id=regular_user.employee_id
        ).insert()

        response = await test_client.get("/documents/types")

        assert response.status_code == 200
        data = response.json()
        assert set(data["values"]) == {"file", "folder"}

    async def test_get_document_categories(self, test_client, regular_user):
        """Test getting distinct categories."""
        await QDrive(
            name="Doc1",
            type="file",
            creator_id=regular_user.employee_id,
            category="Finance",
        ).insert()
        await QDrive(
            name="Doc2",
            type="file",
            creator_id=regular_user.employee_id,
            category="HR",
        ).insert()

        response = await test_client.get("/documents/categories")

        assert response.status_code == 200
        data = response.json()
        assert set(data["values"]) == {"Finance", "HR"}

    async def test_get_my_access(self, test_client, user_token, regular_user):
        """Test getting current user's access to document."""
        doc = QDrive(
            name="My Doc",
            type="file",
            creator_id=regular_user.employee_id,
        )
        await doc.insert()

        response = await test_client.get(
            f"/documents/{doc.id}/access",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_owner"] is True
        assert data["can_view"] is True
        assert data["can_edit"] is True
        assert data["can_delete"] is True

    async def test_permission_access_control(
        self, test_client, user_token, viewer_token, regular_user
    ):
        """Test document access control - owner vs non-owner."""
        # Create document owned by regular_user
        doc = QDrive(
            name="Private Doc",
            type="file",
            creator_id=regular_user.employee_id,
        )
        await doc.insert()

        # Owner can access
        response = await test_client.get(
            f"/documents/{doc.id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200

        # Non-owner without permissions cannot access
        response = await test_client.get(
            f"/documents/{doc.id}",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert response.status_code == 403

    async def test_update_with_commit(self, test_client, user_token, regular_user):
        """Test updating document with snapshot commit."""
        doc = QDrive(
            name="Original",
            type="file",
            creator_id=regular_user.employee_id,
            content="Version 1",
        )
        await doc.insert()

        # Update with commit=True
        response = await test_client.patch(
            f"/documents/{doc.id}?commit=true",
            json={"content": "Version 2"},
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 200

        # Check history
        response = await test_client.get(
            f"/documents/{doc.id}/history",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 200
        history = response.json()
        assert len(history) >= 1
