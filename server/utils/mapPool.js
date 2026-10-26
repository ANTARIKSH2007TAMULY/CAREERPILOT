export const mapPool = async (items = [], concurrency = 4, worker) => {
  const list = Array.from(items);
  if (list.length === 0) return [];
  const results = new Array(list.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, list.length) }, async () => {
    while (next < list.length) {
      const index = next;
      next += 1;
      results[index] = await worker(list[index], index);
    }
  });
  await Promise.all(runners);
  return results;
};

export const chunkArray = (items = [], size = 250) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};
