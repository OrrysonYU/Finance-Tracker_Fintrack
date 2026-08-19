import { useState } from "react";

import { getAccountError, hasChanges } from "./validation";

function valuesFromResponse(response, keys) {
  return Object.fromEntries(keys.map((key) => [key, response[key]]));
}

export function useAccountSectionForm({ initialValues, onSave, successMessage, validate }) {
  const [baseline, setBaseline] = useState(initialValues);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const dirty = hasChanges(values, baseline);

  function setValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setFormError("");
    setNotice("");
  }

  function reset() {
    setValues(baseline);
    setErrors({});
    setFormError("");
    setNotice("");
  }

  async function submit(event) {
    event.preventDefault();
    const validationErrors = validate?.(values) || {};
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      setFormError("Review the highlighted fields and try again.");
      return;
    }

    setIsSaving(true);
    setErrors({});
    setFormError("");
    setNotice("");

    try {
      const response = await onSave(values);
      const savedValues = valuesFromResponse(response, Object.keys(values));
      setValues(savedValues);
      setBaseline(savedValues);
      setNotice(successMessage);
    } catch (error) {
      const accountError = getAccountError(error);
      setErrors(accountError.fields);
      setFormError(accountError.form || "Your changes could not be saved. Review the details and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return { dirty, errors, formError, isSaving, notice, reset, setValue, submit, values };
}
