"""Shared image upload helper for Supabase Storage.

Validates by MAGIC BYTES (not the client-supplied content-type header or
filename), whitelists the extension from the detected type, and uploads to
the given bucket. Replaces three drifted copy-pastes in user/meal/event
services.
"""

from fastapi import HTTPException, UploadFile
from datetime import datetime
import uuid
import logging

from utils.supabase import supabase

logger = logging.getLogger(__name__)

MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


def _detect_image_type(contents: bytes) -> str | None:
    """Return 'jpeg' | 'png' | 'webp' based on magic bytes, else None."""
    if contents.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if len(contents) >= 12 and contents[:4] == b"RIFF" and contents[8:12] == b"WEBP":
        return "webp"
    return None


async def upload_image(
    image: UploadFile, bucket: str, filename_prefix: str = ""
) -> str:
    """Validate and upload an image; returns the public URL."""
    contents = await image.read()

    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

    detected = _detect_image_type(contents)
    if detected is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
        )

    # Extension and content-type come from the DETECTED type, never the client
    extension = "jpg" if detected == "jpeg" else detected
    content_type = f"image/{detected}"

    unique_filename = (
        f"{filename_prefix}{uuid.uuid4()}_{int(datetime.now().timestamp())}.{extension}"
    )

    try:
        supabase.storage.from_(bucket).upload(
            unique_filename, contents, {"content-type": content_type}
        )
        return supabase.storage.from_(bucket).get_public_url(unique_filename)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading image to bucket {bucket}: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Error uploading image: {str(e)}")
