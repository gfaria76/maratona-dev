export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { message?: unknown } }).data;
    if (typeof data?.message === "string" && data.message) return data.message;
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
}
