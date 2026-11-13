export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  roles: string[];
}