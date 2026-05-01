"use client";

import { create } from "zustand";
import type { OrderProposal, TradingIndex, TradingMarketEnvelope } from "@market-narrative/api-client";
import { fetchMarketEnvelope, marketSocketUrl } from "../lib/api";
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

export const useMarketStore = create<MarketStore>((set) => ({
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
    socket?.close();
    socket = null;
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
    socket.onopen = () => set({ connected: true, error: null });
    socket.onclose = () => set({ connected: false });
    socket.onerror = () => set({ error: "Market WebSocket connection failed", connected: false });
    socket.onmessage = (event) => {
      const envelope = JSON.parse(event.data) as TradingMarketEnvelope;
      set({ envelope, connected: true, error: null });
    };
  }
}));
