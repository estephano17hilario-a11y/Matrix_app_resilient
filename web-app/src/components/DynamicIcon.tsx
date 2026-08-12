import React from 'react';
import * as LucideIcons from 'lucide-react';

interface DynamicIconProps {
  icon?: string | null;
  size?: number;
  className?: string;
  fallback?: string;
  style?: React.CSSProperties;
}

export const DynamicIcon: React.FC<DynamicIconProps> = React.memo(({ 
  icon, 
  size = 18, 
  className = "", 
  fallback = "📁",
  style 
}) => {
  if (!icon) return <span style={style} className={className}>{fallback}</span>;

  // Check if icon string corresponds to a Lucide icon component name
  const LucideComp = (LucideIcons as any)[icon];
  if (LucideComp) {
    const Component = LucideComp as React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
    return <Component size={size} className={className} style={style} />;
  }

  // Fallback to literal text / emoji
  return <span style={style} className={className}>{icon}</span>;
});
