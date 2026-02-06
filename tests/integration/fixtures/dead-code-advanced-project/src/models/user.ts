export type UserID = string;
export interface User { id: UserID; name: string; }
export enum UserRole { Admin, Guest }
export const unusedValue = 123;
