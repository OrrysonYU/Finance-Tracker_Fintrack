import { getUsernameError } from "../../lib/username-policy";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+0-9 ()().-]+$/;

export function validateProfile(values) {
  const errors = {};

  if (!values.first_name.trim()) errors.first_name = "Enter your first name.";
  errors.username = getUsernameError(values.username);
  if (!errors.username) delete errors.username;
  if (!values.email.trim()) {
    errors.email = "Enter your email address.";
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (values.phone_number.trim() && (
    values.phone_number.trim().length < 7 || !phonePattern.test(values.phone_number.trim())
  )) {
    errors.phone_number = "Enter a valid phone number.";
  }

  return errors;
}

export function getAccountError(error) {
  const data = error?.response?.data;
  if (!data) {
    return { form: "We could not reach Fintrack. Check your connection and try again.", fields: {} };
  }

  const fields = {};
  Object.entries(data).forEach(([field, value]) => {
    if (field === "detail" || field === "non_field_errors") return;
    fields[field] = Array.isArray(value) ? value.join(" ") : String(value);
  });
  const form = Array.isArray(data.detail)
    ? data.detail.join(" ")
    : data.detail || (Array.isArray(data.non_field_errors) ? data.non_field_errors.join(" ") : data.non_field_errors) || "";

  return { form, fields };
}

export function hasChanges(current, initial) {
  return JSON.stringify(current) !== JSON.stringify(initial);
}
