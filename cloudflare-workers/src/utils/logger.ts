export function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function logger(level: 'info' | 'warn' | 'error', message: string, data?: any, requestId?: string) {
  const timestamp = new Date().toISOString();
  const logData = { timestamp, level, message, requestId, ...data };
  console.log(JSON.stringify(logData));
}
