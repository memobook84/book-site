// 楽天APIレスポンスをサイト内データ形式に変換するアダプター

// ジャンルIDからジャンル名へのマッピング
const genreMap = {
  '001001001': '少年漫画',
  '001001002': '少女漫画',
  '001001003': '青年漫画',
  '001001004': 'レディースコミック',
  '001001005': 'BL（ボーイズラブ）',
  '001001006': 'TL（ティーンズラブ）',
  '001001007': '4コマ',
  '001001008': '学習まんが',
  '001001009': 'その他',
};

// ジャンルIDをジャンル名に変換
function resolveGenre(genreId) {
  if (!genreId) return '';
  // 複数ジャンルの場合、最初のものを使用
  const firstGenre = genreId.split('/')[0];
  return genreMap[firstGenre] || 'コミック';
}

// APIレスポンスのアイテムをサイト内形式に変換
function adaptItem(item, index) {
  return {
    id: item.isbn || `api-${index}`,
    title: item.title || '',
    author: item.author || '',
    publisher: item.publisher || '',
    label: item.label || item.seriesName || '',
    genre: resolveGenre(item.genre),
    firstReleaseDate: item.firstReleaseDate || '',
    description: item.description || '',
    imageUrl: item.imageUrl || '',
    price: item.price ? `¥${Number(item.price).toLocaleString()}（税込）` : '',
    priceRaw: item.price || 0,
    isbn: item.isbn || '',
    itemUrl: item.itemUrl || '',
    seriesName: item.seriesName || item.label || '',
    // プレースホルダー用のカラー（画像がない場合のフォールバック）
    color: generateColor(item.title || '', index),
  };
}

// タイトルからカラーを生成（フォールバック用）
function generateColor(title, index) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#F06292', '#66BB6A',
    '#FFA726', '#8D6E63', '#7E57C2', '#29B6F6', '#26A69A', '#D4AF37',
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash + index) % colors.length];
}

// APIレスポンス全体を変換
function adaptApiResponse(response) {
  return {
    items: (response.items || []).map((item, i) => adaptItem(item, i)),
    totalCount: response.totalCount || 0,
    page: response.page || 1,
    pageCount: response.pageCount || 1,
  };
}

// 画像表示用のHTML要素を生成（実画像 or フォールバック）
function createImageElement(item, height = 280) {
  if (item.imageUrl) {
    return `<img src="${item.imageUrl}" alt="${item.title}"
              style="width:100%;height:${height}px;object-fit:cover;"
              onerror="this.parentElement.innerHTML='<div class=\\'manga-placeholder\\' style=\\'background-color:${item.color};height:${height}px;\\'><span class=\\'manga-placeholder-text\\'>${item.title}</span></div>'"
              loading="lazy">`;
  }
  return `<div class="manga-placeholder" style="background-color: ${item.color}; height: ${height}px;">
            <span class="manga-placeholder-text">${item.title}</span>
          </div>`;
}

// 詳細ページ用の大きい画像要素を生成
function createDetailImageElement(item) {
  if (item.imageUrl) {
    return `<img src="${item.imageUrl}" alt="${item.title}"
              style="width:300px;height:420px;object-fit:cover;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);"
              onerror="this.parentElement.innerHTML='<div class=\\'manga-detail-placeholder\\' style=\\'background-color:${item.color};\\' ><span class=\\'manga-placeholder-text\\'>${item.title}</span></div>'"
              loading="lazy">`;
  }
  return `<div class="manga-detail-placeholder" style="background-color: ${item.color};">
            <span class="manga-placeholder-text">${item.title}</span>
          </div>`;
}

// 購入リンクの生成
function getRakutenBuyUrl(item) {
  if (item.itemUrl) return item.itemUrl;
  if (item.isbn) return `https://books.rakuten.co.jp/search?isbn=${item.isbn}`;
  return `https://books.rakuten.co.jp/search?sitem=${encodeURIComponent(item.title)}`;
}

function getAmazonBuyUrl(item) {
  if (item.isbn) return `https://www.amazon.co.jp/dp/${item.isbn}`;
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(item.title)}`;
}
