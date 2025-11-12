export function EmptyDomains() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground opacity-50"
    >
      {/* Globe */}
      <circle 
        cx="100" 
        cy="85" 
        r="35" 
        stroke="currentColor" 
        strokeWidth="2" 
        fill="none"
        className="animate-fade-in"
      />
      
      {/* Globe lines */}
      <path 
        d="M100 50v70M70 85h60" 
        stroke="currentColor" 
        strokeWidth="2"
        className="animate-fade-in"
        style={{ animationDelay: '0.1s' }}
      />
      <ellipse 
        cx="100" 
        cy="85" 
        rx="15" 
        ry="35" 
        stroke="currentColor" 
        strokeWidth="2" 
        fill="none"
        className="animate-fade-in"
        style={{ animationDelay: '0.2s' }}
      />
      
      {/* WWW text */}
      <g className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <text 
          x="100" 
          y="90" 
          textAnchor="middle" 
          fill="currentColor" 
          fontSize="14" 
          fontWeight="bold"
          opacity="0.6"
        >
          www
        </text>
      </g>
      
      {/* Browser window */}
      <g className="animate-slide-in-right" style={{ animationDelay: '0.4s' }}>
        <rect 
          x="50" 
          y="135" 
          width="100" 
          height="50" 
          rx="6" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <path d="M50 145h100" stroke="currentColor" strokeWidth="2" />
        <circle cx="60" cy="140" r="2" fill="currentColor" />
        <circle cx="68" cy="140" r="2" fill="currentColor" />
        <circle cx="76" cy="140" r="2" fill="currentColor" />
        
        {/* Address bar */}
        <rect 
          x="60" 
          y="155" 
          width="80" 
          height="8" 
          rx="4" 
          fill="currentColor" 
          opacity="0.3"
        />
        <rect 
          x="60" 
          y="168" 
          width="60" 
          height="6" 
          rx="3" 
          fill="currentColor" 
          opacity="0.2"
        />
      </g>
      
      {/* Lock icon (SSL) */}
      <g className="animate-bounce-in" style={{ animationDelay: '0.5s' }}>
        <rect 
          x="155" 
          y="95" 
          width="20" 
          height="18" 
          rx="3" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <path 
          d="M159 95v-6a6 6 0 0112 0v6" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <circle cx="165" cy="104" r="2" fill="currentColor" />
      </g>
    </svg>
  );
}