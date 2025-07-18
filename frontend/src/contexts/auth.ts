// Authentication context definition

import { createContext } from 'react';
import type { R2Credentials } from '../types';

export interface AuthContextType {
  isAuthenticated: boolean;
  bucketName: string | null;
  login: (credentials: R2Credentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);