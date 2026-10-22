'use client';

import type { User } from '@supabase/supabase-js';

import { useDialogModal } from '../feedback/useDialogModal';
import { SettingsAccountSection } from './SettingsAccountSection';
import { SettingsHeader } from './SettingsHeader';

interface SettingsDialogProps {
  user: User;
  onClose: () => void;
}

// Modal home for account controls. New sections mount under the header.
// Pressing the backdrop (not the padded body) dismisses, like the review dialog.

export function SettingsDialog(props: SettingsDialogProps) {
  const { dialog, closeButton } = useDialogModal();

  function handleBackdrop(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      props.onClose();
    }
  }

  return (
    <dialog
      ref={dialog}
      className="settings-dialog"
      aria-labelledby="settings-title"
      onCancel={props.onClose}
      onClick={handleBackdrop}
    >
      <div className="settings-body">
        <SettingsHeader
          closeButton={closeButton}
          onClose={props.onClose}
        />
        <SettingsAccountSection user={props.user} />
      </div>
    </dialog>
  );
}
