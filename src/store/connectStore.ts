import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface ConnectStoreState {
  connected: boolean;
  address: string;

  setConnected: (connected: boolean) => void;
  setAddress: (address: string) => void;

  disconnect: () => Promise<void>;
}

export const useConnectStore = create<ConnectStoreState>((set) => ({
  // Getters
  connected: false,
  address: "0.0.0.0:21",

  // Setters
  setConnected: (connected: boolean) => set({ connected }),
  setAddress: (address: string) => set({ address }),

  // Actions
  disconnect: async () => {
    await invoke("disconnect_ftp_server");
    set({ connected: false });
    set({ address: "0.0.0.0:21" });
  },
}));
