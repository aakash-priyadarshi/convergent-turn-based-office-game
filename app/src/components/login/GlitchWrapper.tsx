'use client';

import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

export default function GlitchWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: -5 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: [0, -3, 3, -1, 0],
        filter: [
          'hue-rotate(0deg) brightness(1)',
          'hue-rotate(60deg) brightness(1.15)',
          'hue-rotate(-60deg) brightness(1.15)',
          'hue-rotate(0deg) brightness(1)',
        ],
      }}
      transition={{
        duration: 0.5,
        ease: 'easeInOut',
        times: [0, 0.2, 0.4, 0.6, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
