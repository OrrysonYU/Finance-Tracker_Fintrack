import { Alert, Field, Select, ThemeToggle } from "../../../components/ui";
import { LOCALE_OPTIONS } from "../account-center-options";
import { useAccountSectionForm } from "../useAccountSectionForm";
import { SettingFormActions } from "./SettingFormActions";

export function PreferenceSettings({ user, onSave }) {
  const form = useAccountSectionForm({
    initialValues: { locale: user?.locale || "en-KE" },
    onSave,
    successMessage: "Your formatting preference is up to date.",
  });
  const locales = LOCALE_OPTIONS.some((option) => option.value === form.values.locale)
    ? LOCALE_OPTIONS
    : [{ value: form.values.locale, label: form.values.locale }, ...LOCALE_OPTIONS];

  return (
    <div className="account-center__preference-stack">
      <div className="account-center__theme-setting">
        <ThemeToggle showLabel />
        <p>Appearance is saved on this device and follows the shared Light, Dark, and System theme architecture.</p>
      </div>
      <form className="account-center__form account-center__form--compact" onSubmit={form.submit}>
        <Field label="Formatting locale" hint="Controls regional number and date formatting where available." error={form.errors.locale}>
          <Select value={form.values.locale} onChange={(event) => form.setValue("locale", event.target.value)}>
            {locales.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </Field>
        {form.formError && <Alert tone="error" title="Preference could not be saved">{form.formError}</Alert>}
        {form.notice && <Alert tone="success" title="Preference saved">{form.notice}</Alert>}
        <SettingFormActions dirty={form.dirty} isSaving={form.isSaving} onReset={form.reset} />
      </form>
    </div>
  );
}
