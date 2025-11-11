export function EmptyProjects() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground opacity-50"
    >
      <path
        d="M60 50h80a10 10 0 0110 10v90a10 10 0 01-10 10H60a10 10 0 01-10-10V60a10 10 0 0110-10z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path d="M50 70h100M50 90h100" stroke="currentColor" strokeWidth="2" />
      <rect x="70" y="105" width="60" height="8" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="70" y="125" width="40" height="8" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="70" y="145" width="50" height="8" rx="2" fill="currentColor" opacity="0.3" />
      <path d="M100 40v20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
