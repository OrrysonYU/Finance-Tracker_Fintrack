import { Alert, Switch } from "../../../components/ui";
import { useAccountSectionForm } from "../useAccountSectionForm";
import { SettingFormActions } from "./SettingFormActions";

export function NotificationSettings({ user, onSave }) {
  const form = useAccountSectionForm({
    initialValues: {
      notification_budget_updates: Boolean(user?.notification_budget_updates),
      notification_goal_updates: Boolean(user?.notification_goal_updates),
      notification_account_activity: Boolean(user?.notification_account_activity),
    },
    onSave,
    successMessage: "Your notification preferences are up to date.",
  });

  return (
    <form className="account-center__form" onSubmit={form.submit}>
      <div className="account-center__setting-list">
        <Switch
          name="notification_budget_updates"
          label="Budget progress"
          description="Updates about spending limits and budget progress in your Fintrack account."
          checked={form.values.notification_budget_updates}
          onChange={(value) => form.setValue("notification_budget_updates", value)}
          disabled={form.isSaving}
        />
        <Switch
          name="notification_goal_updates"
          label="Saving goal progress"
          description="Updates when your saving goals move closer to completion."
          checked={form.values.notification_goal_updates}
          onChange={(value) => form.setValue("notification_goal_updates", value)}
          disabled={form.isSaving}
        />
        <Switch
          name="notification_account_activity"
          label="Account activity"
          description="Updates about important activity recorded across your financial accounts."
          checked={form.values.notification_account_activity}
          onChange={(value) => form.setValue("notification_account_activity", value)}
          disabled={form.isSaving}
        />
      </div>
      {form.formError && <Alert tone="error" title="Notifications could not be saved">{form.formError}</Alert>}
      {form.notice && <Alert tone="success" title="Notifications saved">{form.notice}</Alert>}
      <SettingFormActions dirty={form.dirty} isSaving={form.isSaving} onReset={form.reset} />
    </form>
  );
}
