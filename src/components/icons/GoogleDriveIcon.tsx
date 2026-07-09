interface GoogleDriveIconProps {
  className?: string;
}

export function GoogleDriveIcon({ className }: GoogleDriveIconProps) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M7.71 2.5L1.15 14h6.56L14.27 2.5H7.71z" fill="#0066DA" />
      <path d="M16.29 2.5H9.73l6.56 11.5h6.56L16.29 2.5z" fill="#00AC47" />
      <path d="M12 14L5.44 25.5H18.56L12 14z" fill="#EA4335" transform="translate(0 -3.5)" />
      <path d="M1.15 14l3.28 5.75L12 14H1.15z" fill="#00832D" />
      <path d="M12 14l7.57 5.75L22.85 14H12z" fill="#2684FC" />
      <path d="M12 14L5.44 19.75h13.12L12 14z" fill="#FFBA00" />
    </svg>
  );
}
