function asMessage(value) {
  if (Array.isArray(value)) return value.join(" ");
  return typeof value === "string" ? value : "";
}

export function getLoginError(error) {
  const data = error.response?.data;
  const message =
    asMessage(data?.detail) ||
    asMessage(data?.non_field_errors) ||
    asMessage(data?.username) ||
    asMessage(data?.password);

  if (message) return message;
  if (!error.response) {
    return "We could not reach Fintrack. Check your connection and try again.";
  }
  return "We could not sign you in. Check your username and password.";
}

export function getRegistrationErrors(error) {
  const data = error.response?.data;
  const fields = {
    email: asMessage(data?.email),
    password: asMessage(data?.password),
    username: asMessage(data?.username),
  };
  const formMessage =
    asMessage(data?.detail) || asMessage(data?.non_field_errors);

  if (formMessage) return { fields, form: formMessage };
  if (Object.values(fields).some(Boolean)) return { fields, form: "" };
  if (!error.response) {
    return {
      fields,
      form: "We could not reach Fintrack. Your details are still here—check your connection and try again.",
    };
  }
  return {
    fields,
    form: "We could not create your account. Review the details and try again.",
  };
}
