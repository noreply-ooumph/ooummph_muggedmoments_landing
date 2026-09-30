/**
 * MuggedMoments — Form State Hook (Client-side)
 *
 * Manages progressive multi-step form state with:
 * - localStorage persistence (non-sensitive data only)
 * - 24-hour expiry
 * - Version-based invalidation of stale state
 * - Explicit save/resume with user confirmation
 *
 * Security:
 * - Never stores passwords, auth credentials, or sensitive secrets
 * - Phone numbers are stored temporarily for form completion only
 * - State expires after FORM_STATE_EXPIRY_HOURS hours
 * - Users can explicitly clear state ("Start Again")
 *
 * DO NOT add any secret or credential storage here.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { FormState, CreateLeadInput, Attribution } from "@/types";
import { FORM_STATE_VERSION, FORM_STATE_EXPIRY_HOURS } from "@/types";
import { generateIdempotencyKey } from "@/lib/idempotency";

const FORM_STATE_KEY = "mm_form_state";

function isExpired(savedAt: string | undefined): boolean {
  if (!savedAt) return true;
  const saved = new Date(savedAt).getTime();
  const expiryMs = FORM_STATE_EXPIRY_HOURS * 60 * 60 * 1000;
  return Date.now() - saved > expiryMs;
}

function loadFormState(): FormState | null {
  try {
    const raw = localStorage.getItem(FORM_STATE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as FormState;
    // Version check — invalidate stale state
    if (state.version !== FORM_STATE_VERSION) return null;
    // Expiry check
    if (isExpired(state.savedAt)) return null;
    return state;
  } catch {
    return null;
  }
}

function saveFormState(state: FormState): void {
  try {
    localStorage.setItem(FORM_STATE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — continue without persistence
  }
}

function clearFormState(): void {
  try {
    localStorage.removeItem(FORM_STATE_KEY);
  } catch {}
}

function createFreshState(attribution: Attribution | null, totalSteps: number): FormState {
  return {
    currentStep: 0,
    totalSteps,
    values: {},
    idempotencyKey: generateIdempotencyKey(),
    attribution: attribution ?? undefined,
    savedAt: new Date().toISOString(),
    version: FORM_STATE_VERSION,
  };
}

interface UseFormStateReturn {
  formState: FormState;
  hasSavedState: boolean;
  resumeState: () => void;
  startFresh: (attribution: Attribution | null) => void;
  updateValues: (values: Partial<CreateLeadInput>) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  clearState: () => void;
}

export function useFormState(
  totalSteps: number,
  attribution: Attribution | null
): UseFormStateReturn {
  const [formState, setFormState] = useState<FormState>(() =>
    createFreshState(attribution, totalSteps)
  );
  const [hasSavedState, setHasSavedState] = useState(false);

  // On mount, check for saved state
  useEffect(() => {
    const saved = loadFormState();
    if (saved) {
      setHasSavedState(true);
      // Don't auto-restore — ask user first
    }
  }, []);

  const resumeState = useCallback(() => {
    const saved = loadFormState();
    if (saved) {
      // Update attribution if we have a fresher one
      const updatedState: FormState = {
        ...saved,
        attribution: saved.attribution ?? attribution ?? undefined,
      };
      setFormState(updatedState);
      setHasSavedState(false);
    }
  }, [attribution]);

  const startFresh = useCallback(
    (attr: Attribution | null) => {
      clearFormState();
      const fresh = createFreshState(attr ?? attribution, totalSteps);
      setFormState(fresh);
      setHasSavedState(false);
    },
    [attribution, totalSteps]
  );

  const updateValues = useCallback(
    (values: Partial<CreateLeadInput>) => {
      setFormState((prev) => {
        const next: FormState = {
          ...prev,
          values: { ...prev.values, ...values },
          savedAt: new Date().toISOString(),
        };
        saveFormState(next);
        return next;
      });
    },
    []
  );

  const setStep = useCallback((step: number) => {
    setFormState((prev) => {
      const next = { ...prev, currentStep: step, savedAt: new Date().toISOString() };
      saveFormState(next);
      return next;
    });
  }, []);

  const nextStep = useCallback(() => {
    setFormState((prev) => {
      const next = {
        ...prev,
        currentStep: Math.min(prev.currentStep + 1, prev.totalSteps - 1),
        savedAt: new Date().toISOString(),
      };
      saveFormState(next);
      return next;
    });
  }, []);

  const prevStep = useCallback(() => {
    setFormState((prev) => {
      const next = {
        ...prev,
        currentStep: Math.max(prev.currentStep - 1, 0),
        savedAt: new Date().toISOString(),
      };
      saveFormState(next);
      return next;
    });
  }, []);

  const clearState = useCallback(() => {
    clearFormState();
    setFormState(createFreshState(attribution, totalSteps));
    setHasSavedState(false);
  }, [attribution, totalSteps]);

  return {
    formState,
    hasSavedState,
    resumeState,
    startFresh,
    updateValues,
    setStep,
    nextStep,
    prevStep,
    clearState,
  };
}
