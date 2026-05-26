"use client";

import { create } from "zustand";
import type { OrderProposal, TradingIndex, TradingMarketEnvelope } from "@market-narrative/api-client";
import { fetchMarketEnvelope, isTradingAuthError, marketSocketUrl } from "../lib/api";
import { decodeToken, isTradingAdmin, tokenStorageKey, type TradingClaims } from "../lib/auth";

type MarketStore = {
  envelope: TradingMarketEnvelope | null;
  selectedIndex: TradingIndex;
  connected: boolean;
  error: string | null;
  pendingProposal: OrderProposal | null;
  token: string | null;
  admin: TradingClaims | null;
  setAuthToken: (token: string | null) => void;
  setSelectedIndex: (index: TradingIndex) => void;
  setPendingProposal: (proposal: OrderProposal | null) => void;
  loadSnapshot: () => Promise<void>;
  connect: () => void;
};

let socket: WebSocket | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

export const useMarketStore = create<MarketStore>((set) => {
  const clearSession = (message: string) => {
    window.localStorage.removeItem(tokenStorageKey);
    if (socket) {
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
      socket = null;
    }
    stopPolling();
    set({ token: null, admin: null, envelope: null, connected: false, pendingProposal: null, error: message });
  };

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const startPolling = () => {
    if (pollTimer) {
      return;
    }
    const poll = async () => {
      const token = useMarketStore.getState().token;
      if (!token) {
        stopPolling();
        return;
      }
      try {
        const envelope = await fetchMarketEnvelope(token);
        set({ envelope, connected: false, error: null });
      } catch (error) {
        if (isTradingAuthError(error)) {
          clearSession("Trading session expired. Please login again.");
          return;
        }
        set({ error: error instanceof Error ? error.message : "Unable to load market data", connected: false });
      }
    };
    void poll();
    pollTimer = setInterval(poll, 5000);
  };

  return {
    envelope: null,
    selectedIndex: "BANKNIFTY",
    connected: false,
    error: null,
    pendingProposal: null,
    token: null,
    admin: null,
    setAuthToken: (token) => {
      if (token && isTradingAdmin(token)) {
        window.localStorage.setItem(tokenStorageKey, token);
        set({ token, admin: decodeToken(token), error: null });
        return;
      }
      window.localStorage.removeItem(tokenStorageKey);
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
        socket = null;
      }
      stopPolling();
      set({ token: null, admin: null, envelope: null, connected: false, pendingProposal: null });
    },
    setSelectedIndex: (selectedIndex) => set({ selectedIndex }),
    setPendingProposal: (pendingProposal) => set({ pendingProposal }),
    loadSnapshot: async () => {
      const token = useMarketStore.getState().token;
      if (!token) {
        return;
      }
      try {
        const envelope = await fetchMarketEnvelope(token);
        set({ envelope, error: null });
      } catch (error) {
        if (isTradingAuthError(error)) {
          clearSession("Trading session expired. Please login again.");
          return;
        }
        set({ error: error instanceof Error ? error.message : "Unable to load market data" });
      }
    },
    connect: () => {
      const token = useMarketStore.getState().token;
      if (!token) {
        return;
      }
      if (socket && socket.readyState <= 1) {
        return;
      }
      socket = new WebSocket(marketSocketUrl(token));
      socket.onopen = () => {
        stopPolling();
        set({ connected: true, error: null });
      };
      socket.onclose = () => {
        set({ connected: false });
        startPolling();
      };
      socket.onerror = () => {
        set({ connected: false });
        startPolling();
      };
      socket.onmessage = (event) => {
        const envelope = JSON.parse(event.data) as TradingMarketEnvelope;
        set({ envelope, connected: true, error: null });
      };
    }
  };
});
