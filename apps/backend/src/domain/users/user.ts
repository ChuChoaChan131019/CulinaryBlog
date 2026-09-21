export type UserRole = 'Author' | 'Admin';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  isDeleted: boolean;
}
