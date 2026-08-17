import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Session, Drafts, Draft, SetEntry, Program, Settings, ResolvedExercise, ExerciseCatalog,
  BodyMeasurement, Goal,
} from './types';
import { resolveDay, findDay } from '../data/program';
import { getRepo } from './repo';
import { lastSession, lastSetsFor } from './progress';

const draftKey = (date: string, dayId: string) => `${date}_${dayId}`;

function buildDraft(exercises: ResolvedExercise[], history: Session[], dayId: string): Draft {
  const prev = lastSession(history, dayId);
  const done: Record<string, boolean> = {};
  const sets: Record<string, SetEntry[]> = {};
  for (const ex of exercises) {
    done[ex.exerciseId] = false;
    const prevSets = lastSetsFor(prev, ex.exerciseId);
    sets[ex.exerciseId] = Array.from({ length: ex.sets }, (_, i) => {
      const src = prevSets?.[i] ?? prevSets?.[prevSets.length - 1];
      // подставляем вес прошлого раза, повторы оставляем пустыми
      return { w: src?.w ?? '', r: '' };
    });
  }
  return { done, sets };
}

export function useStore() {
  const repo = useMemo(() => getRepo(), []);
  const [program, setProgram] = useState<Program>(() => repo.getProgram());
  const [catalog, setCatalog] = useState<ExerciseCatalog>(() => repo.getCatalog());
  const [history, setHistory] = useState<Session[]>(() => repo.getSessions());
  const [drafts, setDrafts] = useState<Drafts>(() => repo.getDrafts());
  const [settings, setSettingsState] = useState<Settings>(() => repo.getSettings());
  const [body, setBody] = useState<BodyMeasurement[]>(() => repo.getBody());
  const [goals, setGoals] = useState<Goal[]>(() => repo.getGoals());

  useEffect(() => repo.putDrafts(drafts), [drafts, repo]);

  const exercisesFor = useCallback(
    (dayId: string): ResolvedExercise[] => {
      const day = findDay(program, dayId);
      return day ? resolveDay(day, catalog) : [];
    },
    [program, catalog],
  );

  const ensureDraft = useCallback(
    (date: string, dayId: string) => {
      const key = draftKey(date, dayId);
      setDrafts((prev) => {
        if (prev[key]) return prev;
        return { ...prev, [key]: buildDraft(exercisesFor(dayId), history, dayId) };
      });
    },
    [history, exercisesFor],
  );

  const getDraft = useCallback(
    (date: string, dayId: string): Draft => {
      return drafts[draftKey(date, dayId)] ?? buildDraft(exercisesFor(dayId), history, dayId);
    },
    [drafts, history, exercisesFor],
  );

  const mutateDraft = useCallback(
    (date: string, dayId: string, fn: (d: Draft) => Draft) => {
      const key = draftKey(date, dayId);
      setDrafts((prev) => {
        const base = prev[key] ?? buildDraft(exercisesFor(dayId), history, dayId);
        return { ...prev, [key]: fn(base) };
      });
    },
    [history, exercisesFor],
  );

  const setCell = useCallback(
    (date: string, dayId: string, exId: string, idx: number, field: keyof SetEntry, value: string) => {
      mutateDraft(date, dayId, (base) => {
        const exSets = (base.sets[exId] ?? []).map((s, i) => (i === idx ? { ...s, [field]: value } : s));
        return { ...base, sets: { ...base.sets, [exId]: exSets } };
      });
    },
    [mutateDraft],
  );

  const toggleDone = useCallback(
    (date: string, dayId: string, exId: string) => {
      mutateDraft(date, dayId, (base) => ({
        ...base,
        done: { ...base.done, [exId]: !base.done[exId] },
      }));
    },
    [mutateDraft],
  );

  const addSet = useCallback(
    (date: string, dayId: string, exId: string) => {
      mutateDraft(date, dayId, (base) => {
        const cur = base.sets[exId] ?? [];
        const last = cur[cur.length - 1];
        return { ...base, sets: { ...base.sets, [exId]: [...cur, { w: last?.w ?? '', r: '' }] } };
      });
    },
    [mutateDraft],
  );

  const removeSet = useCallback(
    (date: string, dayId: string, exId: string, idx: number) => {
      mutateDraft(date, dayId, (base) => {
        const cur = base.sets[exId] ?? [];
        if (cur.length <= 1) return base;
        return { ...base, sets: { ...base.sets, [exId]: cur.filter((_, i) => i !== idx) } };
      });
    },
    [mutateDraft],
  );

  const finishWorkout = useCallback(
    (date: string, dayId: string) => {
      const key = draftKey(date, dayId);
      const draft = drafts[key];
      if (!draft) return;
      const day = findDay(program, dayId);
      if (!day) return;
      const exercises = resolveDay(day, catalog);

      // Снапшотим метаданные упражнений: история остается читаемой,
      // даже если программу потом изменят.
      repo.putSession({
        date,
        ts: Date.now(),
        programId: program.id,
        dayId,
        dayTitle: day.title,
        accent: day.accent,
        logs: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          unit: ex.unit,
          muscles: ex.muscles,
          target: { sets: ex.sets, low: ex.low, high: ex.high, inc: ex.inc },
          done: !!draft.done[ex.exerciseId],
          sets: draft.sets[ex.exerciseId] ?? [],
        })),
      });

      setHistory(repo.getSessions());
      setDrafts((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    },
    [drafts, program, catalog, repo],
  );

  const importPlan = useCallback(
    (nextProgram: Program, exercises: ExerciseCatalog) => {
      setCatalog(repo.mergeCatalog(exercises));
      setProgram(repo.putProgram(nextProgram));
      // Черновики старой программы ссылались на прежние dayId — они больше не нужны.
      repo.putDrafts({});
      setDrafts({});
    },
    [repo],
  );

  const deleteSession = useCallback(
    (id: string) => {
      repo.deleteSession(id);
      setHistory(repo.getSessions());
    },
    [repo],
  );

  const replaceHistory = useCallback(
    (next: Session[]) => {
      repo.replaceSessions(next);
      setHistory(repo.getSessions());
    },
    [repo],
  );

  const updateProgram = useCallback(
    (p: Program) => setProgram(repo.putProgram(p)),
    [repo],
  );

  const updateSettings = useCallback(
    (s: Partial<Settings>) => setSettingsState(repo.putSettings(s)),
    [repo],
  );

  const addBody = useCallback(
    (m: Partial<BodyMeasurement> & { date: string }) => {
      repo.putBody(m);
      setBody(repo.getBody());
    },
    [repo],
  );

  const deleteBody = useCallback(
    (id: string) => {
      repo.deleteBody(id);
      setBody(repo.getBody());
    },
    [repo],
  );

  const saveGoal = useCallback(
    (g: Partial<Goal> & { kind: Goal['kind']; target: number }) => {
      repo.putGoal(g);
      setGoals(repo.getGoals());
    },
    [repo],
  );

  return {
    repo,
    program,
    catalog,
    history,
    drafts,
    settings,
    body,
    goals,
    importPlan,
    addBody,
    deleteBody,
    saveGoal,
    exercisesFor,
    ensureDraft,
    getDraft,
    setCell,
    toggleDone,
    addSet,
    removeSet,
    finishWorkout,
    deleteSession,
    replaceHistory,
    updateProgram,
    updateSettings,
  };
}

export type Store = ReturnType<typeof useStore>;
