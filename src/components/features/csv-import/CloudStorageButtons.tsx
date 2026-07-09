"use client";

import { motion } from "framer-motion";

import { GoogleDriveIcon } from "@/components/icons/GoogleDriveIcon";
import { OneDriveIcon } from "@/components/icons/OneDriveIcon";

const STORAGE_PROVIDERS = [
  { id: "google-drive", label: "Google Drive", Icon: GoogleDriveIcon },
  { id: "onedrive", label: "Microsoft OneDrive", Icon: OneDriveIcon },
] as const;

export function CloudStorageButtons() {
  return (
    <div className="flex items-center justify-center gap-4">
      {STORAGE_PROVIDERS.map(({ id, label, Icon }) => (
        <motion.button
          key={id}
          type="button"
          aria-label={`Import from ${label}`}
          whileHover={{ scale: 1.08, borderColor: "#BDBDBD" }}
          whileTap={{ scale: 0.95 }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D5D5D5] bg-white shadow-sm transition-colors hover:bg-[#FAFAFA]"
        >
          <Icon className="h-6 w-6" />
        </motion.button>
      ))}
    </div>
  );
}
