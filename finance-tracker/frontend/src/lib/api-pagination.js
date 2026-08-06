export function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

export async function fetchAllPages(client, url, params = {}) {
  const firstResponse = await client.get(url, { params });
  const firstPage = firstResponse.data;

  if (Array.isArray(firstPage)) return firstPage;

  const items = [...normalizeList(firstPage)];
  let nextUrl = firstPage?.next;

  while (nextUrl) {
    const { data } = await client.get(nextUrl);
    items.push(...normalizeList(data));
    nextUrl = data?.next;
  }

  return items;
}

export function normalizePage(data) {
  const results = normalizeList(data);
  if (Array.isArray(data)) {
    return { count: results.length, next: null, previous: null, results };
  }

  const count = Number(data?.count);

  return {
    count: Number.isFinite(count) && count >= 0 ? count : results.length,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
    results,
  };
}
