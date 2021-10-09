export interface Logger {
  log: (...args: any[]) => void
  error: (message: string, error: Error) => void
}