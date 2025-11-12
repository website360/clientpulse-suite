export function EmptyMaintenance() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground opacity-50"
    >
      {/* Wrench */}
      <g className="animate-fade-in">
        <path 
          d="M70 90l-20 20 10 10 20-20" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <circle cx="90" cy="70" r="15" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M102 62l8-8M102 78l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
      
      {/* Gear (animated rotation) */}
      <g className="animate-fade-in" style={{ animationDelay: '0.2s', transformOrigin: '130px 90px' }}>
        <circle cx="130" cy="90" r="20" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="130" cy="90" r="10" fill="currentColor" opacity="0.3" />
        <path d="M130 66v8M130 114v8M146 90h8M106 90h8M141 75l6-6M117 105l6-6M141 105l6 6M117 75l6 6" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
      </g>
      
      {/* Calendar with check */}
      <g className="animate-slide-in-right" style={{ animationDelay: '0.3s' }}>
        <rect 
          x="55" 
          y="140" 
          width="45" 
          height="40" 
          rx="6" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <path d="M55 152h45" stroke="currentColor" strokeWidth="2" />
        <path d="M65 140v-8M85 140v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        
        {/* Grid */}
        <circle cx="67" cy="163" r="2" fill="currentColor" opacity="0.4" />
        <circle cx="77.5" cy="163" r="2" fill="currentColor" opacity="0.4" />
        <circle cx="88" cy="163" r="2" fill="currentColor" opacity="0.4" />
        <circle cx="67" cy="171" r="2" fill="currentColor" opacity="0.4" />
        
        {/* Check mark on today */}
        <circle cx="77.5" cy="171" r="8" fill="currentColor" opacity="0.2" />
        <path 
          d="M73 171l3 3 6-6" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </g>
      
      {/* Alert/Notification */}
      <g className="animate-bounce-in" style={{ animationDelay: '0.4s' }}>
        <circle cx="125" cy="155" r="18" stroke="currentColor" strokeWidth="2" fill="none" />
        <path 
          d="M125 148v8M125 162v2" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}