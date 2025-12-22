import { useState, useEffect } from 'react';
import { useSpring, useTransform } from 'framer-motion';

export const GoldCounter = ({ value }: { value: number }) => {
  const spring = useSpring(value, { stiffness: 50, damping: 20 });
  const displayValue = useTransform(spring, (current) => Math.round(current));
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    spring.set(value);
    const unsubscribe = displayValue.on("change", (latest) => {
      setDisplay(latest);
    });
    return () => unsubscribe();
  }, [value, spring, displayValue]);

  return <span>{display}</span>;
};
