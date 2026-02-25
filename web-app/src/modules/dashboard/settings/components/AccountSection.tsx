import { 
  UserCircle, 
  LogOut, 
  Mail,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

interface AccountSectionProps {
  onShowPro?: () => void;
  isPro?: boolean;
  onClose: () => void;
}

export const AccountSection = ({
  isPro,
  onClose
}: AccountSectionProps) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <UserCircle className="text-amber-400" size={32} />
          Identity Lux
        </h2>
        <p className="text-white/40 text-lg max-w-2xl">
          Manage your digital footprint, security clearance, and session persistence.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PROFILE CARD */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-white/60 font-mono text-sm uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            User Profile
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
             
             {/* Background Glow */}
             <div
               className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 pointer-events-none opacity-70"
               style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)' }}
             />

             {/* Avatar */}
             <div className="relative z-10">
                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-br from-amber-400 to-orange-600 shadow-xl shadow-amber-500/20">
                   <div className="w-full h-full rounded-full bg-black overflow-hidden relative">
                      {user?.photoURL ? (
                          <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/5">
                             <UserCircle size={40} className="text-white/40" />
                          </div>
                      )}
                   </div>
                </div>
                {isPro && (
                   <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20 shadow-lg">
                      PRO USER
                   </div>
                )}
             </div>

             {/* Info */}
             <div className="space-y-1 relative z-10">
                <h3 className="text-2xl font-bold text-white">{user?.displayName || 'Unknown User'}</h3>
                <div className="flex items-center justify-center gap-2 text-white/40 text-sm font-mono">
                   <Mail size={12} />
                   {user?.email}
                </div>
                <div className="flex items-center justify-center gap-2 text-white/20 text-xs font-mono pt-2">
                   <Fingerprint size={12} />
                   UID: {user?.uid?.slice(0, 8)}...
                </div>
             </div>
          </div>
        </div>

        {/* SUBSCRIPTION & ACTIONS */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-white/60 font-mono text-sm uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            Session Control
          </div>

          <div className="space-y-4">
             {/* Danger Zone */}
             <div className="pt-0">
                <button 
                  onClick={handleLogout}
                  className="w-full py-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-bold transition-all flex items-center justify-center gap-2 group"
                >
                   <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                   Terminate Session
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
