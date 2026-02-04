import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { employeeService } from "../../services/employeeService";
import type { CreateEmployeeInput } from "../../types/employee";
import "./CSVImportModal.css";

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  data: Partial<CreateEmployeeInput>;
  errors: string[];
  row: number;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

const REQUIRED_COLUMNS = [
  "firstName",
  "lastName",
  "email",
  "nationalId",
  "socialSecurity",
];
const ALL_COLUMNS = [
  "firstName",
  "lastName",
  "email",
  "nationalId",
  "socialSecurity",
  "phone",
  "position",
  "contractType",
  "hireDate",
  "employeeNumber",
  "workSchedule",
];

export default function CSVImportModal({
  isOpen,
  onClose,
  onSuccess,
}: CSVImportModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [_file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setError(t("employees.import.invalidFileType"));
      return;
    }

    setFile(selectedFile);
    setError(null);
    parseCSV(selectedFile);
  };

  const parseCSV = (csvFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        setError(t("employees.import.emptyFile"));
        return;
      }

      // Parse header
      const headerLine = lines[0];
      const headers = headerLine
        .split(",")
        .map((h) => h.trim().replace(/^"|"$/g, ""));

      // Validate required columns
      const missingColumns = REQUIRED_COLUMNS.filter(
        (col) => !headers.includes(col),
      );
      if (missingColumns.length > 0) {
        setError(
          t("employees.import.missingColumns", {
            columns: missingColumns.join(", "),
          }),
        );
        return;
      }

      // Parse rows
      const parsed: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const rowErrors: string[] = [];
        const data: Partial<CreateEmployeeInput> = {};

        headers.forEach((header, index) => {
          const value = values[index]?.trim();
          if (ALL_COLUMNS.includes(header)) {
            (data as any)[header] = value || undefined;
          }
        });

        // Validate required fields
        if (!data.firstName) rowErrors.push(t("validation.firstNameRequired"));
        if (!data.lastName) rowErrors.push(t("validation.lastNameRequired"));
        if (!data.email) rowErrors.push(t("validation.emailRequired"));
        if (!data.nationalId)
          rowErrors.push(t("validation.nationalIdRequired"));
        if (!data.socialSecurity)
          rowErrors.push(t("validation.socialSecurityRequired"));

        // Validate email format
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          rowErrors.push(t("validation.invalidEmail"));
        }

        // Set defaults
        if (!data.contractType) data.contractType = "indefinido";
        if (!data.hireDate) data.hireDate = new Date().toISOString();
        else data.hireDate = new Date(data.hireDate).toISOString();

        parsed.push({ data, errors: rowErrors, row: i + 1 });
      }

      setParsedData(parsed);
      setStep("preview");
    };
    reader.readAsText(csvFile);
  };

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const handleImport = async () => {
    const validRows = parsedData.filter((row) => row.errors.length === 0);
    if (validRows.length === 0) {
      setError(t("employees.import.noValidRows"));
      return;
    }

    setImporting(true);
    const importResult: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const row of validRows) {
      try {
        await employeeService.create(row.data as CreateEmployeeInput);
        importResult.success++;
      } catch (err: any) {
        importResult.failed++;
        importResult.errors.push({
          row: row.row,
          message: err.response?.data?.message || t("messages.errorOccurred"),
        });
      }
    }

    // Count invalid rows as failed
    const invalidRows = parsedData.filter((row) => row.errors.length > 0);
    importResult.failed += invalidRows.length;
    invalidRows.forEach((row) => {
      importResult.errors.push({
        row: row.row,
        message: row.errors.join(", "),
      });
    });

    setResult(importResult);
    setStep("result");
    setImporting(false);

    if (importResult.success > 0) {
      onSuccess();
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setResult(null);
    setStep("upload");
    setError(null);
    onClose();
  };

  const downloadTemplate = () => {
    const headers = ALL_COLUMNS.join(",");
    const example =
      "John,Doe,john@example.com,12345678A,28 1234567890,+34612345678,Waiter,indefinido,2024-01-15,EMP001,full-time";
    const content = `${headers}\n${example}`;
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee_import_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content import-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{t("employees.import.title")}</h2>
          <button className="modal-close" onClick={handleClose}>
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
          {error && <div className="error-alert">{error}</div>}

          {step === "upload" && (
            <div className="upload-section">
              <div
                className="upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <h3>{t("employees.import.selectFile")}</h3>
                <p>{t("employees.import.dropzone")}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  hidden
                />
              </div>

              <div className="template-section">
                <h4>{t("employees.import.needTemplate")}</h4>
                <button className="btn-secondary" onClick={downloadTemplate}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {t("employees.import.downloadTemplate")}
                </button>
              </div>

              <div className="format-info">
                <h4>{t("employees.import.requiredFields")}</h4>
                <ul>
                  <li>
                    <code>firstName</code> - {t("employee.firstName")}
                  </li>
                  <li>
                    <code>lastName</code> - {t("employee.lastName")}
                  </li>
                  <li>
                    <code>email</code> - {t("auth.email")}
                  </li>
                  <li>
                    <code>nationalId</code> - {t("employee.nationalId")}
                  </li>
                  <li>
                    <code>socialSecurity</code> - {t("employee.socialSecurity")}
                  </li>
                </ul>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="preview-section">
              <div className="preview-summary">
                <div className="summary-item valid">
                  <span className="count">
                    {parsedData.filter((r) => r.errors.length === 0).length}
                  </span>
                  <span className="label">
                    {t("employees.import.validRows")}
                  </span>
                </div>
                <div className="summary-item invalid">
                  <span className="count">
                    {parsedData.filter((r) => r.errors.length > 0).length}
                  </span>
                  <span className="label">
                    {t("employees.import.invalidRows")}
                  </span>
                </div>
              </div>

              <div className="preview-table-container">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>{t("employees.import.row")}</th>
                      <th>{t("employee.firstName")}</th>
                      <th>{t("employee.lastName")}</th>
                      <th>{t("auth.email")}</th>
                      <th>{t("employee.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row) => (
                      <tr
                        key={row.row}
                        className={row.errors.length > 0 ? "has-errors" : ""}
                      >
                        <td>{row.row}</td>
                        <td>{row.data.firstName || "-"}</td>
                        <td>{row.data.lastName || "-"}</td>
                        <td>{row.data.email || "-"}</td>
                        <td>
                          {row.errors.length > 0 ? (
                            <span
                              className="status-error"
                              title={row.errors.join("\n")}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                              </svg>
                              {row.errors.length} {t("employees.import.errors")}
                            </span>
                          ) : (
                            <span className="status-valid">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              {t("employees.import.valid")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <p className="more-rows">
                    +{parsedData.length - 10} {t("employees.import.moreRows")}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === "result" && result && (
            <div className="result-section">
              <div
                className={`result-icon ${result.success > 0 ? "success" : "error"}`}
              >
                {result.success > 0 ? (
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ) : (
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                )}
              </div>
              <h3>
                {result.success > 0
                  ? t("employees.import.uploadSuccess", {
                      count: result.success,
                    })
                  : t("employees.import.uploadError")}
              </h3>
              {result.failed > 0 && (
                <div className="result-errors">
                  <p>
                    {t("employees.import.failedRows", { count: result.failed })}
                  </p>
                  <ul>
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>
                        {t("employees.import.row")} {err.row}: {err.message}
                      </li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>
                        +{result.errors.length - 5}{" "}
                        {t("employees.import.moreErrors")}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === "upload" && (
            <button className="btn-secondary" onClick={handleClose}>
              {t("common.cancel")}
            </button>
          )}
          {step === "preview" && (
            <>
              <button
                className="btn-secondary"
                onClick={() => setStep("upload")}
              >
                {t("common.back")}
              </button>
              <button
                className="btn-primary"
                onClick={handleImport}
                disabled={
                  importing ||
                  parsedData.filter((r) => r.errors.length === 0).length === 0
                }
              >
                {importing ? (
                  <>
                    <span className="btn-spinner" />
                    {t("common.loading")}
                  </>
                ) : (
                  t("employees.import.importEmployees", {
                    count: parsedData.filter((r) => r.errors.length === 0)
                      .length,
                  })
                )}
              </button>
            </>
          )}
          {step === "result" && (
            <button className="btn-primary" onClick={handleClose}>
              {t("common.close")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
