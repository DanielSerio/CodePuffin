// User feature - creates circular dependency with auth
import { getAuthToken } from '../auth';

export function getUser(userId: string) {
  const token = getAuthToken();
  return { id: userId, token };
}
