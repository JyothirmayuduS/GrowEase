import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  variant?: "default" | "sidebar";
}

export function AppLogo({ className, variant = "default" }: AppLogoProps) {
  if (variant === "sidebar") {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 4L12 20M12 4L6 10M12 4L18 10"
              stroke="#141414"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="text-[15px] font-bold tracking-tight text-white">GrowEasy</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#EB1000]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M13.966 22.624l-1.69-4.281H8.122l-1.69 4.281H2.287l7.112-18h5.202l7.112 18h-3.747zM10.2 16.8h3.6L12 9.6l-1.8 7.2z"
            fill="white"
          />
        </svg>
      </div>
      <span className="text-[15px] font-bold tracking-tight text-[#2C2C2C] dark:text-white">
        GrowEasy
      </span>
    </div>
  );
}
