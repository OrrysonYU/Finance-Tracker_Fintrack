from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase


def image_upload(name="avatar.png", image_format="PNG", size=(64, 64), content_type=None):
    output = BytesIO()
    mode = "RGB" if image_format == "JPEG" else "RGBA"
    color = (37, 99, 235) if mode == "RGB" else (37, 99, 235, 255)
    Image.new(mode, size, color).save(output, format=image_format)
    media_type = content_type or {
        "JPEG": "image/jpeg",
        "PNG": "image/png",
        "WEBP": "image/webp",
    }[image_format]
    return SimpleUploadedFile(name, output.getvalue(), content_type=media_type)


class ProfileImageApiTest(APITestCase):
    image_url = "/api/auth/me/profile-image/"

    def setUp(self):
        self.media_directory = TemporaryDirectory()
        self.settings_override = override_settings(MEDIA_ROOT=self.media_directory.name)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.addCleanup(self.media_directory.cleanup)
        self.owner = get_user_model().objects.create_user(
            username="image-owner",
            email="owner@example.com",
            password="StrongPass123!",
        )
        self.other = get_user_model().objects.create_user(
            username="other-user",
            email="other@example.com",
            password="StrongPass123!",
        )

    def upload(self, uploaded_file, user=None):
        self.client.force_authenticate(user=user or self.owner)
        return self.client.post(self.image_url, {"image": uploaded_file}, format="multipart")

    def test_valid_supported_formats_are_normalized_and_persisted(self):
        for name, image_format in (
            ("avatar.jpg", "JPEG"),
            ("avatar.png", "PNG"),
            ("avatar.webp", "WEBP"),
        ):
            with self.subTest(image_format=image_format):
                response = self.upload(image_upload(name=name, image_format=image_format))
                self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
                self.owner.refresh_from_db()
                self.assertTrue(self.owner.profile_image.name.startswith(f"profile-images/user-{self.owner.pk}/"))
                self.assertTrue(self.owner.profile_image.name.endswith(".jpg"))
                self.assertNotIn(name, self.owner.profile_image.name)
                with self.owner.profile_image.storage.open(self.owner.profile_image.name, "rb") as stored:
                    normalized = stored.read()
                self.assertEqual(normalized[:3], b"\xff\xd8\xff")
                with Image.open(BytesIO(normalized)) as image:
                    self.assertEqual(image.format, "JPEG")
                    self.assertLessEqual(max(image.size), 1024)
                    self.assertEqual(image.getexif(), {})

    def test_rejects_oversized_unsupported_malformed_and_mismatched_files(self):
        cases = (
            SimpleUploadedFile("large.png", b"x" * (5 * 1024 * 1024 + 1), content_type="image/png"),
            SimpleUploadedFile("avatar.gif", b"GIF89a", content_type="image/gif"),
            SimpleUploadedFile("avatar.png", b"not-an-image", content_type="image/png"),
            image_upload(name="avatar.png", image_format="JPEG", content_type="image/png"),
        )
        for uploaded_file in cases:
            with self.subTest(name=uploaded_file.name):
                response = self.upload(uploaded_file)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("image", response.data)
                self.owner.refresh_from_db()
                self.assertFalse(self.owner.profile_image)

    def test_rejects_excessive_dimensions_before_full_processing(self):
        response = self.upload(image_upload(size=(4097, 1)))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("4096", response.data["image"][0])

    def test_upload_retrieve_replace_and_delete_cleanup(self):
        first_response = self.upload(image_upload(name="first.png"))
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.owner.refresh_from_db()
        first_name = self.owner.profile_image.name
        first_path = Path(self.media_directory.name, first_name)
        self.assertTrue(first_path.exists())

        get_response = self.client.get(self.image_url)
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(get_response["Content-Type"], "image/jpeg")
        self.assertEqual(get_response["Cache-Control"], "private, no-store")
        self.assertEqual(get_response["X-Content-Type-Options"], "nosniff")
        self.assertTrue(b"".join(get_response.streaming_content).startswith(b"\xff\xd8\xff"))

        with self.captureOnCommitCallbacks(execute=True):
            replace_response = self.upload(image_upload(name="replacement.webp", image_format="WEBP"))
        self.assertEqual(replace_response.status_code, status.HTTP_200_OK)
        self.owner.refresh_from_db()
        second_name = self.owner.profile_image.name
        self.assertNotEqual(first_name, second_name)
        self.assertFalse(first_path.exists())
        self.assertTrue(Path(self.media_directory.name, second_name).exists())

        with self.captureOnCommitCallbacks(execute=True):
            delete_response = self.client.delete(self.image_url)
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        self.owner.refresh_from_db()
        self.assertFalse(self.owner.profile_image)
        self.assertFalse(Path(self.media_directory.name, second_name).exists())
        self.assertEqual(self.client.get(self.image_url).status_code, status.HTTP_404_NOT_FOUND)

    def test_operations_require_authentication(self):
        self.client.force_authenticate(user=None)

        self.assertEqual(self.client.get(self.image_url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post(self.image_url, {}, format="multipart").status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.delete(self.image_url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_other_user_cannot_retrieve_replace_or_delete_owner_image(self):
        self.assertEqual(self.upload(image_upload()).status_code, status.HTTP_200_OK)
        self.owner.refresh_from_db()
        owner_name = self.owner.profile_image.name

        self.client.force_authenticate(user=self.other)
        self.assertEqual(self.client.get(self.image_url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(self.image_url).status_code, status.HTTP_200_OK)
        other_upload = self.client.post(
            self.image_url,
            {"image": image_upload(name="other.png")},
            format="multipart",
        )
        self.assertEqual(other_upload.status_code, status.HTTP_200_OK)

        self.owner.refresh_from_db()
        self.other.refresh_from_db()
        self.assertEqual(self.owner.profile_image.name, owner_name)
        self.assertNotEqual(self.other.profile_image.name, owner_name)

    def test_private_storage_path_is_not_exposed_or_served(self):
        response = self.upload(image_upload())
        self.owner.refresh_from_db()

        self.assertEqual(response.data["profile_image_url"], "http://testserver/api/auth/me/profile-image/")
        self.assertNotIn(self.owner.profile_image.name, response.data["profile_image_url"])
        direct_response = self.client.get(f"/media/{self.owner.profile_image.name}")
        self.assertEqual(direct_response.status_code, status.HTTP_404_NOT_FOUND)
