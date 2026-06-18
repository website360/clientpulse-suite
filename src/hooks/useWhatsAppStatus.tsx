import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type ConnectionStatus = "connected" | "awaiting_qr" | "disconnected" | "checking" | "unknown";

interface WhatsAppStatusResult {
  status: ConnectionStatus;
  checkStatus: (force?: boolean) => Promise<void>;
  isChecking: boolean;
}

const CACHE_KEY = "whatsapp-status-cache";
const CACHE_DURATION = 5 * 60 * 1000;

export function useWhatsAppStatus(autoCheck: boolean = false): WhatsAppStatusResult {
  const [status, setStatus] = useState<ConnectionStatus>("unknown");
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = useCallback(async (force: boolean = false) => {
    if (!force) {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { status: cachedStatus, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setStatus(cachedStatus);
            return;
          }
        } catch (e) {
          // Cache inválido, segue para verificação
        }
      }
    }

    setIsChecking(true);
    setStatus("checking");

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { action: "check_status" }
      });

      let newStatus: ConnectionStatus = "disconnected";
      if (!error && data?.success) {
        const raw = String(data.status || "").toLowerCase();
        if (data.loggedIn || raw === "connected" || raw === "open") {
          newStatus = "connected";
        } else if (data.connected || raw === "awaiting_qr" || raw === "connecting") {
          // Socket no ar, mas sem conta logada: precisa ler o QR.
          newStatus = "awaiting_qr";
        } else {
          newStatus = "disconnected";
        }
      }
      setStatus(newStatus);

      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        status: newStatus,
        timestamp: Date.now(),
      }));
    } catch (error) {
      setStatus("disconnected");
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        status: "disconnected",
        timestamp: Date.now(),
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
