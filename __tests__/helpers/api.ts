const testBaseUrl = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

export function apiUrl(path: string): string {
  return new URL(path, testBaseUrl).toString();
}
