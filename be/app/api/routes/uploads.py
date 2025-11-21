"""File upload routes."""

from __future__ import annotations

import mimetypes
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.services import s3

# Configure upload settings
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB

# Allowed file extensions
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_FILE_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt",
    ".xls", ".xlsx", ".ods", ".csv",
    ".ppt", ".pptx", ".odp",
    ".zip", ".rar", ".7z", ".tar", ".gz",
    ".mp4", ".avi", ".mov", ".mkv", ".webm",
    ".mp3", ".wav", ".flac", ".ogg",
    ".json", ".xml", ".yaml", ".yml",
    ".py", ".js", ".html", ".css", ".md"
}


class UploadResponse(BaseModel):
    url: str
    fileName: str
    fileSize: str


def format_file_size(size_bytes: int) -> str:
    """Format file size in bytes to human readable format."""
    if size_bytes == 0:
        return "0 Bytes"

    sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(sizes) - 1:
        size_bytes /= 1024
        i += 1

    return f"{size_bytes:.2f} {sizes[i]}"


def get_file_extension(filename: str) -> str:
    """Get file extension in lowercase."""
    return Path(filename).suffix.lower()


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename while preserving the extension."""
    extension = get_file_extension(original_filename)
    unique_id = str(uuid.uuid4())
    return f"{unique_id}{extension}"


async def save_upload_file(
    upload_file: UploadFile, allowed_extensions: set[str], max_size: int
) -> dict[str, Any]:
    """Save uploaded file to S3 and return metadata."""
    if not upload_file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )

    # Check file extension
    file_extension = get_file_extension(upload_file.filename)
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_extension} not allowed"
        )

    # Read file content
    file_content = await upload_file.read()
    file_size = len(file_content)

    # Check file size
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File size {format_file_size(file_size)} exceeds "
                f"maximum allowed size {format_file_size(max_size)}"
            )
        )

    # Generate unique filename
    unique_filename = generate_unique_filename(upload_file.filename)
    
    # Determine content type
    content_type, _ = mimetypes.guess_type(upload_file.filename)
    
    # Upload to S3
    try:
        public_url = s3.upload_file_to_s3(
            file_content=file_content,
            object_key=unique_filename,
            content_type=content_type
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file to storage: {str(e)}"
        ) from e

    # Return file metadata with full S3 URL
    return {
        "url": public_url,
        "fileName": upload_file.filename,
        "fileSize": format_file_size(file_size)
    }


router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post(
    "/images",
    response_model=UploadResponse,
    summary="Upload an image file",
    response_description="Image upload metadata including URL and file information."
)
async def upload_image(file: UploadFile = File(...)) -> UploadResponse:
    """Upload an image file to the server."""
    metadata = await save_upload_file(file, ALLOWED_IMAGE_EXTENSIONS, MAX_IMAGE_SIZE)
    return UploadResponse(**metadata)


@router.post(
    "/files",
    response_model=UploadResponse,
    summary="Upload a file",
    response_description="File upload metadata including URL and file information."
)
async def upload_file(file: UploadFile = File(...)) -> UploadResponse:
    """Upload a file to the server."""
    # Allow both image and file extensions for general file upload
    all_allowed = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_FILE_EXTENSIONS
    metadata = await save_upload_file(file, all_allowed, MAX_FILE_SIZE)
    return UploadResponse(**metadata)


@router.get(
    "/files/{filename}",
    summary="Get uploaded file URL",
    response_description="Redirect to the file URL in S3 storage."
)
async def get_uploaded_file(filename: str) -> dict[str, str]:
    """Get the public URL for an uploaded file."""
    # Files are now stored in S3, return the S3 URL
    file_url = s3.get_file_url(filename)
    return {"url": file_url}