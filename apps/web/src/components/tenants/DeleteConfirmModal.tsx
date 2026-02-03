import { useState } from "react";
import "./DeleteConfirmModal.css";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  tenantName: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  tenantName,
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      console.error("Failed to delete tenant:", err);
      setError(err.message || "Failed to delete tenant");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="delete-confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="delete-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2>Delete Tenant</h2>
        <p className="delete-message">
          Are you sure you want to delete <strong>{tenantName}</strong>?
        </p>
        <p className="delete-warning">
          This is a <strong>soft delete</strong>. The tenant will be marked as
          deleted but data will be preserved for compliance (4-year retention).
        </p>

        {error && <div className="error-alert">{error}</div>}

        <div className="delete-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Tenant"}
          </button>
        </div>
      </div>
    </div>
  );
}
