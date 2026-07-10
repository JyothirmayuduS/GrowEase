export function ImportDoodles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* dot grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* top-left: document sketch */}
      <svg
        className="absolute left-[8%] top-[14%] h-28 w-28 text-[#94a3b8] opacity-40"
        viewBox="0 0 120 120"
        fill="none"
      >
        <path
          d="M35 18h38l22 22v62a4 4 0 0 1-4 4H35a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M73 18v22h22" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M42 52h36M42 64h28M42 76h32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* top-right: flow arrow */}
      <svg
        className="absolute right-[10%] top-[18%] h-24 w-32 text-[var(--brand-blue)] opacity-25"
        viewBox="0 0 140 80"
        fill="none"
      >
        <path
          d="M12 40 C40 12, 70 12, 98 40 C70 68, 40 68, 12 40"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="4 6"
        />
        <path d="M98 40h24M110 32l12 8-12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* bottom-left: table grid sketch */}
      <svg
        className="absolute bottom-[16%] left-[10%] h-32 w-40 text-[#94a3b8] opacity-35"
        viewBox="0 0 160 100"
        fill="none"
      >
        <rect x="8" y="12" width="144" height="76" rx="6" stroke="currentColor" strokeWidth="2" />
        <path d="M8 36h144M56 12v76M104 12v76M8 60h144" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      {/* bottom-right: spark burst */}
      <svg
        className="absolute bottom-[20%] right-[12%] h-20 w-20 text-[var(--brand-blue)] opacity-30"
        viewBox="0 0 80 80"
        fill="none"
      >
        <path d="M40 8v12M40 60v12M8 40h12M60 40h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M18 18l8 8M54 54l8 8M54 18l-8 8M18 54l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* center-left squiggle */}
      <svg
        className="absolute left-[4%] top-[42%] h-16 w-24 text-[#cbd5e1] opacity-50"
        viewBox="0 0 96 48"
        fill="none"
      >
        <path
          d="M4 24 C20 8, 36 40, 52 24 S84 8, 92 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
