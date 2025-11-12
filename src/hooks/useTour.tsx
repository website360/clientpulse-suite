import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useTour = () => {
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourCompleted, setTourCompleted] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('onboarding-tour-completed');
    const isFirstVisit = !hasSeenTour;
    
    if (isFirstVisit && location.pathname === '/') {
      // Aguarda 1 segundo antes de iniciar o tour
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const startTour = () => {
    setStepIndex(0);
    setRun(true);
    setTourCompleted(false);
  };

  const resetTour = () => {
    localStorage.removeItem('onboarding-tour-completed');
    setStepIndex(0);
    setRun(false);
    setTourCompleted(false);
  };

  const completeTour = () => {
    localStorage.setItem('onboarding-tour-completed', 'true');
    setRun(false);
    setTourCompleted(true);
  };

  const skipTour = () => {
    localStorage.setItem('onboarding-tour-completed', 'true');
    setRun(false);
  };

  return {
    run,
    stepIndex,
    setStepIndex,
    startTour,
    resetTour,
    completeTour,
    skipTour,
    tourCompleted,
  };
};
