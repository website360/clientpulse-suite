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
      {/* Ticket main shape */}
      <g className="animate-fade-in">
        <rect 
          x="50" 
          y="60" 
          width="100" 
          height="80" 
          rx="8" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <path d="M50 90h100" stroke="currentColor" strokeWidth="2" />
      </g>
      
      {/* Priority indicator */}
      <g className="animate-pulse-subtle" style={{ animationDelay: '0.1s' }}>
        <circle cx="70" cy="75" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M70 71v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
      
      {/* Ticket content lines */}
      <g className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <path d="M90 72h45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <path d="M65 105h60M65 115h55M65 125h45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      </g>
      
      {/* Support headset */}
      <g className="animate-bounce-in" style={{ animationDelay: '0.3s' }}>
        <path 
          d="M155 90v10a5 5 0 01-5 5M45 90v10a5 5 0 005 5" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
        <path 
          d="M45 90a55 55 0 01110 0" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
      </g>
      
      {/* Chat bubbles */}
      <g className="animate-slide-in-right" style={{ animationDelay: '0.4s' }}>
        <rect x="120" y="150" width="35" height="25" rx="8" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="130" cy="162.5" r="2" fill="currentColor" />
        <circle cx="137.5" cy="162.5" r="2" fill="currentColor" />
        <circle cx="145" cy="162.5" r="2" fill="currentColor" />
      </g>
      
      <g className="animate-slide-in-left" style={{ animationDelay: '0.5s' }}>
        <rect x="45" y="155" width="30" height="20" rx="6" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" />
      </g>
    </svg>
  );
}
