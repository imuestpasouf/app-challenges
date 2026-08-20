import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMode,
  getActiveMode,
  getLatestWeightEntry,
  listMilestones,
  listWeightEntries,
  stopMode,
  upsertWeightEntry,
} from '../../api/resurrection';
import type { GeneratedMilestone } from '../../domain/resurrection';
import { todayKey } from '../../lib/date';

/** Léger : uniquement le statut actif/inactif, pour la bascule de thème à la racine de l'app. */
export function useIsResurrectionActive(enabled: boolean): boolean {
  const modeQuery = useQuery({ queryKey: ['resurrection-mode'], queryFn: getActiveMode, enabled });
  return modeQuery.data?.status === 'actif';
}

export function useResurrectionData() {
  const queryClient = useQueryClient();

  const modeQuery = useQuery({ queryKey: ['resurrection-mode'], queryFn: getActiveMode });
  const mode = modeQuery.data ?? null;
  const isActive = mode?.status === 'actif';

  const latestWeightQuery = useQuery({ queryKey: ['resurrection-latest-weight'], queryFn: getLatestWeightEntry, enabled: !isActive });

  const milestonesQuery = useQuery({
    queryKey: ['resurrection-milestones', mode?.id],
    queryFn: () => listMilestones(mode!.id),
    enabled: isActive,
  });

  const weightsQuery = useQuery({
    queryKey: ['resurrection-weights', mode?.id],
    queryFn: () => listWeightEntries(mode!.startDate, todayKey()),
    enabled: isActive,
  });

  const createModeMutation = useMutation({
    mutationFn: (input: { startDate: string; endDate: string; startWeight: number; targetWeight: number; milestones: GeneratedMilestone[] }) =>
      createMode(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resurrection-mode'] }),
  });

  const stopModeMutation = useMutation({
    mutationFn: () => stopMode(mode!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resurrection-mode'] }),
  });

  const saveWeightMutation = useMutation({
    mutationFn: (weight: number) => upsertWeightEntry(todayKey(), weight),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resurrection-weights'] }),
  });

  const weightEntries = weightsQuery.data ?? [];
  const currentWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight : (mode?.startWeight ?? 0);

  return {
    mode,
    isActive,
    latestWeight: latestWeightQuery.data ?? null,
    milestones: milestonesQuery.data ?? [],
    weightEntries,
    currentWeight,
    createMode: (input: { startDate: string; endDate: string; startWeight: number; targetWeight: number; milestones: GeneratedMilestone[] }) =>
      createModeMutation.mutateAsync(input),
    stopMode: () => stopModeMutation.mutateAsync(),
    saveWeight: (weight: number) => saveWeightMutation.mutateAsync(weight),
    isLoading: modeQuery.isLoading || (isActive && (milestonesQuery.isLoading || weightsQuery.isLoading)),
  };
}
