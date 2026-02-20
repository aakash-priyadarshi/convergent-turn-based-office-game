'use client';

import { motion } from 'framer-motion';

export default function MarketTicker() {
  return (
    <div className="fixed bottom-0 left-0 w-full h-28 pointer-events-none opacity-40">
      <svg
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="tickerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="30%" stopColor="#3b82f6" />
            <stop offset="70%" stopColor="#10b981" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Primary ticker line */}
        <motion.path
          d="M0 80 L80 55 L160 65 L240 30 L320 60 L400 20 L480 50 L560 35 L640 70 L720 25 L800 45 L880 15 L960 55 L1040 40 L1120 60 L1200 30"
          fill="none"
          stroke="url(#tickerGradient)"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 2.5, ease: 'easeInOut' },
            opacity: { duration: 0.5 },
          }}
        />

        {/* Secondary faded line */}
        <motion.path
          d="M0 60 L80 75 L160 50 L240 85 L320 40 L400 65 L480 30 L560 55 L640 45 L720 70 L800 35 L880 60 L960 25 L1040 50 L1120 40 L1200 65"
          fill="none"
          stroke="#6366f1"
          strokeWidth="1"
          strokeOpacity={0.3}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, ease: 'easeInOut', delay: 0.5 }}
        />
      </svg>
    </div>
  );
}
