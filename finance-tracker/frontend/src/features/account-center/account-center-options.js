export const CURRENCY_OPTIONS = [
  ["KES", "Kenyan shilling"],
  ["USD", "US dollar"],
  ["EUR", "Euro"],
  ["GBP", "British pound"],
  ["ZAR", "South African rand"],
  ["NGN", "Nigerian naira"],
  ["GHS", "Ghanaian cedi"],
  ["UGX", "Ugandan shilling"],
  ["TZS", "Tanzanian shilling"],
  ["RWF", "Rwandan franc"],
  ["INR", "Indian rupee"],
  ["CAD", "Canadian dollar"],
  ["AUD", "Australian dollar"],
  ["JPY", "Japanese yen"],
  ["AED", "UAE dirham"],
  ["CHF", "Swiss franc"],
].map(([value, label]) => ({ value, label }));

export const TIMEZONE_OPTIONS = [
  ["Africa/Nairobi", "Nairobi (EAT)"],
  ["Africa/Cairo", "Cairo (EET)"],
  ["Africa/Johannesburg", "Johannesburg (SAST)"],
  ["Africa/Lagos", "Lagos (WAT)"],
  ["Europe/London", "London (GMT/BST)"],
  ["Europe/Berlin", "Berlin (CET/CEST)"],
  ["America/New_York", "New York (ET)"],
  ["America/Chicago", "Chicago (CT)"],
  ["America/Denver", "Denver (MT)"],
  ["America/Los_Angeles", "Los Angeles (PT)"],
  ["America/Toronto", "Toronto (ET)"],
  ["Asia/Kolkata", "Kolkata (IST)"],
  ["Asia/Singapore", "Singapore (SGT)"],
  ["Asia/Tokyo", "Tokyo (JST)"],
  ["Australia/Sydney", "Sydney (AET)"],
  ["UTC", "UTC"],
].map(([value, label]) => ({ value, label }));

export const LOCALE_OPTIONS = [
  { value: "en-KE", label: "English (Kenya)" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "fr-FR", label: "French (France)" },
];
