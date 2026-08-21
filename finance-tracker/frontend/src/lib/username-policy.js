const usernamePattern = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/;
const reservedUsernames = new Set(["root", "admin", "administrator", "system"]);
const confusables = new Map([
  ["\u0430", "a"], ["\u0435", "e"], ["\u043e", "o"], ["\u0440", "p"],
  ["\u0441", "c"], ["\u0445", "x"], ["\u0443", "y"], ["\u0455", "s"],
  ["\u03b1", "a"], ["\u03b5", "e"], ["\u03bf", "o"], ["\u03c1", "p"],
  ["\u03b9", "i"], ["\u03bc", "m"], ["\u03c4", "t"],
]);

function confusableSkeleton(value) {
  return Array.from(value, (character) => confusables.get(character) || character)
    .join("")
    .replace(/[._-]+/g, "");
}

function isReserved(value) {
  if (reservedUsernames.has(confusableSkeleton(value))) return true;
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .some((segment) => reservedUsernames.has(confusableSkeleton(segment)));
}

export function getUsernameError(value, emptyMessage = "Enter your username.") {
  const username = value.normalize("NFKC").trim().toLowerCase();
  if (!username) return emptyMessage;
  if (isReserved(username)) return "This username is reserved.";
  if (username.length < 3) return "Username is too short.";
  if (username.length > 30) return "Username is too long.";
  if (/\s/.test(username)) return "Username cannot contain spaces.";
  if (!usernamePattern.test(username)) return "Username contains unsupported characters.";
  return "";
}
