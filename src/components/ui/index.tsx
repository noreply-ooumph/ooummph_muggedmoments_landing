/**
 * MuggedMoments — UI Primitives
 * Accessible, keyboard-navigable, minimal React components.
 */

"use client";

import React, { useEffect } from "react";

// ============================================================
// BUTTON
// ============================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-amber-400 text-zinc-950 hover:bg-amber-300 shadow-lg shadow-amber-400/10",
    secondary:
      "bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700",
    ghost: "text-zinc-300 hover:text-white hover:bg-zinc-800/60",
    outline:
      "bg-transparent text-zinc-200 border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

// ============================================================
// MODAL
// ============================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
          <h2 id="modal-title" className="text-xl font-bold text-white tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-lg font-bold transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// INPUT
// ============================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helpText?: string;
}

export function Input({
  label,
  error,
  helpText,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-xs font-semibold text-zinc-300 uppercase tracking-wider"
      >
        {label}
        {props.required && (
          <span className="text-amber-400 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      <input
        id={inputId}
        className={`
          w-full px-4 py-3 rounded-xl bg-zinc-950 border text-zinc-100 placeholder-zinc-500 text-sm
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
          ${error ? "border-red-500/70 bg-red-500/5" : "border-zinc-800 hover:border-zinc-700"}
          ${className}
        `}
        aria-describedby={`${error ? errorId : ""} ${helpText ? helpId : ""}`.trim() || undefined}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-400 mt-1">
          {error}
        </p>
      )}
      {helpText && !error && (
        <p id={helpId} className="text-xs text-zinc-500 mt-1">
          {helpText}
        </p>
      )}
    </div>
  );
}

// ============================================================
// SELECT
// ============================================================

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function Select({
  label,
  error,
  options,
  placeholder = "Select an option",
  id,
  className = "",
  ...props
}: SelectProps) {
  const selectId = id ?? `select-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const errorId = `${selectId}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
        {label}
        {props.required && (
          <span className="text-amber-400 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      <select
        id={selectId}
        className={`
          w-full px-4 py-3 rounded-xl bg-zinc-950 border text-zinc-100 text-sm
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
          ${error ? "border-red-500/70" : "border-zinc-800 hover:border-zinc-700"}
          ${className}
        `}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={!!error}
        {...props}
      >
        <option value="" className="bg-zinc-900">
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-zinc-900">
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-400 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================
// CHECKBOX
// ============================================================

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  error?: string;
}

export function Checkbox({
  label,
  error,
  id,
  className = "",
  ...props
}: CheckboxProps) {
  const checkId = id ?? `checkbox-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${checkId}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={checkId}
        className="flex items-start gap-3 cursor-pointer group"
      >
        <input
          type="checkbox"
          id={checkId}
          className={`
            mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-950
            text-amber-400 focus:ring-amber-400 focus:ring-2
            cursor-pointer transition-colors
            ${className}
          `}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          {...props}
        />
        <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">
          {label}
        </span>
      </label>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-400 mt-1 ml-7">
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================
// PROGRESS INDICATOR
// ============================================================

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  label?: string;
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  label,
}: ProgressIndicatorProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="w-full" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps} aria-label={label ?? `Step ${currentStep} of ${totalSteps}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-xs text-amber-400 font-bold">
          {percentage}% Complete
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================
// ALERT BANNER
// ============================================================

interface AlertProps {
  type: "info" | "success" | "error" | "warning";
  title?: string;
  children: React.ReactNode;
}

export function Alert({ type, title, children }: AlertProps) {
  const styles = {
    info: "bg-blue-500/10 border-blue-500/30 text-blue-200",
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-200",
    error: "bg-red-500/10 border-red-500/30 text-red-200",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-200",
  };

  const role = type === "error" ? "alert" : "status";

  return (
    <div className={`rounded-xl border p-4 ${styles[type]}`} role={role}>
      {title && <p className="font-semibold mb-1">{title}</p>}
      <div className="text-xs">{children}</div>
    </div>
  );
}

// ============================================================
// MULTI-SELECT CHIPS
// ============================================================

interface MultiSelectChipsProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (selected: string[]) => void;
  error?: string;
  required?: boolean;
}

export function MultiSelectChips({
  label,
  options,
  value,
  onChange,
  error,
  required,
}: MultiSelectChipsProps) {
  const groupId = `chips-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const errorId = `${groupId}-error`;

  const toggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  return (
    <fieldset>
      <legend className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
        {label}
        {required && (
          <span className="text-amber-400 ml-1" aria-label="required">
            *
          </span>
        )}
      </legend>
      <div
        role="group"
        aria-labelledby={groupId}
        aria-describedby={error ? errorId : undefined}
        className="flex flex-wrap gap-2"
      >
        {options.map((opt) => {
          const selected = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() => toggle(opt.value)}
              className={`
                px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
                ${
                  selected
                    ? "bg-amber-400 text-zinc-950 border border-amber-300 shadow-md"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
                }
              `}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-400 mt-2">
          {error}
        </p>
      )}
    </fieldset>
  );
}
