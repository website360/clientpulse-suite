export function EmptyContracts() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground opacity-50"
    >
      {/* Document */}
      <rect 
        x="60" 
        y="30" 
        width="80" 
        height="110" 
        rx="8" 
        stroke="currentColor" 
        strokeWidth="2" 
        fill="none"
        className="animate-fade-in"
      />
      
      {/* Document lines */}
      <path 
        d="M75 50h50M75 65h50M75 80h35" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
        className="animate-fade-in"
        style={{ animationDelay: '0.1s' }}
      />
      
      {/* Signature line */}
      <path 
        d="M75 105h50" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
        strokeDasharray="4 4"
        className="animate-fade-in"
        style={{ animationDelay: '0.2s' }}
      />
      
      {/* Pen */}
      <g className="animate-bounce-in" style={{ animationDelay: '0.3s' }}>
        <path 
          d="M135 120l10-10 5 5-10 10z" 
          fill="currentColor" 
          opacity="0.7"
        />
        <path 
          d="M140 125l-5 15 10-5z" 
          fill="currentColor" 
          opacity="0.5"
        />
      </g>
      
      {/* Calendar icon */}
      <g className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <rect 
          x="45" 
          y="155" 
          width="35" 
          height="30" 
          rx="4" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <path 
          d="M45 165h35" 
          stroke="currentColor" 
          strokeWidth="2"
        />
        <circle cx="55" cy="175" r="2" fill="currentColor" />
        <circle cx="65" cy="175" r="2" fill="currentColor" />
        <circle cx="75" cy="175" r="2" fill="currentColor" />
      </g>
      
      {/* Money icon */}
      <g className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <circle 
          cx="135" 
          cy="170" 
          r="15" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <path 
          d="M135 163v14m-4-10h8" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}