export interface AuthenticatedUser {
  id: string;
  email: string;
  givenName: string;
  middleName: string | null;
  familyName: string;
  roles: string[];
}