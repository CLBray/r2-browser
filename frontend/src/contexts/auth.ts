// Authentication context definition

import { createContext } from 'react';
import type { R2Credentials, AuthSession } from '../types';

export interface AuthContextType {
  isAuthenticated: boolean;
  bucketName: string | null;
  userId: string | null;
  login: (credentials: R2Credentials) => Promise<AuthSession>;
  logout: () => Promise<void>;
  isLoading: boolean;
  sessionExpiry: Date | null;
  isSessionExpiring: () => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);