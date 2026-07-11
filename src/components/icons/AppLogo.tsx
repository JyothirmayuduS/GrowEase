import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  variant?: "default" | "sidebar";
}

export function AppLogo({ className, variant = "default" }: AppLogoProps) {
  if (variant === "sidebar") {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="GrowEasy logo" width={32} height={32} />
        <span className="text-[15px] font-bold tracking-tight text-white">GrowEasy</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="GrowEasy logo" width={28} height={28} />
      <span className="text-[15px] font-bold tracking-tight text-[#2C2C2C] dark:text-white">
        GrowEasy
      </span>
    </div>
  );
}


