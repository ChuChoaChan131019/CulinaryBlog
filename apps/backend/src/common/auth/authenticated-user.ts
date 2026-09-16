export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'Author' | 'Admin';
}
