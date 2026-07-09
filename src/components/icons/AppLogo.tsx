import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className }: AppLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#EB1000]">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M13.966 22.624l-1.69-4.281H8.122l-1.69 4.281H2.287l7.112-18h5.202l7.112 18h-3.747zM10.2 16.8h3.6L12 9.6l-1.8 7.2z"
            fill="white"
          />
        </svg>
      </div>
      <span className="text-[15px] font-bold tracking-tight text-[#2C2C2C]">
        GrowEasy
      </span>
    </div>
  );
}
