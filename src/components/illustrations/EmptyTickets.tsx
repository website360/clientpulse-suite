export function EmptyTickets() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground opacity-50"
    >
      <rect x="50" y="40" width="100" height="120" rx="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M70 60h60M70 80h60M70 100h40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="80" cy="130" r="5" fill="currentColor" />
      <circle cx="100" cy="130" r="5" fill="currentColor" />
      <circle cx="120" cy="130" r="5" fill="currentColor" />
      <path
        d="M140 170l-15-15m0 0l-15-15m15 15l-15-15m15 15l15-15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
