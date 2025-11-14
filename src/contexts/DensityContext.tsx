import React, { createContext, useContext, useState, useEffect } from 'react';

export type DensityMode = 'compact' | 'normal' | 'comfortable';

interface DensityContextType {
  density: DensityMode;
  setDensity: (density: DensityMode) => void;
}

const DensityContext = createContext<DensityContextType | undefined>(undefined);

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<DensityMode>(() => {
    const saved = localStorage.getItem('ui-density');
    return (saved as DensityMode) || 'compact';
  });

  useEffect(() => {
    // Aplicar classe de densidade no root
    const root = document.documentElement;
    root.classList.remove('density-compact', 'density-normal', 'density-comfortable');
    root.classList.add(`density-${density}`);
    
    // Salvar no localStorage
    localStorage.setItem('ui-density', density);
  }, [density]);

  const setDensity = (newDensity: DensityMode) => {
    setDensityState(newDensity);
  };

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  const context = useContext(DensityContext);
  if (!context) {
    throw new Error('useDensity must be used within DensityProvider');
  }
  return context;
}
