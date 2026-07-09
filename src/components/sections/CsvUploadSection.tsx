"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";

import { CloudStorageButtons } from "@/components/features/csv-import/CloudStorageButtons";
import { CsvIllustration } from "@/components/features/csv-import/CsvIllustration";
import { ACCEPTED_TYPES } from "@/components/features/csv-import/FileDropzone";

interface CsvUploadSectionProps {
  onFileSelect?: (file: File) => void;
}

export function CsvUploadSection({ onFileSelect }: CsvUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file instanceof File) {
        onFileSelect?.(file);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const openFilePicker = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    inputRef.current?.click();
  }, []);

  return (
    <section className="flex flex-1 items-center justify-center bg-white px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="w-full max-w-[900px]"
      >
        <motion.div
          animate={{
            borderColor: isDragging ? "#1473E6" : "#B3D4FF",
            backgroundColor: isDragging ? "#F0F7FF" : "#FFFFFF",
          }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center rounded-lg border-2 px-8 py-14 md:py-16"
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              e.target.value = "";
              if (selected instanceof File) {
                onFileSelect?.(selected);
              }
            }}
          />

          <CsvIllustration />

          <h1 className="mb-3 text-center text-[28px] font-bold tracking-tight text-[#2C2C2C] md:text-[32px]">
            Import CRM Leads
          </h1>

          <p className="mb-8 max-w-[480px] text-center text-[15px] leading-relaxed text-[#6E6E6E]">
            Drag and drop any CSV file — Facebook exports, Google Ads, Excel sheets,
            or custom spreadsheets — to intelligently map leads into GrowEasy CRM.
          </p>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <button
              type="button"
              onClick={openFilePicker}
              className="h-11 min-w-[200px] rounded-full bg-[#1473E6] px-10 text-[15px] font-semibold text-white transition-colors hover:bg-[#0D66D0]"
            >
              Select a file
            </button>
          </motion.div>

          <p className="mb-5 mt-8 text-[13px] text-[#6E6E6E]">
            Or from another storage account
          </p>

          <CloudStorageButtons />
        </motion.div>
      </motion.div>
    </section>
  );
}
