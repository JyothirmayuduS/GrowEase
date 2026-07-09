"use client";

import { motion } from "framer-motion";

import "./import-loader.css";

interface ImportLoaderProps {
  title?: string;
  subtitle?: string;
}

export function ImportLoader({
  title = "Processing...",
  subtitle = "Give us a moment please",
}: ImportLoaderProps) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-1 flex-col items-center justify-center bg-white px-6"
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <div className="import-loader-wrapper">
        <div className="import-loader" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`box box${i}`}>
              <div />
            </div>
          ))}
          <div className="ground">
            <div />
          </div>
        </div>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-2 text-2xl font-bold text-[#2C2C2C]"
      >
        {title}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-1 text-sm text-[#6E6E6E]"
      >
        {subtitle}
      </motion.p>
    </motion.section>
  );
}
