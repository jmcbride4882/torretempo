import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useModule } from "../../hooks/useModule";
import "./CustomFieldsStudioModal.css";

interface CustomFieldsStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fields: CustomField[]) => void;
  existingFields?: CustomField[];
}

export interface CustomField {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "dropdown";
  required: boolean;
  options?: string[]; // For dropdown type
}

const FIELD_TYPES = [
  { value: "text", label: "Text", icon: "type" },
  { value: "number", label: "Number", icon: "hash" },
  { value: "date", label: "Date", icon: "calendar" },
  { value: "dropdown", label: "Dropdown", icon: "list" },
];

export default function CustomFieldsStudioModal({
  isOpen,
  onClose,
  onSave,
  existingFields = [],
}: CustomFieldsStudioModalProps) {
  const { t } = useTranslation();
  const { enabled: hasWhiteLabel, moduleInfo } = useModule("white_label");

  const [fields, setFields] = useState<CustomField[]>(existingFields);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [newOption, setNewOption] = useState("");

  const generateId = () =>
    `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addField = () => {
    const newField: CustomField = {
      id: generateId(),
      name: "",
      type: "text",
      required: false,
    };
    setEditingField(newField);
  };

  const saveField = () => {
    if (!editingField || !editingField.name.trim()) return;

    setFields((prev) => {
      const existing = prev.find((f) => f.id === editingField.id);
      if (existing) {
        return prev.map((f) => (f.id === editingField.id ? editingField : f));
      }
      return [...prev, editingField];
    });
    setEditingField(null);
  };

  const deleteField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const editField = (field: CustomField) => {
    setEditingField({ ...field });
  };

  const addOption = () => {
    if (!editingField || !newOption.trim()) return;
    setEditingField({
      ...editingField,
      options: [...(editingField.options || []), newOption.trim()],
    });
    setNewOption("");
  };

  const removeOption = (index: number) => {
    if (!editingField) return;
    setEditingField({
      ...editingField,
      options: editingField.options?.filter((_, i) => i !== index),
    });
  };

  const handleSave = () => {
    onSave(fields);
    onClose();
  };

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case "text":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        );
      case "number":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
            <line x1="10" y1="3" x2="8" y2="21" />
            <line x1="16" y1="3" x2="14" y2="21" />
          </svg>
        );
      case "date":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case "dropdown":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  // Module gating - show upgrade prompt if white_label not enabled
  if (!hasWhiteLabel) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content custom-fields-modal locked"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{t("employees.customFields.title")}</h2>
            <button className="modal-close" onClick={onClose}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="modal-body">
            <div className="locked-content">
              <div className="locked-icon">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3>{t("billing.locked.featureLockedTitle")}</h3>
              <p>{t("employees.customFields.lockedDescription")}</p>
              <div className="module-info">
                <span className="module-name">{moduleInfo?.name}</span>
                <span className="module-tier">{moduleInfo?.tier}</span>
              </div>
              <a href="#upgrade" className="btn-primary">
                {t("billing.locked.upgradeButton")}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content custom-fields-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{t("employees.customFields.title")}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Field Editor */}
          {editingField && (
            <div className="field-editor">
              <h3>
                {fields.find((f) => f.id === editingField.id)
                  ? t("employees.customFields.editField")
                  : t("employees.customFields.addField")}
              </h3>

              <div className="form-group">
                <label>{t("employees.customFields.fieldName")}</label>
                <input
                  type="text"
                  value={editingField.name}
                  onChange={(e) =>
                    setEditingField({ ...editingField, name: e.target.value })
                  }
                  placeholder={t("employees.customFields.fieldNamePlaceholder")}
                />
              </div>

              <div className="form-group">
                <label>{t("employees.customFields.fieldType")}</label>
                <div className="type-selector">
                  {FIELD_TYPES.map((type) => (
                    <button
                      key={type.value}
                      className={`type-option ${editingField.type === type.value ? "active" : ""}`}
                      onClick={() =>
                        setEditingField({
                          ...editingField,
                          type: type.value as any,
                        })
                      }
                    >
                      {getFieldTypeIcon(type.value)}
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {editingField.type === "dropdown" && (
                <div className="form-group">
                  <label>{t("employees.customFields.options")}</label>
                  <div className="options-list">
                    {editingField.options?.map((option, index) => (
                      <div key={index} className="option-item">
                        <span>{option}</span>
                        <button
                          className="btn-remove-option"
                          onClick={() => removeOption(index)}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="add-option">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder={t("employees.customFields.addOption")}
                      onKeyDown={(e) => e.key === "Enter" && addOption()}
                    />
                    <button className="btn-add-option" onClick={addOption}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              <label className="checkbox-group">
                <input
                  type="checkbox"
                  checked={editingField.required}
                  onChange={(e) =>
                    setEditingField({
                      ...editingField,
                      required: e.target.checked,
                    })
                  }
                />
                <span>{t("employees.customFields.required")}</span>
              </label>

              <div className="editor-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setEditingField(null)}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="btn-primary"
                  onClick={saveField}
                  disabled={!editingField.name.trim()}
                >
                  {t("common.save")}
                </button>
              </div>
            </div>
          )}

          {/* Fields List */}
          {!editingField && (
            <>
              <div className="fields-header">
                <p>{t("employees.customFields.description")}</p>
                <button className="btn-add-field" onClick={addField}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {t("employees.customFields.addField")}
                </button>
              </div>

              {fields.length === 0 ? (
                <div className="empty-fields">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  <h4>{t("employees.customFields.noFields")}</h4>
                  <p>{t("employees.customFields.noFieldsDescription")}</p>
                </div>
              ) : (
                <div className="fields-list">
                  {fields.map((field) => (
                    <div key={field.id} className="field-item">
                      <div className="field-icon">
                        {getFieldTypeIcon(field.type)}
                      </div>
                      <div className="field-info">
                        <span className="field-name">{field.name}</span>
                        <span className="field-meta">
                          {field.type}
                          {field.required && (
                            <span className="required-badge">
                              {t("employee.required")}
                            </span>
                          )}
                          {field.options && (
                            <span className="options-count">
                              {field.options.length} options
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="field-actions">
                        <button
                          className="btn-icon"
                          onClick={() => editField(field)}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => deleteField(field.id)}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {!editingField && (
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button className="btn-primary" onClick={handleSave}>
              {t("common.save")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
