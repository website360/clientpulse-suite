import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type ConnectionStatus = "connected" | "disconnected" | "checking" | "unknown";

interface WhatsAppStatusResult {
  status: ConnectionStatus;
  checkStatus: () => Promise<void>;
  isChecking: boolean;
}

const CACHE_KEY = "whatsapp-status-cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function useWhatsAppStatus(autoCheck: boolean = false): WhatsAppStatusResult {
  const [status, setStatus] = useState<ConnectionStatus>("unknown");
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    // Verificar cache primeiro
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { status: cachedStatus, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setStatus(cachedStatus);
          return;
        }
      } catch (e) {
        // Cache inválido, continuar com verificação
      }
    }

    setIsChecking(true);
    setStatus("checking");

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { action: "check_status" }
      });

      const newStatus: ConnectionStatus = (error || !data?.success) ? "disconnected" : "connected";
      setStatus(newStatus);

      // Salvar no cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        status: newStatus,
        timestamp: Date.now()
      }));
    } catch (error) {
      setStatus("disconnected");
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        status: "disconnected",
        timestamp: Date.now()
      }));
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (autoCheck) {
      checkStatus();
    }
  }, [autoCheck, checkStatus]);

  return { status, checkStatus, isChecking };
}
