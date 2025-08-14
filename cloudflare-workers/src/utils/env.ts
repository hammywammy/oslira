import { Env } from '../types/interfaces';

export function getEnvironment(env: Env): string {
  return env.APP_ENV || 'development';
}

export function isProduction(env: Env): boolean {
  return getEnvironment(env) === 'production';
}

export function isStaging(env: Env): boolean {
  return getEnvironment(env) === 'staging';
}

export function isDevelopment(env: Env): boolean {
  return getEnvironment(env) === 'development';
}
