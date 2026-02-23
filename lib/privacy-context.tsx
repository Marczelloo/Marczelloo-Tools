"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Shield } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface PrivacyContextType {
  /** Whether user has acknowledged the privacy notice */
  hasAcknowledged: boolean;
  /** Acknowledge the privacy notice */
  acknowledge: () => void;
  /** Reset acknowledgment (for testing) */
  reset: () => void;
}

interface PrivacyProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = "mt_privacy_acknowledged";

// ============================================================================
// CONTEXT
// ============================================================================

const PrivacyContext = createContext<PrivacyContextType | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function PrivacyProvider({ children }: PrivacyProviderProps): React.JSX.Element {
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  // Check for existing acknowledgment on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      setHasAcknowledged(stored === "true");
    } catch {
      // SessionStorage not available
      setHasAcknowledged(false);
    }
  }, []);

  const acknowledge = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setHasAcknowledged(true);
    } catch {
      // If sessionStorage fails, just set state
      setHasAcknowledged(true);
    }
  }, []);

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      setHasAcknowledged(false);
    } catch {
      setHasAcknowledged(false);
    }
  }, []);

  return (
    <PrivacyContext.Provider value={{ hasAcknowledged, acknowledge, reset }}>
      {children}
    </PrivacyContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function usePrivacy(): PrivacyContextType {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error("usePrivacy must be used within PrivacyProvider");
  }
  return context;
}

// ============================================================================
// NOTIFICATION BANNER COMPONENT
// ============================================================================

interface PrivacyNotificationProps {
  className?: string;
}

export function PrivacyNotification({ className }: PrivacyNotificationProps): React.JSX.Element | null {
  const { hasAcknowledged, acknowledge } = usePrivacy();

  if (hasAcknowledged) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      <div className="bg-zinc-900 border-t border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-white/10 rounded-sm flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-3 h-3 text-white" />
            </div>
            <p className="text-sm text-zinc-300">
              <span className="font-medium text-white">Privacy Notice:</span> We use{" "}
              <span className="font-medium text-white">session storage</span> only for
              anonymous session tracking. No cookies, no tracking, your files are never stored.
              <a
                href="/app/privacy"
                className="text-white underline ml-1 hover:text-zinc-300 transition-colors"
              >
                Learn more
              </a>
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={acknowledge}
              className="px-4 py-2 bg-white text-black text-sm font-medium rounded-sm hover:bg-zinc-200 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrivacyContext;
