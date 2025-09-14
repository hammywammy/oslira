export class ScraperErrorHandler {
  static transformError(error: any, username: string): Error
  static shouldRetryError(error: any): boolean
  static createFallbackProfile(username: string, profileData?: any): ProfileData
}

export async function withScraperRetry<T>(
  attempts: Array<() => Promise<T>>,
  username: string
): Promise<T>
