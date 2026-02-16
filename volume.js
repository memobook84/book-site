// URLパラメータを取得
function getVolumeParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        seriesId: params.get('seriesId') ? parseInt(params.get('seriesId')) : null,
        volumeNum: params.get('volumeNum') ? parseInt(params.get('volumeNum')) : null,
        isbn: params.get('isbn') || null,
        title: params.get('title') ? decodeURIComponent(params.get('title')) : null,
    };
}

// 巻の詳細を表示（メイン処理）
async function displayVolumeDetail() {
    const { seriesId, volumeNum, isbn, title } = getVolumeParams();

    let volume = null;

    // APIから取得を試みる
    if (isbn) {
        volume = await fetchVolumeByIsbn(isbn);
    } else if (title) {
        volume = await fetchVolumeByTitle(title);
    }

    // APIで取得できなかった場合、ローカルデータベースからフォールバック
    if (!volume && seriesId !== null) {
        const manga = mangaDatabase.find(m => m.id === seriesId);
        if (manga) {
            const vNum = volumeNum || 1;
            volume = buildLocalVolume(manga, vNum);
        }
    }

    if (!volume) {
        document.getElementById('volume-title').textContent = '作品が見つかりません';
        return;
    }

    // ページタイトルを更新
    document.title = `${volume.title} - THE MANGA STORE`;

    // 画像を表示
    const volumeImageContainer = document.querySelector('.volume-image');
    volumeImageContainer.innerHTML = createDetailImageElement(volume);

    document.getElementById('volume-title').textContent = volume.title;
    document.getElementById('volume-number').textContent = volume.volumeLabel || '';

    // 著者名をリンクとして設定
    const authorLink = document.getElementById('volume-author');
    authorLink.textContent = volume.author;
    authorLink.href = `author.html?name=${encodeURIComponent(volume.author)}`;

    document.getElementById('volume-publisher').textContent = volume.publisher || '-';
    document.getElementById('volume-label').textContent = volume.label || volume.seriesName || '-';
    document.getElementById('volume-date').textContent = volume.firstReleaseDate || '-';
    document.getElementById('volume-price').textContent = volume.price || '-';
    document.getElementById('volume-synopsis').textContent = volume.description || 'この巻の情報はありません。';

    // 購入ボタンのリンクを設定
    document.getElementById('buy-rakuten').href = getRakutenBuyUrl(volume);
    document.getElementById('buy-amazon').href = getAmazonBuyUrl(volume);

    // 作品ページに戻るリンクを設定
    if (volume.isbn) {
        document.getElementById('back-to-series').href = `detail.html?isbn=${volume.isbn}&title=${encodeURIComponent(volume.seriesName || volume.title)}`;
    } else if (seriesId !== null) {
        document.getElementById('back-to-series').href = `detail.html?id=${seriesId}`;
    }
}

// ISBNでAPIから取得
async function fetchVolumeByIsbn(isbn) {
    try {
        const response = await fetch(`/api/books?isbn=${isbn}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        const adapted = adaptApiResponse(data);
        return adapted.items[0] || null;
    } catch (err) {
        console.warn('ISBN検索失敗:', err);
        return null;
    }
}

// タイトルでAPIから取得
async function fetchVolumeByTitle(title) {
    try {
        const response = await fetch(`/api/search?keyword=${encodeURIComponent(title)}&hits=1`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        const adapted = adaptApiResponse(data);
        return adapted.items[0] || null;
    } catch (err) {
        console.warn('タイトル検索失敗:', err);
        return null;
    }
}

// ローカルデータからボリューム情報を構築（フォールバック）
function buildLocalVolume(manga, volumeNum) {
    const dateMatch = (manga.firstReleaseDate || '').match(/(\d+)年(\d+)月/);
    const startYear = dateMatch ? parseInt(dateMatch[1]) : 2020;
    const startMonth = dateMatch ? parseInt(dateMatch[2]) : 1;

    const monthsElapsed = (volumeNum - 1) * 3;
    const year = startYear + Math.floor((startMonth - 1 + monthsElapsed) / 12);
    const month = ((startMonth - 1 + monthsElapsed) % 12) + 1;

    const basePrice = 440;
    const variation = (volumeNum % 3) * 20;

    return {
        id: manga.id,
        title: manga.title,
        volumeLabel: `${volumeNum}巻`,
        author: manga.author,
        publisher: manga.publisher,
        label: manga.label,
        seriesName: manga.label || '',
        genre: manga.genre,
        firstReleaseDate: `${year}年${month}月`,
        description: `${manga.title}の第${volumeNum}巻。`,
        imageUrl: '',
        price: `¥${basePrice + variation}（税込）`,
        priceRaw: basePrice + variation,
        isbn: '',
        itemUrl: '',
        color: manga.color,
    };
}

// ページ読み込み時に実行
window.addEventListener('DOMContentLoaded', displayVolumeDetail);
