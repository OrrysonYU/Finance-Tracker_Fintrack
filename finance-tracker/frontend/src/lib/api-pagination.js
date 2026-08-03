export async function fetchAllPages(client, url, params = {}) {
  const firstResponse = await client.get(url, { params });
  const firstPage = firstResponse.data;

  if (Array.isArray(firstPage)) return firstPage;

  const items = [...(firstPage?.results ?? [])];
  let nextUrl = firstPage?.next;

  while (nextUrl) {
    const { data } = await client.get(nextUrl);
    items.push(...(data?.results ?? []));
    nextUrl = data?.next;
  }

  return items;
}

export function normalizePage(data) {
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }

  return {
    count: data?.count ?? 0,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
    results: data?.results ?? [],
  };
}
