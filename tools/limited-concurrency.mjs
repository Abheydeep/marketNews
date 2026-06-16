export async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  const workers = [];
  let index = 0;
  const workerCount = Math.max(1, Math.min(items.length || 1, Number(limit) || 1));

  for (let worker = 0; worker < workerCount; worker += 1) {
    workers.push((async () => {
      while (index < items.length) {
        const current = index;
        index += 1;
        results[current] = await mapper(items[current], current);
      }
    })());
  }

  await Promise.all(workers);
  return results;
}
