
# Create your models here.
from django.db import models
from django.contrib.auth.models import User

class Report(models.Model):
    REPORT_TYPES = (
        ("monthly", "Monthly"),
        ("yearly", "Yearly"),
        ("custom", "Custom"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reports")
    title = models.CharField(max_length=120)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)  # ✅ matches admin
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.report_type})"
