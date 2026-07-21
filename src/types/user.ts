export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  timezone: string;
  weekStartsOn: 0 | 1;
}
