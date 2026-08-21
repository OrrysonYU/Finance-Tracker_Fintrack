# Fintrack username policy

Usernames are identity handles, not display names. New and edited usernames are
normalized with Unicode NFKC, trimmed at the edges, and case-folded before
validation. They must be 3-30 characters and contain only lowercase ASCII
letters, digits, `.`, `_`, or `-`; separators cannot lead or trail and internal
whitespace is rejected. The canonical value is stored in `User.username` and a
database-unique `username_canonical` key is used for all uniqueness checks,
authentication lookup, and throttling. This makes case and normalization
variants equivalent while keeping authentication contracts unchanged.

`root`, `admin`, `administrator`, and `system` are reserved. Separator variants
and common Cyrillic/Greek confusable forms are rejected as reserved before the
character policy is applied. The reserved set is intentionally narrow so
ordinary names remain available.

Display names are independent profile data. They retain legitimate Unicode and
emoji and are not subject to username character rules.

Migration `users.0005_harden_username_policy` populates the canonical key for
existing users and aborts on canonical collisions without merging accounts.
Legacy usernames that do not meet the new registration policy remain intact;
they can authenticate through the canonical key, while any future username
change must meet the hardened policy.
