import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useEffect, useRef } from "react";

function SortIcon({ active, direction }) {
  if (!active) return <ChevronsUpDown size={14} aria-hidden="true" />;
  return direction === "asc" ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />;
}

function SelectionCheckbox({ checked, indeterminate = false, label, onChange }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={label} />;
}

export function DataTable({ allSelected = false, caption, columns, getRowId = (row) => row.id, getRowLabel = (row) => String(row.id), isBusy = false, isRowSelected = () => false, onSelectAll, onSelectRow, onSort, rows, selectedCount = 0, selectionLabel = "rows", sort }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="ui-data-table" role="region" aria-label={caption} aria-busy={isBusy || undefined} tabIndex={0}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead><tr>
          {onSelectRow && <th className="ui-data-table__select"><SelectionCheckbox checked={allSelected} indeterminate={!allSelected && selectedCount > 0} onChange={(event) => onSelectAll(event.target.checked)} label={`Select all visible ${selectionLabel}`} /></th>}
          {columns.map((column) => {
            const active = sort?.key === column.sortKey;
            const ariaSort = column.sortKey ? active ? sort.direction === "asc" ? "ascending" : "descending" : "none" : undefined;
            return <th key={column.key} scope="col" aria-sort={ariaSort} className={column.align === "right" ? "ui-data-table__right" : ""}>
              {column.sortKey ? <button type="button" className="ui-data-table__sort" onClick={() => onSort(column.sortKey)} aria-label={`Sort by ${column.label}`}>{column.label}<SortIcon active={active} direction={sort?.direction} /></button> : column.label}
            </th>;
          })}
        </tr></thead>
        <tbody>
          {rows.map((row, index) => {
            const rowId = getRowId(row);
            const selected = isRowSelected(row);
            return <motion.tr key={rowId} initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16, delay: Math.min(index, 8) * 0.018 }} data-selected={selected || undefined}>
              {onSelectRow && <td className="ui-data-table__select"><SelectionCheckbox checked={selected} onChange={(event) => onSelectRow(row, event.target.checked)} label={`Select ${getRowLabel(row)}`} /></td>}
              {columns.map((column) => <td key={column.key} className={column.align === "right" ? "ui-data-table__right" : ""}>{column.render(row)}</td>)}
            </motion.tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
