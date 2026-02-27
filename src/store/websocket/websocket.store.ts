import { create } from 'zustand';

interface WebSocketStore {
  ws: WebSocket | null;
  setWs: (ws: WebSocket | null) => void;
  send: (data: unknown) => void;
}

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  ws: null,
  setWs: (ws) => set({ ws }),
  send: (data) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  },
}));
