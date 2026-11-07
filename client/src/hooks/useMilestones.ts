import { fetchMilestones } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from './useAsync';

export function useMilestones() {
  const { session } = useAuth();
  const token = session?.token ?? '';
  return useAsync(() => fetchMilestones(token), [token]);
}
