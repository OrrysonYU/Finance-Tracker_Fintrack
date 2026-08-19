import logging
from io import BytesIO
from pathlib import PurePosixPath
from uuid import uuid4

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from PIL import Image, ImageFile, ImageOps, UnidentifiedImageError

from .models import profile_image_upload_to

logger = logging.getLogger(__name__)

MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024
MAX_INPUT_DIMENSION = 4096
MAX_INPUT_PIXELS = 16_000_000
MAX_OUTPUT_DIMENSION = 1024
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
ALLOWED_CONTENT_TYPES = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}
ALLOWED_EXTENSIONS = {
    ".jpg": "JPEG",
    ".jpeg": "JPEG",
    ".png": "PNG",
    ".webp": "WEBP",
}
PROFILE_IMAGE_PREFIX = "profile-images/"

ImageFile.LOAD_TRUNCATED_IMAGES = False
Image.MAX_IMAGE_PIXELS = MAX_INPUT_PIXELS


class ProfileImageValidationError(ValueError):
    """Raised when an upload is not a bounded, supported image."""


def _read_upload(uploaded_file):
    if not uploaded_file:
        raise ProfileImageValidationError("Choose a profile image to upload.")

    if getattr(uploaded_file, "size", 0) > MAX_PROFILE_IMAGE_BYTES:
        raise ProfileImageValidationError("Profile images must be 5 MB or smaller.")

    try:
        uploaded_file.seek(0)
        payload = uploaded_file.read(MAX_PROFILE_IMAGE_BYTES + 1)
    except (OSError, ValueError) as exc:
        raise ProfileImageValidationError("The profile image could not be read.") from exc

    if len(payload) > MAX_PROFILE_IMAGE_BYTES:
        raise ProfileImageValidationError("Profile images must be 5 MB or smaller.")
    if not payload:
        raise ProfileImageValidationError("The profile image is empty.")
    return payload


def _validate_declared_type(uploaded_file, detected_format):
    name = str(getattr(uploaded_file, "name", "") or "")
    extension = PurePosixPath(name.replace("\\", "/")).suffix.lower()
    content_type = str(getattr(uploaded_file, "content_type", "") or "").lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise ProfileImageValidationError("Use a JPEG, PNG, or WebP image.")
    if content_type not in ALLOWED_CONTENT_TYPES.values():
        raise ProfileImageValidationError("Use a JPEG, PNG, or WebP image.")
    if ALLOWED_EXTENSIONS[extension] != detected_format:
        raise ProfileImageValidationError("The file extension does not match the image content.")
    if ALLOWED_CONTENT_TYPES[detected_format] != content_type:
        raise ProfileImageValidationError("The file type does not match the image content.")


def normalize_profile_image(uploaded_file):
    """Validate and normalize an upload into bounded metadata-free JPEG bytes."""
    payload = _read_upload(uploaded_file)
    try:
        with Image.open(BytesIO(payload)) as image:
            detected_format = image.format
            if detected_format not in ALLOWED_FORMATS:
                raise ProfileImageValidationError("Use a JPEG, PNG, or WebP image.")
            _validate_declared_type(uploaded_file, detected_format)
            if getattr(image, "is_animated", False) or getattr(image, "n_frames", 1) != 1:
                raise ProfileImageValidationError("Animated profile images are not supported.")
            width, height = image.size
            if (
                width < 1
                or height < 1
                or width > MAX_INPUT_DIMENSION
                or height > MAX_INPUT_DIMENSION
                or width * height > MAX_INPUT_PIXELS
            ):
                raise ProfileImageValidationError(
                    "Images must be no larger than 4096 by 4096 pixels."
                )
            image.verify()

        with Image.open(BytesIO(payload)) as image:
            image.load()
            oriented = ImageOps.exif_transpose(image)
            oriented.thumbnail(
                (MAX_OUTPUT_DIMENSION, MAX_OUTPUT_DIMENSION),
                Image.Resampling.LANCZOS,
            )
            if oriented.mode in ("RGBA", "LA") or "transparency" in oriented.info:
                rgba = oriented.convert("RGBA")
                background = Image.new("RGB", rgba.size, "white")
                background.paste(rgba, mask=rgba.getchannel("A"))
                output_image = background
            else:
                output_image = oriented.convert("RGB")

            output = BytesIO()
            output_image.save(
                output,
                format="JPEG",
                quality=85,
                optimize=True,
                progressive=False,
            )
            normalized = output.getvalue()
            output_image.close()
    except ProfileImageValidationError:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError) as exc:
        raise ProfileImageValidationError("The profile image is malformed or corrupted.") from exc

    if not normalized or len(normalized) > MAX_PROFILE_IMAGE_BYTES:
        raise ProfileImageValidationError("The profile image could not be safely processed.")
    return normalized


def _safe_profile_name(name):
    if not name or name.startswith("/") or ".." in PurePosixPath(name).parts:
        return False
    return name.startswith(PROFILE_IMAGE_PREFIX)


def _delete_stored_image(name):
    if not _safe_profile_name(name):
        logger.error("Refusing to delete an unsafe profile image storage key: %r", name)
        return
    try:
        default_storage.delete(name)
    except Exception:
        logger.exception("Could not delete profile image storage key %s", name)


@transaction.atomic
def replace_profile_image(user, uploaded_file):
    normalized = normalize_profile_image(uploaded_file)
    old_name = user.profile_image.name if user.profile_image else None
    new_name = profile_image_upload_to(user, f"{uuid4().hex}.jpg")
    stored_name = None
    try:
        stored_name = default_storage.save(new_name, ContentFile(normalized))
        user.profile_image.name = stored_name
        user.save(update_fields=["profile_image"])
    except Exception:
        if stored_name:
            _delete_stored_image(stored_name)
        raise

    if old_name and old_name != stored_name:
        transaction.on_commit(lambda: _delete_stored_image(old_name))
    return user


@transaction.atomic
def delete_profile_image(user):
    old_name = user.profile_image.name if user.profile_image else None
    if not old_name:
        return user
    user.profile_image = None
    user.save(update_fields=["profile_image"])
    transaction.on_commit(lambda: _delete_stored_image(old_name))
    return user
