interface OneDriveIconProps {
  className?: string;
}

export function OneDriveIcon({ className }: OneDriveIconProps) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18.5 8.5C17.12 5.32 13.76 3.5 10.25 4.06C8.28 2.15 5.18 2.22 3.3 4.22C1.42 6.22 1.5 9.32 3.47 11.22C3.16 11.72 3 12.34 3 13C3 15.21 4.79 17 7 17H18C20.21 17 22 15.21 22 13C22 10.58 20.42 8.5 18.5 8.5Z"
        fill="#0078D4"
      />
    </svg>
  );
}
