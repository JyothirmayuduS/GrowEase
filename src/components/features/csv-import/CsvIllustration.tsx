/** Adobe-style convert illustration: source doc → curved arrow → CSV doc */
export function CsvIllustration() {
  return (
    <div className="relative mx-auto h-[110px] w-[168px]" aria-hidden="true">
      {/* Target CSV doc (back-right) */}
      <div className="absolute right-1 top-1 flex h-[78px] w-[58px] flex-col items-center justify-center rounded-[3px] border-[1.5px] border-[#bdbdbd] bg-white">
        <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
          <path
            d="M4 2h14l6 6v20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
            stroke="#bdbdbd"
            strokeWidth="1.5"
            fill="white"
          />
          <path d="M18 2v6h6" stroke="#bdbdbd" strokeWidth="1.5" />
        </svg>
        <span className="mt-0.5 text-[10px] font-bold tracking-wide text-[#eb1000]">CSV</span>
      </div>

      {/* Source doc (front-left, Adobe red outline) */}
      <div className="absolute left-1 top-0 flex h-[78px] w-[58px] flex-col justify-center gap-[7px] rounded-[3px] border-[1.5px] border-[#eb1000] bg-white px-2.5">
        <div className="h-[3px] w-full rounded-full bg-[#e8e8e8]" />
        <div className="h-[3px] w-[85%] rounded-full bg-[#e8e8e8]" />
        <div className="h-[3px] w-[70%] rounded-full bg-[#e8e8e8]" />
        <div className="h-[3px] w-[55%] rounded-full bg-[#e8e8e8]" />
      </div>

      {/* Curved conversion arrow */}
      <svg
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        width="90"
        height="36"
        viewBox="0 0 90 36"
        fill="none"
      >
        <path
          d="M12 28C28 8 58 6 78 18"
          stroke="#9e9e9e"
          strokeWidth="1.75"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M72 12.5L78 18L71.5 21.5"
          stroke="#9e9e9e"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
