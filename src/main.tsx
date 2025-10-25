import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import App from "./App.tsx";
import "./index.css";

// Função para atualizar o favicon dinamicamente
const updateFavicon = () => {
  const faviconUrl = localStorage.getItem('app-favicon');
  if (faviconUrl) {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
    link.type = 'image/png';
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

createRoot(document.getElementById("root")!).render(<App />);
