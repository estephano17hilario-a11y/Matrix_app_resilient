import { useAuth } from '../context/AuthContext';

export const useProStatus = () => {
  const { profile, isLoading } = useAuth();
  
  const isPro = profile?.plan === 'PRO';
  
  return {
    isPro,
    plan: profile?.plan || 'FREE',
    isLoading
  };
};
