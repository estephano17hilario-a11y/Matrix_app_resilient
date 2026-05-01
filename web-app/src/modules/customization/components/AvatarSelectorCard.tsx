import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { User } from 'lucide-react';

// Utility for dynamic classes
function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}

export interface AvatarSelectorCardProps {
 id: string;
 name: string;
 rarity: string;
 imageUrl: string;
 themeColor?: string; // Hex color e.g., #00ffcc
 isSelected?: boolean;
 showInfo?: boolean;
 onClick?: (id: string) => void;
 className?: string;
}

export const AvatarSelectorCard: React.FC<AvatarSelectorCardProps> = ({
 id,
 name,
 rarity,
 imageUrl,
 themeColor = '#00ffcc',
 isSelected = false,
 showInfo = true,
 onClick,
 className,
}) => {
 const [imgError, setImgError] = useState(false);

 return (
 <motion.div
 className={cn(
 "relative w-full aspect-[9/16] rounded-2xl cursor-pointer", // Removed perspective-1000 to avoid conflicts
 "group", 
 className
 )}
 onClick={() => onClick?.(id)}
 initial={false}
 whileHover={isSelected ? undefined : "hover"}
 whileTap="tap"
 style={{
 ['--theme-color' as any]: themeColor, // GPU promotion
 }}
 >
 {/* === OPTIMIZED GLOW SYSTEM (GPU FRIENDLY) === */}
 {/* 1. Static Ambient Glow (Opacity transition only) */}
 <div 
 className={cn(
 "absolute -inset-4 rounded-3xl -z-10 transition-opacity duration-200",
 isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-40"
 )}
 style={{
 background: `radial-gradient(circle at center, ${themeColor}40 0%, transparent 70%)`,
 }}
 />
 
 {/* 2. Selection Glow (Behind the card) - Optimized */}
 {isSelected && (
 <div 
 className="absolute -inset-1 rounded-2xl -z-20"
 style={{ 
 background: `radial-gradient(circle, ${themeColor} 0%, transparent 80%)`,
 opacity: 0.3
 }}
 />
 )}

 {/* 3. Border Ring (CSS Transition) */}
 <div
 className={cn(
 "absolute inset-0 rounded-2xl z-50 pointer-events-none transition-colors duration-200 border",
 isSelected ? "border-2" : "border-white/10"
 )}
 style={{ borderColor: isSelected ? themeColor : 'rgba(255,255,255,0.1)' }}
 />

 {/* === CONTENT CONTAINER === */}
 <motion.div
 className={cn(
 "relative w-full h-full z-10 bg-gray-900 rounded-2xl overflow-hidden ",
 )}
 variants={{
 hover: { 
 y: -4,
 scale: 1.02,
 transition: { type: "spring", stiffness: 400, damping: 25 }
 },
 tap: { scale: 0.98 },
 }}
 >
 {/* Layer 1: Image (Hardware Accelerated) */}
 <div className="w-full h-full bg-gray-800 relative flex items-center justify-center">
 {!imgError ? (
 <motion.img 
 src={imageUrl} 
 alt={name}
 loading="lazy"
 decoding="async"
 // object-top ensures that when aspect ratio is constrained (e.g. 4:5), we don't cut off the head
 className="w-full h-full object-cover object-[50%_12%] will-change-transform"
 variants={{
 hover: { scale: 1.05 },
 }}
 transition={{ duration: 0.2 }}
 onError={() => setImgError(true)}
 />
 ) : (
 <div className="flex flex-col items-center justify-center text-white/20 gap-2 p-4 text-center">
 <User size={32} strokeWidth={1.5} />
 <span className="text-[10px] font-mono uppercase tracking-widest opacity-50">No Signal</span>
 </div>
 )}
 </div>

 {/* Layer 2: Gradient Overlay (Static) */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90 pointer-events-none" />

 {/* Layer 3: Info */}
 <AnimatePresence>
 {showInfo && (
 <motion.div 
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 10 }}
 className="absolute bottom-0 left-0 w-full p-6 flex flex-col items-start justify-end z-20 pointer-events-none"
 >
 <span 
 className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/70 mb-2"
 style={{ color: isSelected ? themeColor : 'rgba(255,255,255,0.7)' }}
 >
 {rarity}
 </span>
 <h3 className="text-white font-bold text-xl leading-none tracking-tight drop-shadow-md">
 {name}
 </h3>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 </motion.div>
 );
};

export default AvatarSelectorCard;
