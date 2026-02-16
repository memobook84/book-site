export default async function handler(req, res) {
  const { keyword, page = '1', hits = '30' } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: 'keyword parameter is required' });
  }

  const appId = process.env.RAKUTEN_APP_ID;
  if (!appId) {
    return res.status(500).json({ error: 'RAKUTEN_APP_ID not configured' });
  }

  const params = new URLSearchParams({
    applicationId: appId,
    formatVersion: '2',
    title: keyword,
    booksGenreId: '001001',
    hits: String(Math.min(parseInt(hits), 30)),
    page: page,
    sort: 'sales',
  });

  try {
    const response = await fetch(
      `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params}`
    );

    if (!response.ok) {
      throw new Error(`Rakuten API responded with ${response.status}`);
    }

    const data = await response.json();

    res.status(200).json({
      items: (data.Items || []).map(mapItem),
      totalCount: data.count || 0,
      page: data.page || 1,
      pageCount: data.pageCount || 1,
    });
  } catch (err) {
    console.error('Rakuten API error:', err);
    res.status(502).json({ error: 'Failed to fetch from Rakuten API' });
  }
}

function mapItem(item) {
  return {
    title: item.title || '',
    author: item.author || '',
    publisher: item.publisherName || '',
    label: item.seriesName || '',
    genre: item.booksGenreId || '',
    firstReleaseDate: item.salesDate || '',
    description: item.itemCaption || '',
    imageUrl: (item.largeImageUrl || item.mediumImageUrl || '').replace('http://', 'https://'),
    price: item.itemPrice || 0,
    isbn: item.isbn || '',
    itemUrl: item.itemUrl || '',
    seriesName: item.seriesName || '',
  };
}
