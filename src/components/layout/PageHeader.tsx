import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 px-1", className)}>
      <h1 className="text-[22px] font-bold tracking-tight text-[var(--ge-text)] dark:text-slate-50">
        {title}
      </h1>
      {description && (
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--ge-text-muted)] dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}
