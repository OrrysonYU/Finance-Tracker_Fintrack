# Register your models here.
from django.contrib import admin
from .models import Report

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "report_type", "generated_at")
    list_filter = ("report_type", "generated_at")
