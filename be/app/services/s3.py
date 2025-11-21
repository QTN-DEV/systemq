"""S3/MinIO service for file storage operations."""

from __future__ import annotations

import logging
from typing import Any

import boto3
from botocore.client import BaseClient
from botocore.exceptions import ClientError

from constants import (
    MINIO_ACCESS_KEY,
    MINIO_BUCKET_NAME,
    MINIO_ENDPOINT,
    MINIO_PUBLIC_HOST,
    MINIO_SECRET_KEY,
    MINIO_USE_SSL,
)

logger = logging.getLogger(__name__)

# Initialize S3 client
_s3_client: BaseClient | None = None


def get_s3_client() -> BaseClient:
    """Get or create S3 client instance."""
    global _s3_client
    if _s3_client is None:
        # Parse endpoint to extract host and port
        endpoint_url = f"{'https' if MINIO_USE_SSL else 'http'}://{MINIO_ENDPOINT}"
        
        _s3_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=MINIO_ACCESS_KEY,
            aws_secret_access_key=MINIO_SECRET_KEY,
            region_name="us-east-1",  # MinIO doesn't care about region
        )
        
        # Ensure bucket exists
        ensure_bucket_exists()
    
    return _s3_client


def ensure_bucket_exists() -> None:
    """Ensure the S3 bucket exists, create if it doesn't."""
    try:
        client = get_s3_client()
        client.head_bucket(Bucket=MINIO_BUCKET_NAME)
        logger.info(f"Bucket {MINIO_BUCKET_NAME} exists")
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "")
        if error_code == "404":
            # Bucket doesn't exist, create it
            try:
                client = get_s3_client()
                client.create_bucket(Bucket=MINIO_BUCKET_NAME)
                logger.info(f"Created bucket {MINIO_BUCKET_NAME}")
            except ClientError as create_error:
                logger.error(f"Failed to create bucket: {create_error}")
                raise
        else:
            logger.error(f"Failed to check bucket existence: {e}")
            raise


def upload_file_to_s3(file_content: bytes, object_key: str, content_type: str | None = None) -> str:
    """Upload file content to S3 and return public URL.
    
    Args:
        file_content: The file content as bytes
        object_key: The S3 object key (path/filename)
        content_type: Optional MIME type for the file
        
    Returns:
        Public URL to access the uploaded file
    """
    try:
        client = get_s3_client()
        
        # Upload file
        extra_args: dict[str, Any] = {}
        if content_type:
            extra_args["ContentType"] = content_type
        
        client.put_object(
            Bucket=MINIO_BUCKET_NAME,
            Key=object_key,
            Body=file_content,
            **extra_args,
        )
        
        # Generate public URL using custom host
        public_url = get_file_url(object_key)
        
        logger.info(f"Uploaded file to S3: {object_key}")
        return public_url
        
    except ClientError as e:
        logger.error(f"Failed to upload file to S3: {e}")
        raise


def delete_file_from_s3(object_key: str) -> None:
    """Delete a file from S3.
    
    Args:
        object_key: The S3 object key (path/filename) to delete
    """
    try:
        client = get_s3_client()
        client.delete_object(Bucket=MINIO_BUCKET_NAME, Key=object_key)
        logger.info(f"Deleted file from S3: {object_key}")
    except ClientError as e:
        logger.error(f"Failed to delete file from S3: {e}")
        raise


def get_file_url(object_key: str) -> str:
    """Get public URL for an S3 object using custom host.
    
    Args:
        object_key: The S3 object key (path/filename)
        
    Returns:
        Public URL to access the file
    """
    protocol = "https" if MINIO_USE_SSL else "http"
    return f"{protocol}://{MINIO_PUBLIC_HOST}/{MINIO_BUCKET_NAME}/{object_key}"

