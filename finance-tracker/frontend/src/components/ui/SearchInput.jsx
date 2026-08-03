import { Search, X } from "lucide-react";

export function SearchInput({ className = "", label = "Search", onChange, value, ...props }) {
  return (
    <div className={`ui-search ${className}`.trim()}>
      <Search className="ui-search__icon" size={17} aria-hidden="true" />
      <input
        type="search"
        className="ui-search__input"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
      {value && (
        <button
          type="button"
          className="ui-search__clear"
          onClick={() => onChange("")}
          aria-label={`Clear ${label.toLowerCase()}`}
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
