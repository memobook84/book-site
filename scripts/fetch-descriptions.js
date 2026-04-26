// book-all.json の各書籍に楽天APIからあらすじを補完するスクリプト
const https = require('https');
const fs = require('fs');
const path = require('path');

// .env を読み込む
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  });
}

const APP_ID = 'baf572c9-8b33-407f-84de-79088be6b58a';
const RAKUTEN_BASE = 'https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404';
const REFERER = 'https://manga-site-three.vercel.app';
const DATA_PATH = path.join(__dirname, '../data/book-all.json');

function rakutenFetch(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': REFERER,
        'Origin': REFERER,
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function fetchDescription(isbn, title) {
  const accessKey = process.env.RAKUTEN_APP_ID || '';
  // ISBNで検索
  if (isbn) {
    const params = new URLSearchParams({ applicationId: APP_ID, accessKey, formatVersion: '2', isbn });
    try {
      const data = await rakutenFetch(`${RAKUTEN_BASE}?${params}`);
      const items = data.Items || [];
      for (const item of items) {
        const i = item.Item || item;
        if (i.itemCaption) return i.itemCaption;
      }
    } catch {}
  }
  // タイトルで検索
  if (title) {
    const params = new URLSearchParams({ applicationId: APP_ID, accessKey, formatVersion: '2', title, booksGenreId: '001004', hits: '1' });
    try {
      const data = await rakutenFetch(`${RAKUTEN_BASE}?${params}`);
      const items = data.Items || [];
      for (const item of items) {
        const i = item.Item || item;
        if (i.itemCaption) return i.itemCaption;
      }
    } catch {}
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const books = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const total = books.length;
  let updated = 0;
  let skipped = 0;

  console.log(`合計 ${total} 件処理します`);

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    if (book.description) { skipped++; continue; }

    // coverCandidatesの最初のISBNを使用
    const isbn = book.coverCandidates?.[0]?.isbn || '';
    const desc = await fetchDescription(isbn, book.displayTitle || book.title);

    if (desc) {
      book.description = desc;
      updated++;
    }

    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(DATA_PATH, JSON.stringify(books, null, 2), 'utf8');
      console.log(`[${i + 1}/${total}] 更新: ${updated}, スキップ: ${skipped}`);
      await sleep(500);
    } else {
      await sleep(200);
    }
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(books, null, 2), 'utf8');
  console.log(`完了: ${updated} 件にあらすじを追加しました`);
}

main().catch(console.error);
