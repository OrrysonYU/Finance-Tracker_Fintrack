import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { MoreHorizontal } from "lucide-react";

export function ActionMenu({ items, label = "Open actions" }) {
  return (
    <Menu as="div" className="ui-action-menu">
      <MenuButton className="ui-action-menu__trigger" aria-label={label}>
        <MoreHorizontal size={18} aria-hidden="true" />
      </MenuButton>
      <MenuItems transition className="ui-action-menu__items" anchor="bottom end">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <MenuItem key={item.label} disabled={item.disabled}>
              {({ focus }) => (
                <button
                  type="button"
                  className={`ui-action-menu__item ${focus ? "ui-action-menu__item--focus" : ""} ${item.tone === "danger" ? "ui-action-menu__item--danger" : ""}`}
                  onClick={item.onSelect}
                  disabled={item.disabled}
                >
                  {Icon && <Icon size={16} aria-hidden="true" />}
                  <span>{item.label}</span>
                </button>
              )}
            </MenuItem>
          );
        })}
      </MenuItems>
    </Menu>
  );
}
