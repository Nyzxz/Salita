import { fetchMilestones } from '../api/endpoints';
import { useAsync } from './useAsync';

export function useMilestones() {
  return useAsync(() => fetchMilestones(), []);
}
