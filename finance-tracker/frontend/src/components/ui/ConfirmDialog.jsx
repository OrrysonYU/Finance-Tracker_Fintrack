import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { motion, useReducedMotion } from "framer-motion";
import { TriangleAlert } from "lucide-react";

import { Button } from "./Button";

export function ConfirmDialog({
  confirmLabel = "Confirm",
  description,
  isPending = false,
  onClose,
  onConfirm,
  open,
  title,
  tone = "danger",
}) {
  const reduceMotion = useReducedMotion();

  return (
    <Dialog open={open} onClose={isPending ? () => {} : onClose} className="ui-dialog">
      <DialogBackdrop className="ui-dialog__backdrop" />
      <div className="ui-dialog__positioner">
        <DialogPanel
          as={motion.div}
          initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18 }}
          className="ui-dialog__panel"
        >
          <div className={`ui-dialog__icon ui-dialog__icon--${tone}`}>
            <TriangleAlert size={21} aria-hidden="true" />
          </div>
          <div className="ui-dialog__copy">
            <DialogTitle className="ui-dialog__title">{title}</DialogTitle>
            <p className="ui-dialog__description">{description}</p>
          </div>
          <div className="ui-dialog__actions">
            <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              onClick={onConfirm}
              loading={isPending}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
