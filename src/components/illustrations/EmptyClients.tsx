export function EmptyClients() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground opacity-50"
    >
      {/* Person icon */}
      <g className="animate-fade-in">
        <circle cx="100" cy="65" r="25" stroke="currentColor" strokeWidth="2" fill="none" />
        <path
          d="M75 100c0-13.807 11.193-25 25-25s25 11.193 25 25"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </g>
      
      {/* Contact card */}
      <g className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <rect 
          x="50" 
          y="120" 
          width="100" 
          height="55" 
          rx="8" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <path 
          d="M65 135h50M65 145h60M65 155h40M65 165h35" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          opacity="0.4"
        />
      </g>
      
      {/* Phone icon */}
      <g className="animate-slide-in-left" style={{ animationDelay: '0.3s' }}>
        <rect 
          x="30" 
          y="130" 
          width="12" 
          height="18" 
          rx="2" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <path d="M32 145h8" stroke="currentColor" strokeWidth="1" />
      </g>
      
      {/* Email icon */}
      <g className="animate-slide-in-right" style={{ animationDelay: '0.4s' }}>
        <rect 
          x="158" 
          y="135" 
          width="20" 
          height="14" 
          rx="3" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <path 
          d="M158 137l10 7 10-7" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
      </g>
      
      {/* Add button */}
      <g className="animate-bounce-in" style={{ animationDelay: '0.5s' }}>
        <circle cx="165" cy="75" r="18" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M155 75h20M165 65v20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
