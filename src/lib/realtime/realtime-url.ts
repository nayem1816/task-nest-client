// Next rewrites cannot carry a WebSocket, so sockets go straight to the API.
export const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:4100';
