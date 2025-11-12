export function EmptyTasks() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground opacity-50"
    >
      {/* Clipboard */}
      <g className="animate-fade-in">
        <rect 
          x="60" 
          y="40" 
          width="80" 
          height="120" 
          rx="8" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <rect 
          x="80" 
          y="35" 
          width="40" 
          height="12" 
          rx="4" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
      </g>
      
      {/* Checkboxes */}
      <g className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <rect x="75" y="65" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M78 72l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="95" y="67" width="35" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
      </g>
      
      <g className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <rect x="75" y="90" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
        <rect x="95" y="92" width="40" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
      </g>
      
      <g className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <rect x="75" y="115" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
        <rect x="95" y="117" width="30" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
      </g>
      
      {/* Priority flag */}
      <g className="animate-bounce-in" style={{ animationDelay: '0.4s' }}>
        <path 
          d="M145 55v30" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
        <path 
          d="M145 55l15 7-15 7z" 
          fill="currentColor" 
          opacity="0.6"
        />
      </g>
      
      {/* Calendar icon */}
      <g className="animate-slide-in-left" style={{ animationDelay: '0.5s' }}>
        <rect 
          x="35" 
          y="100" 
          width="30" 
          height="25" 
          rx="4" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <path d="M35 108h30" stroke="currentColor" strokeWidth="2" />
        <path d="M42 100v-5M58 100v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}