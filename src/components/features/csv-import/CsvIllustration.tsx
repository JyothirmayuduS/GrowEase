export function CsvIllustration() {
  return (
    <div className="relative mx-auto mb-8 h-[100px] w-[160px]" aria-hidden="true">
      <div className="absolute right-2 top-2 h-[72px] w-[56px] rounded-sm border-2 border-[#BDBDBD] bg-white shadow-sm">
        <div className="flex h-full flex-col items-center justify-center gap-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
              stroke="#BDBDBD"
              strokeWidth="1.5"
              fill="white"
            />
            <path d="M14 2v6h6" stroke="#BDBDBD" strokeWidth="1.5" />
          </svg>
          <span className="text-[9px] font-bold tracking-wide text-[#EB1000]">CSV</span>
        </div>
      </div>

      <div className="absolute left-2 top-0 h-[72px] w-[56px] rounded-sm border-2 border-[#EB1000] bg-white shadow-sm">
        <div className="flex h-full flex-col items-center justify-center p-2">
          <div className="h-1.5 w-full rounded-full bg-[#F5F5F5]" />
          <div className="mt-1.5 h-1.5 w-4/5 rounded-full bg-[#F5F5F5]" />
          <div className="mt-1.5 h-1.5 w-3/5 rounded-full bg-[#F5F5F5]" />
        </div>
      </div>

      <svg
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        width="80"
        height="40"
        viewBox="0 0 80 40"
        fill="none"
      >
        <path
          d="M10 30 C30 10, 50 10, 70 20"
          stroke="#9E9E9E"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M65 15 L70 20 L65 25"
          stroke="#9E9E9E"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
