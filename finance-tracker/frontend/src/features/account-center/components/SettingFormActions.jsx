import { Button } from "../../../components/ui";

export function SettingFormActions({ dirty, isSaving, onReset }) {
  return (
    <div className="account-center__form-actions">
      <span className={`account-center__save-state${dirty ? " account-center__save-state--dirty" : ""}`} aria-live="polite">
        {dirty ? "Unsaved changes" : "Saved"}
      </span>
      <div className="account-center__form-buttons">
        {dirty && <Button variant="ghost" type="button" onClick={onReset} disabled={isSaving}>Discard</Button>}
        <Button type="submit" loading={isSaving} disabled={!dirty}>
          {isSaving ? "Saving changes" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
