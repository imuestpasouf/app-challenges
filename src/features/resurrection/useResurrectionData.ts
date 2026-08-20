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
import { getMyProfileName } from '../../api/profile';
import type { GeneratedMilestone } from '../../domain/resurrection';
import { todayKey } from '../../lib/date';

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Le mode Résurrection est un réglage strictement personnel de Nassim (voir resurrection.md §0) :
 * l'app d'Amâna ne doit même pas montrer le toggle. Nom comparé plutôt que user_id pour éviter
 * de dépendre d'un id codé en dur dans le client.
 */
export function useIsNassim(): boolean {
  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: getMyProfileName });
  const name = profileQuery.data;
  return !!name && normalizeName(name) === 'nassim';
}

/** Léger : uniquement le statut actif/inactif, pour la bascule de thème à la racine de l'app. */
export function useIsResurrectionActive(enabled: boolean): boolean {
  const modeQuery = useQuery({ queryKey: ['resurrection-mode'], queryFn: getActiveMode, enabled });
  return modeQuery.data?.status === 'actif';
}

export function useResurrectionData(enabled: boolean = true) {
  const queryClient = useQueryClient();

  const modeQuery = useQuery({ queryKey: ['resurrection-mode'], queryFn: getActiveMode, enabled });
  const mode = enabled ? (modeQuery.data ?? null) : null;
  const isActive = mode?.status === 'actif';

  const latestWeightQuery = useQuery({ queryKey: ['resurrection-latest-weight'], queryFn: getLatestWeightEntry, enabled: enabled && !isActive });

  const milestonesQuery = useQuery({
    queryKey: ['resurrection-milestones', mode?.id],
    queryFn: () => listMilestones(mode!.id),
    enabled: enabled && isActive,
  });

  const weightsQuery = useQuery({
    queryKey: ['resurrection-weights', mode?.id],
    queryFn: () => listWeightEntries(mode!.startDate, todayKey()),
    enabled: enabled && isActive,
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
