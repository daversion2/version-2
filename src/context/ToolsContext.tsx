/**
 * ToolsContext — single source of truth for the (now admin-configurable) CBT
 * tools, their categories, and the micro-exercises. Seeded with the bundled
 * defaults so screens render instantly, then hydrated from Firestore. Refetches
 * when the app returns to the foreground so admin edits reach users without an
 * app restart ("live for everyone instantly").
 *
 * Consumers use the sync accessors (getToolById, etc.) exactly where they used
 * to read WORKSHEET_TEMPLATES / the microExercises helpers.
 *
 * LAZY (2026-11-02): nothing is read until a screen first calls useTools().
 * The tools, worksheets and micro-exercises are archived or admin-only now, so
 * reading two config docs at every launch and every foreground was paying for
 * screens almost nobody opens. The bundled defaults cover the moment before
 * the read lands, as they always did.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  ToolsConfig,
  ToolCategory,
  ToolDefinition,
  DEFAULT_TOOLS_CONFIG,
  getToolsConfigWithTimeout,
} from '../services/toolsConfig';
import {
  MicroExercisesConfig,
  MicroExerciseConfigItem,
  DEFAULT_MICRO_EXERCISES_CONFIG,
  getMicroExercisesConfigWithTimeout,
} from '../services/microExercisesConfig';
import { MicroExerciseTrigger } from '../types/worksheets';

interface ToolsContextType {
  tools: ToolDefinition[];
  enabledTools: ToolDefinition[];
  categories: ToolCategory[];
  getToolById: (id: string | undefined) => ToolDefinition | undefined;
  microExercises: MicroExerciseConfigItem[]; // enabled only
  /** Look up a micro-exercise by feeling key across ALL items (for history labels). */
  getMicroExerciseByFeelingKey: (key: string | undefined) => MicroExerciseConfigItem | undefined;
  getOrderedFeelingsForTrigger: (
    trigger: MicroExerciseTrigger
  ) => MicroExerciseConfigItem[];
  getDefaultFeelingForTrigger: (
    trigger: MicroExerciseTrigger
  ) => MicroExerciseConfigItem | undefined;
  reload: () => Promise<void>;
  /** Read the config once, on first use. Called by useTools. */
  ensureLoaded: () => void;
}

const ToolsContext = createContext<ToolsContextType | undefined>(undefined);

export const useTools = (): ToolsContextType => {
  const ctx = useContext(ToolsContext);
  const ensureLoaded = ctx?.ensureLoaded;
  useEffect(() => {
    ensureLoaded?.();
  }, [ensureLoaded]);
  if (!ctx) throw new Error('useTools must be used within a ToolsProvider');
  return ctx;
};

export const ToolsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toolsConfig, setToolsConfig] = useState<ToolsConfig>(DEFAULT_TOOLS_CONFIG);
  const [microConfig, setMicroConfig] = useState<MicroExercisesConfig>(
    DEFAULT_MICRO_EXERCISES_CONFIG
  );

  const reload = useCallback(async () => {
    const [tc, mc] = await Promise.all([
      getToolsConfigWithTimeout(),
      getMicroExercisesConfigWithTimeout(),
    ]);
    setToolsConfig(tc);
    setMicroConfig(mc);
  }, []);

  // Nothing reads until a screen asks (see the header).
  const requestedRef = useRef(false);
  const ensureLoaded = useCallback(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    reload().catch((err) => console.warn('Loading tools config failed:', err));
  }, [reload]);

  // Refetch on foreground so published edits reach users without a restart —
  // only once something has used the config.
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (requestedRef.current && appState.current.match(/inactive|background/) && next === 'active') {
        reload().catch((err) => console.warn('Reloading tools config failed:', err));
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [reload]);

  const enabledTools = toolsConfig.tools.filter((t) => t.enabled);
  const microExercises = microConfig.exercises.filter((e) => e.enabled);

  const getToolById = useCallback(
    (id: string | undefined) => toolsConfig.tools.find((t) => t.id === id),
    [toolsConfig]
  );

  const getMicroExerciseByFeelingKey = useCallback(
    (key: string | undefined) =>
      microConfig.exercises.find((e) => e.feeling_key === key),
    [microConfig]
  );

  const getOrderedFeelingsForTrigger = useCallback(
    (trigger: MicroExerciseTrigger) => {
      const enabled = microConfig.exercises.filter((e) => e.enabled);
      const primary = enabled.find((ex) => ex.default_for_triggers.includes(trigger));
      const rest = enabled.filter((ex) => ex !== primary);
      return primary ? [primary, ...rest] : enabled;
    },
    [microConfig]
  );

  const getDefaultFeelingForTrigger = useCallback(
    (trigger: MicroExerciseTrigger) => getOrderedFeelingsForTrigger(trigger)[0],
    [getOrderedFeelingsForTrigger]
  );

  return (
    <ToolsContext.Provider
      value={{
        tools: toolsConfig.tools,
        enabledTools,
        categories: toolsConfig.categories,
        getToolById,
        microExercises,
        getMicroExerciseByFeelingKey,
        getOrderedFeelingsForTrigger,
        getDefaultFeelingForTrigger,
        reload,
        ensureLoaded,
      }}
    >
      {children}
    </ToolsContext.Provider>
  );
};
