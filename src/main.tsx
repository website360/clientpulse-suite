import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Função para atualizar o favicon dinamicamente do Storage
const updateFavicon = async () => {
  // Tentar do localStorage primeiro (cache rápido)
  const cached = localStorage.getItem('app-favicon');
  if (cached) {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = cached;
    link.type = 'image/png';
  }
  
  // Buscar do Storage para verificar se há versão mais recente
  try {
    const { loadBrandingUrl } = await import('./lib/branding');
    const faviconUrl = await loadBrandingUrl('favicon', '/favicon.png');
    
    if (faviconUrl && faviconUrl !== '/favicon.png') {
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
      link.type = 'image/png';
    }
  } catch (error) {
    console.error('Error loading favicon from storage:', error);
  }
};

// Atualizar favicon na inicialização
updateFavicon();

// Listener para atualizações de logo
window.addEventListener('logoUpdated', (event: Event) => {
  const customEvent = event as CustomEvent;
  if (customEvent.detail.type === 'favicon') {
    updateFavicon();
  }
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
