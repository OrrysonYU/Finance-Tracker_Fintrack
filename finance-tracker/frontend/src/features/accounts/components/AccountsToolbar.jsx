import { SlidersHorizontal } from "lucide-react";

import { SearchInput, Select } from "../../../components/ui";
import { accountTypes } from "../api";

export function AccountsToolbar({ accountCount, filters, onChange }) {
  return (
    <section className="finance-toolbar" aria-label="Account controls">
      <div className="finance-toolbar__primary">
        <SearchInput label="Search accounts" value={filters.search} onChange={(search) => onChange({ ...filters, search })} placeholder="Search by account or institution" />
        <div className="finance-toolbar__count" aria-live="polite">{accountCount} {accountCount === 1 ? "account" : "accounts"}</div>
      </div>
      <div className="finance-toolbar__controls">
        <SlidersHorizontal size={16} aria-hidden="true" />
        <Select aria-label="Filter by account type" value={filters.type} onChange={(event) => onChange({ ...filters, type: event.target.value })}>
          <option value="">All account types</option>{accountTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </Select>
        <Select aria-label="Sort accounts" value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value })}>
          <option value="name">Name A-Z</option><option value="balance-desc">Highest balance</option><option value="balance-asc">Lowest balance</option><option value="updated">Recently updated</option>
        </Select>
      </div>
    </section>
  );
}
