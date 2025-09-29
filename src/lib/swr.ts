export async function fetcher<T>(input: RequestInfo | URL): Promise<T> {
  const response = await fetch(input, { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "İstek sırasında hata oluştu");
  }

  const payload = await response.json();
  return (payload.data ?? payload) as T;
}
