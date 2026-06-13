/**
 * ToolsContext — single source of truth for the (now admin-configurable) CBT
 * tools, their categories, and the micro-exercises. Seeded with the bundled
 * defaults so screens render instantly, then hydrated from Firestore. Refetches
 * when the app returns to the foreground so admin edits reach users without an
 * app restart ("live for everyone instantly").
 *
 * Consumers use the sync accessors (getToolById, etc.) exactly where they used
 * to read WORKSHEET_TEMPLATES / the microExercises helpers.
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
import {
  ChallengeReflectionConfig,
  ReflectionPrompt,
  DEFAULT_CHALLENGE_REFLECTION_CONFIG,
  getChallengeReflectionConfigWithTimeout,
} from '../services/challengeReflectionConfig';
import { MicroExerciseTrigger } from '../types/worksheets';

interface ToolsContextType {
  tools: ToolDefinition[];
  enabledTools: ToolDefinition[];
  categories: ToolCategory[];
  getToolById: (id: string | undefined) => ToolDefinition | undefined;
  microExercises: MicroExerciseConfigItem[]; // enabled only
  /** Enabled post-challenge reflection prompts, in display order. */
  reflectionPrompts: ReflectionPrompt[];
  /** Look up a micro-exercise by feeling key across ALL items (for history labels). */
  getMicroExerciseByFeelingKey: (key: string | undefined) => MicroExerciseConfigItem | undefined;
  getOrderedFeelingsForTrigger: (
    trigger: MicroExerciseTrigger
  ) => MicroExerciseConfigItem[];
  getDefaultFeelingForTrigger: (
    trigger: MicroExerciseTrigger
  ) => MicroExerciseConfigItem | undefined;
  reload: () => Promise<void>;
}

const ToolsContext = createContext<ToolsContextType | undefined>(undefined);

export const useTools = (): ToolsContextType => {
  const ctx = useContext(ToolsContext);
  if (!ctx) throw new Error('useTools must be used within a ToolsProvider');
  return ctx;
};

export const ToolsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toolsConfig, setToolsConfig] = useState<ToolsConfig>(DEFAULT_TOOLS_CONFIG);
  const [microConfig, setMicroConfig] = useState<MicroExercisesConfig>(
    DEFAULT_MICRO_EXERCISES_CONFIG
  );
  const [reflectionConfig, setReflectionConfig] = useState<ChallengeReflectionConfig>(
    DEFAULT_CHALLENGE_REFLECTION_CONFIG
  );

  const reload = useCallback(async () => {
    const [tc, mc, rc] = await Promise.all([
      getToolsConfigWithTimeout(),
      getMicroExercisesConfigWithTimeout(),
      getChallengeReflectionConfigWithTimeout(),
    ]);
    setToolsConfig(tc);
    setMicroConfig(mc);
    setReflectionConfig(rc);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Refetch on foreground so published edits reach users without a restart.
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        reload();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [reload]);

  const enabledTools = toolsConfig.tools.filter((t) => t.enabled);
  const microExercises = microConfig.exercises.filter((e) => e.enabled);
  const reflectionPrompts = reflectionConfig.prompts.filter((p) => p.enabled);

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
        reflectionPrompts,
        getMicroExerciseByFeelingKey,
        getOrderedFeelingsForTrigger,
        getDefaultFeelingForTrigger,
        reload,
      }}
    >
      {children}
    </ToolsContext.Provider>
  );
};
