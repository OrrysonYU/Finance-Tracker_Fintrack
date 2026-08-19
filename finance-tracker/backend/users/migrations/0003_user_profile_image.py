from django.db import migrations, models

import users.models


class Migration(migrations.Migration):
    dependencies = [("users", "0002_account_center_profile_preferences")]

    operations = [
        migrations.AddField(
            model_name="user",
            name="profile_image",
            field=models.ImageField(
                blank=True,
                help_text="Normalized profile image stored in private media storage.",
                max_length=255,
                null=True,
                upload_to=users.models.profile_image_upload_to,
            ),
        ),
    ]
