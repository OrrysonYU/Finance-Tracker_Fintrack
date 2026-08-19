import { Alert, Switch } from "../../../components/ui";
import { useAccountSectionForm } from "../useAccountSectionForm";
import { SettingFormActions } from "./SettingFormActions";

export function PrivacyDataSettings({ user, onSave }) {
  const form = useAccountSectionForm({
    initialValues: { ai_personalization_enabled: Boolean(user?.ai_personalization_enabled) },
    onSave,
    successMessage: "Your privacy preference is up to date.",
  });

  return (
    <form className="account-center__form" onSubmit={form.submit}>
      <div className="account-center__setting-list">
        <Switch
          name="ai_personalization_enabled"
          label="Personalized financial guidance"
          description="Allow Fintrack to use your account activity to tailor guidance within your private workspace."
          checked={form.values.ai_personalization_enabled}
          onChange={(value) => form.setValue("ai_personalization_enabled", value)}
          disabled={form.isSaving}
        />
      </div>
      <p className="account-center__privacy-note">Your profile and financial records remain scoped to your authenticated account. This setting does not make your data public.</p>
      {form.formError && <Alert tone="error" title="Privacy preference could not be saved">{form.formError}</Alert>}
      {form.notice && <Alert tone="success" title="Privacy preference saved">{form.notice}</Alert>}
      <SettingFormActions dirty={form.dirty} isSaving={form.isSaving} onReset={form.reset} />
    </form>
  );
}
