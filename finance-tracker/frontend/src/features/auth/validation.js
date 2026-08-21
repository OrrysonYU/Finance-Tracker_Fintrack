import { getUsernameError } from "../../lib/username-policy";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(values) {
  return {
    username: values.username.trim() ? "" : "Enter your username.",
    password: values.password ? "" : "Enter your password.",
  };
}

export function validateRegistration(values) {
  return {
    username: getUsernameError(values.username, "Choose a username."),
    email: !values.email.trim()
      ? "Enter your email address."
      : emailPattern.test(values.email.trim())
        ? ""
        : "Enter a valid email address.",
    password:
      values.password.length >= 8
        ? ""
        : "Use at least 8 characters for your password.",
  };
}

export function hasValidationErrors(errors) {
  return Object.values(errors).some(Boolean);
}
