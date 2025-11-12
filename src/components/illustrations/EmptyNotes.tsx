export function EmptyNotes() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground opacity-50"
    >
      {/* Note papers stack */}
      <g className="animate-fade-in">
        <rect 
          x="70" 
          y="50" 
          width="70" 
          height="90" 
          rx="6" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
          transform="rotate(-3 105 95)"
          opacity="0.3"
        />
      </g>
      
      <g className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <rect 
          x="68" 
          y="48" 
          width="70" 
          height="90" 
          rx="6" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
          transform="rotate(2 103 93)"
          opacity="0.5"
        />
      </g>
      
      {/* Main note */}
      <g className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <rect 
          x="65" 
          y="45" 
          width="70" 
          height="90" 
          rx="6" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        
        {/* Lines on note */}
        <path 
          d="M80 65h40M80 80h35M80 95h40M80 110h25" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
          opacity="0.4"
        />
      </g>
      
      {/* Lightbulb (idea) */}
      <g className="animate-bounce-in" style={{ animationDelay: '0.3s' }}>
        <circle cx="50" cy="100" r="12" stroke="currentColor" strokeWidth="2" fill="none" />
        <path 
          d="M44 109h12M46 115h8" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
        <path 
          d="M50 85v-8M63 92l6-6M37 92l-6-6" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
      </g>
      
      {/* Tags */}
      <g className="animate-slide-in-left" style={{ animationDelay: '0.4s' }}>
        <path 
          d="M70 150l10-10 25 0 15 15-10 10-30 0z" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <circle cx="95" cy="150" r="2" fill="currentColor" />
      </g>
      
      {/* Image icon */}
      <g className="animate-slide-in-right" style={{ animationDelay: '0.5s' }}>
        <rect 
          x="145" 
          y="85" 
          width="30" 
          height="25" 
          rx="4" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <circle cx="153" cy="93" r="3" fill="currentColor" opacity="0.5" />
        <path 
          d="M145 103l7-7 7 7 6-6v13h-20z" 
          fill="currentColor" 
          opacity="0.3"
        />
      </g>
      
      {/* Link icon */}
      <g className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
        <path 
          d="M150 125l-5 5a7 7 0 01-10 0 7 7 0 010-10l5-5M155 120l5-5a7 7 0 0110 0 7 7 0 010 10l-5 5" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}