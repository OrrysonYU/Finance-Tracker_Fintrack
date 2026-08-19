import { useEffect, useState } from "react";
import { Trash2, Upload } from "lucide-react";

import { Alert, Button, Field, Input, Select, UserAvatar } from "../../../components/ui";
import { CURRENCY_OPTIONS, TIMEZONE_OPTIONS } from "../account-center-options";
import { useAccountSectionForm } from "../useAccountSectionForm";
import { validateProfile } from "../validation";
import { SettingFormActions } from "./SettingFormActions";
import { PROFILE_IMAGE_ACCEPT, PROFILE_IMAGE_FORMAT_GUIDANCE, validateProfileImage } from "../profile-image";

function profileValues(user) {
  return {
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    display_name: user?.display_name || "",
    username: user?.username || "",
    email: user?.email || "",
    phone_number: user?.phone_number || "",
    country: user?.country || "",
    timezone: user?.timezone || "Africa/Nairobi",
    default_currency: user?.default_currency || "KES",
  };
}

function ensureCurrent(options, value) {
  return options.some((option) => option.value === value)
    ? options
    : [{ value, label: value }, ...options];
}

export function ProfileSettings({ user, onSave, onUploadImage, onDeleteImage }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const [imageNotice, setImageNotice] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const form = useAccountSectionForm({
    initialValues: profileValues(user),
    onSave,
    successMessage: "Your profile details are up to date.",
    validate: validateProfile,
  });
  const previewUser = { ...user, ...form.values };
  const avatarUser = previewUrl ? { ...previewUser, profile_image_src: previewUrl } : previewUser;

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function chooseImage(event) {
    const file = event.target.files?.[0];
    setImageNotice("");
    const validationError = validateProfileImage(file);
    if (validationError) {
      setSelectedImage(null);
      setImageError(validationError);
      setPreviewUrl("");
      return;
    }
    setImageError("");
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadImage() {
    if (!selectedImage || !onUploadImage) return;
    setIsUploading(true);
    setImageError("");
    setImageNotice("");
    try {
      await onUploadImage(selectedImage);
      setSelectedImage(null);
      setPreviewUrl("");
      setImageNotice("Profile picture updated.");
    } catch (error) {
      const message = error?.response?.data?.image?.[0] || error?.response?.data?.detail;
      setImageError(message || "The profile picture could not be uploaded. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function deleteImage() {
    if (!user?.profile_image_url || !onDeleteImage) return;
    setIsDeleting(true);
    setImageError("");
    setImageNotice("");
    try {
      await onDeleteImage();
      setImageNotice("Profile picture removed.");
    } catch {
      setImageError("The profile picture could not be removed. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form className="account-center__form" onSubmit={form.submit} noValidate>
      <div className="account-center__avatar-panel">
        <UserAvatar user={avatarUser} size="xl" />
        <div className="account-center__avatar-copy">
          <strong>Profile picture</strong>
          <span>{PROFILE_IMAGE_FORMAT_GUIDANCE}</span>
          <Field label="Choose image" hint="The selected image is previewed locally before upload." error={imageError} className="account-center__avatar-field">
            <Input type="file" accept={PROFILE_IMAGE_ACCEPT} onChange={chooseImage} disabled={isUploading || isDeleting} />
          </Field>
          <div className="account-center__avatar-actions">
            <Button type="button" size="sm" onClick={uploadImage} disabled={!selectedImage || isDeleting} loading={isUploading}>
              <Upload size={16} aria-hidden="true" /> Upload picture
            </Button>
            {user?.profile_image_url && !selectedImage && (
              <Button type="button" size="sm" variant="danger" onClick={deleteImage} disabled={isUploading} loading={isDeleting}>
                <Trash2 size={16} aria-hidden="true" /> Remove
              </Button>
            )}
          </div>
          {imageNotice && <span className="account-center__avatar-status" role="status">{imageNotice}</span>}
        </div>
      </div>

      <fieldset className="account-center__fieldset">
        <legend>Personal details</legend>
        <div className="account-center__form-grid">
          <Field label="First name" required error={form.errors.first_name}>
            <Input autoComplete="given-name" value={form.values.first_name} onChange={(event) => form.setValue("first_name", event.target.value)} />
          </Field>
          <Field label="Last name" error={form.errors.last_name}>
            <Input autoComplete="family-name" value={form.values.last_name} onChange={(event) => form.setValue("last_name", event.target.value)} />
          </Field>
          <Field label="Display name" hint="The name shown in your Fintrack workspace." error={form.errors.display_name}>
            <Input autoComplete="nickname" value={form.values.display_name} onChange={(event) => form.setValue("display_name", event.target.value)} placeholder="How Fintrack should address you" />
          </Field>
          <Field label="Username" required hint="Used when signing in." error={form.errors.username}>
            <Input autoComplete="username" value={form.values.username} onChange={(event) => form.setValue("username", event.target.value)} />
          </Field>
          <Field label="Email" required error={form.errors.email}>
            <Input type="email" autoComplete="email" value={form.values.email} onChange={(event) => form.setValue("email", event.target.value)} />
          </Field>
          <Field label="Phone number" hint="Optional account contact number." error={form.errors.phone_number}>
            <Input type="tel" autoComplete="tel" value={form.values.phone_number} onChange={(event) => form.setValue("phone_number", event.target.value)} placeholder="+254 712 345 678" />
          </Field>
          <Field label="Country" error={form.errors.country}>
            <Input autoComplete="country-name" value={form.values.country} onChange={(event) => form.setValue("country", event.target.value)} placeholder="Kenya" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="account-center__fieldset">
        <legend>Regional settings</legend>
        <div className="account-center__form-grid">
          <Field label="Timezone" required hint="Used for report dates and account activity." error={form.errors.timezone}>
            <Select value={form.values.timezone} onChange={(event) => form.setValue("timezone", event.target.value)}>
              {ensureCurrent(TIMEZONE_OPTIONS, form.values.timezone).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </Field>
          <Field label="Default currency" required hint="Used as the default for new financial records." error={form.errors.default_currency}>
            <Select value={form.values.default_currency} onChange={(event) => form.setValue("default_currency", event.target.value)}>
              {ensureCurrent(CURRENCY_OPTIONS, form.values.default_currency).map((option) => <option key={option.value} value={option.value}>{option.value} - {option.label}</option>)}
            </Select>
          </Field>
        </div>
      </fieldset>

      {form.formError && <Alert tone="error" title="Profile could not be saved">{form.formError}</Alert>}
      {form.notice && <Alert tone="success" title="Profile saved">{form.notice}</Alert>}
      <SettingFormActions dirty={form.dirty} isSaving={form.isSaving} onReset={form.reset} />
    </form>
  );
}
