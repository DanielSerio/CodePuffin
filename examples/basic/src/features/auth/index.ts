// Auth feature - creates circular dependency with user
import { getUser } from '../user';

export function login(userId: string) {
  return getUser(userId);
}

export function getAuthToken() {
  return 'token-123';
}
