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
      {/* Folder */}
      <g className="animate-fade-in">
        <path
          d="M55 60l15-15h40l10 10h35a10 10 0 0110 10v75a10 10 0 01-10 10H60a10 10 0 01-10-10V70a10 10 0 015-8.66z"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </g>
      
      {/* Progress bars (stages) */}
      <g className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <rect x="70" y="75" width="70" height="10" rx="5" fill="currentColor" opacity="0.2" />
        <rect x="70" y="75" width="45" height="10" rx="5" fill="currentColor" opacity="0.5" />
      </g>
      
      <g className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <rect x="70" y="95" width="70" height="10" rx="5" fill="currentColor" opacity="0.2" />
        <rect x="70" y="95" width="30" height="10" rx="5" fill="currentColor" opacity="0.5" />
      </g>
      
      <g className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <rect x="70" y="115" width="70" height="10" rx="5" fill="currentColor" opacity="0.2" />
        <rect x="70" y="115" width="60" height="10" rx="5" fill="currentColor" opacity="0.5" />
      </g>
      
      {/* Timeline/Gantt indicator */}
      <g className="animate-slide-in-right" style={{ animationDelay: '0.4s' }}>
        <path 
          d="M70 135h60" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
        <circle cx="80" cy="135" r="4" fill="currentColor" />
        <circle cx="100" cy="135" r="4" fill="currentColor" />
        <circle cx="120" cy="135" r="4" fill="currentColor" opacity="0.4" />
      </g>
      
      {/* Team icon */}
      <g className="animate-bounce-in" style={{ animationDelay: '0.5s' }}>
        <circle cx="150" cy="100" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="165" cy="105" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
        <path 
          d="M140 115c0-5.5 4.5-10 10-10s10 4.5 10 10M158 118c0-3.5 3-6 7-6s7 2.5 7 6" 
          stroke="currentColor" 
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
