import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import {
  CopyVars,
  fetchCopyOverrides,
  interpolate,
  resetCopyOverride,
  resolveCopy,
  saveCopyOverride,
  stripBold,
} from '../services/appCopy';

/**
 * Live-editable app copy. Screens render wording through <Copy> or useCopy();
 * this provider supplies the admin's edits (from Firestore) over the defaults
 * in code, and the admin-only edit mode. See services/appCopy.ts.
 */

interface CopyContextValue {
  overrides: Record<string, string>;
  /** True only for an admin who switched it on this session. */
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  canEdit: boolean;
  /** Remember a key + default seen on screen, for the admin copy list. */
  register: (key: string, defaultText: string) => void;
  seen: () => { key: string; defaultText: string }[];
  save: (key: string, text: string) => Promise<void>;
  reset: (key: string) => Promise<void>;
}

const passthrough: CopyContextValue = {
  overrides: {},
  editMode: false,
  setEditMode: () => {},
  canEdit: false,
  register: () => {},
  seen: () => [],
  save: async () => {},
  reset: async () => {},
};

const CopyContext = createContext<CopyContextValue>(passthrough);

export const CopyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const canEdit = userProfile?.is_admin === true;
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [editModeOn, setEditModeOn] = useState(false);
  const registry = useRef(new Map<string, string>());

  const load = useCallback(async () => {
    try {
      setOverrides(await fetchCopyOverrides());
    } catch (err) {
      // Defaults are already on screen; an edit just arrives on the next open.
      console.warn('[appCopy] load failed, showing defaults:', err);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => sub.remove();
  }, [user, load]);

  const register = useCallback((key: string, defaultText: string) => {
    if (!registry.current.has(key)) registry.current.set(key, defaultText);
  }, []);

  const save = useCallback(async (key: string, text: string) => {
    await saveCopyOverride(key, text);
    setOverrides((prev) => ({ ...prev, [key]: text }));
  }, []);

  const reset = useCallback(async (key: string) => {
    await resetCopyOverride(key);
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const value = useMemo<CopyContextValue>(
    () => ({
      overrides,
      editMode: canEdit && editModeOn,
      setEditMode: setEditModeOn,
      canEdit,
      register,
      seen: () =>
        [...registry.current.entries()]
          .map(([key, defaultText]) => ({ key, defaultText }))
          .sort((a, b) => a.key.localeCompare(b.key)),
      save,
      reset,
    }),
    [overrides, canEdit, editModeOn, register, save, reset]
  );

  return <CopyContext.Provider value={value}>{children}</CopyContext.Provider>;
};

export const useCopyContext = (): CopyContextValue => useContext(CopyContext);

/**
 * For wording that isn't a <Text> on screen — alerts, placeholders, button
 * titles, header titles. Returns plain text (no bold markers). These keys are
 * edited from Admin → App copy rather than by long-press.
 */
export const useCopy = () => {
  const { overrides, register } = useCopyContext();
  return useCallback(
    (key: string, defaultText: string, vars?: CopyVars): string => {
      register(key, defaultText);
      return stripBold(interpolate(resolveCopy(key, defaultText, overrides), vars));
    },
    [overrides, register]
  );
};
