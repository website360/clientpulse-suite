export function EmptyFinancial() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground opacity-50"
    >
      {/* Wallet/Card */}
      <g className="animate-fade-in">
        <rect 
          x="55" 
          y="60" 
          width="90" 
          height="60" 
          rx="8" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <path d="M55 80h90" stroke="currentColor" strokeWidth="2" />
      </g>
      
      {/* Dollar sign */}
      <g className="animate-pulse-subtle" style={{ animationDelay: '0.1s' }}>
        <circle cx="100" cy="100" r="15" stroke="currentColor" strokeWidth="2" fill="none" />
        <path 
          d="M100 93v14m-4-10h8" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
      </g>
      
      {/* Invoice/Receipt */}
      <g className="animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
        <rect 
          x="70" 
          y="135" 
          width="60" 
          height="50" 
          rx="4" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <path 
          d="M70 165l8-8 8 8 8-8 8 8 8-8 8 8 8-8 8 8v-30" 
          stroke="currentColor" 
          strokeWidth="2"
          fill="none"
        />
        <path 
          d="M80 145h40M80 152h30" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          opacity="0.4"
        />
      </g>
      
      {/* Chart up arrow */}
      <g className="animate-bounce-in" style={{ animationDelay: '0.3s' }}>
        <path 
          d="M155 110l10-15 10 10-5 15" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <circle cx="165" cy="95" r="3" fill="currentColor" />
      </g>
      
      {/* Calendar/Due date */}
      <g className="animate-slide-in-left" style={{ animationDelay: '0.4s' }}>
        <rect 
          x="25" 
          y="90" 
          width="25" 
          height="22" 
          rx="4" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none"
        />
        <path d="M25 98h25" stroke="currentColor" strokeWidth="2" />
        <circle cx="33" cy="105" r="1.5" fill="currentColor" />
        <circle cx="42" cy="105" r="1.5" fill="currentColor" />
      </g>
    </svg>
  );
}
