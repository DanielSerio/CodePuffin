// Auth feature - this imports from user feature which is not allowed
import { getUserName } from '../user';

export function login(userId: string) {
  const name = getUserName(userId);
  return { userId, name };
}
