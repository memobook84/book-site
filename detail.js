// URLパラメータを取得
function getDetailParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        title: params.get('title') ? decodeURIComponent(params.get('title')) : null,
    };
}

// タイトルから巻数を抽出
function extractVolumeNumber(title) {
    if (!title) return null;
    // "ONE PIECE 114" → 114
    let m = title.match(/[\s　]+(\d+)$/);
    if (m) return parseInt(m[1]);
    // "名探偵コナン（108）" → 108
    m = title.match(/[（(](\d+)[）)]$/);
    if (m) return parseInt(m[1]);
    // "xxx 第3巻" → 3
    m = title.match(/第(\d+)巻?$/);
    if (m) return parseInt(m[1]);
    // "xxx 3巻" → 3
    m = title.match(/(\d+)巻$/);
    if (m) return parseInt(m[1]);
    return null;
}

// 表紙画像の色からグラデーション背景を動的生成
function applyHeroGradient(color) {
    const hero = document.getElementById('hero-section');
    if (!hero || !color) return;

    // 色を薄くしてグラデーションに使用
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // 薄い色（白に近づける）
    const lightR = Math.round(r + (255 - r) * 0.75);
    const lightG = Math.round(g + (255 - g) * 0.75);
    const lightB = Math.round(b + (255 - b) * 0.75);

    hero.style.background = `linear-gradient(180deg, rgb(${lightR}, ${lightG}, ${lightB}) 0%, #ffffff 100%)`;
}

// あらすじ折りたたみ機能
function setupSynopsisToggle() {
    const wrapper = document.getElementById('synopsis-wrapper');
    const toggle = document.getElementById('synopsis-toggle');
    if (!wrapper || !toggle) return;

    // テキストの高さが制限超えるか判定
    requestAnimationFrame(() => {
        const scrollH = wrapper.scrollHeight;
        const maxH = 120;

        if (scrollH > maxH + 20) {
            toggle.style.display = 'block';
        } else {
            toggle.style.display = 'none';
            wrapper.classList.add('expanded');
        }
    });

    toggle.addEventListener('click', () => {
        const isExpanded = wrapper.classList.toggle('expanded');
        toggle.textContent = isExpanded ? '閉じる' : 'もっと見る';
    });
}

// 作品の詳細を表示（メイン処理 — シリーズページ）
async function displayBookDetail() {
    const { title } = getDetailParams();

    if (!title) {
        document.getElementById('book-title').textContent = '作品が見つかりません';
        return;
    }

    // タイトルで全巻を検索
    let allVolumes = [];
    try {
        const response = await fetch(`/api/search?keyword=${encodeURIComponent(title)}&hits=30`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        const adapted = adaptApiResponse(data);
        allVolumes = adapted.items;
    } catch (err) {
        console.warn('シリーズ検索失敗:', err);
        document.getElementById('book-title').textContent = '作品が見つかりません';
        return;
    }

    if (allVolumes.length === 0) {
        document.getElementById('book-title').textContent = '作品が見つかりません';
        return;
    }

    // シリーズ名でフィルタリング（関連ない作品を除外）
    const seriesName = extractSeriesName(title);
    const filtered = allVolumes.filter(v => {
        const vSeries = extractSeriesName(v.title);
        return vSeries === seriesName;
    });
    const volumes = filtered.length > 0 ? filtered : allVolumes;

    // --- シリーズ情報を集約 ---
    const displaySeriesName = seriesName || title;
    document.title = `${displaySeriesName} - THE BOOK STORE`;

    // タイトル
    document.getElementById('book-title').textContent = displaySeriesName;

    // 著者
    const firstVol = volumes[0];
    const authorLink = document.getElementById('book-author');
    authorLink.textContent = firstVol.author || '-';
    authorLink.href = `author.html?name=${encodeURIComponent(firstVol.author || '')}`;

    // メタ情報ピル
    document.getElementById('pill-volumes').textContent = `${volumes.length}巻`;
    document.getElementById('pill-publisher').textContent = firstVol.publisher || '-';
    document.getElementById('pill-genre').textContent = firstVol.genre || '-';
    document.getElementById('pill-label').textContent = firstVol.label || firstVol.seriesName || '-';
    document.getElementById('meta-bar').style.display = 'flex';

    // あらすじ
    const withDescription = volumes.find(v => v.description && v.description.trim() !== '');
    document.getElementById('book-description').textContent =
        (withDescription ? withDescription.description : '') || 'あらすじ情報がありません。';
    document.getElementById('synopsis-section').style.display = 'block';

    // 表紙画像: 実カバーがある巻から選択（最新巻除外）
    const sortedByDate = [...volumes].sort((a, b) => {
        const dateA = a.firstReleaseDate || '';
        const dateB = b.firstReleaseDate || '';
        return dateB.localeCompare(dateA);
    });
    const nonLatest = sortedByDate.length > 1 ? sortedByDate.slice(1) : sortedByDate;
    const withCover = nonLatest.filter(v => v.hasRealCover);
    const coverPool = withCover.length > 0 ? withCover : nonLatest;
    const coverVol = coverPool[Math.floor(Math.random() * coverPool.length)];

    // ヒーローカバー画像を挿入
    const heroCover = document.getElementById('hero-cover');
    heroCover.innerHTML = createDetailImageElement({
        ...coverVol,
        title: displaySeriesName,
    });

    // 背景グラデーションを適用
    applyHeroGradient(coverVol.color);

    // 購入ボタンの設定
    const rakutenBtn = document.getElementById('rakuten-button');
    const amazonBtn = document.getElementById('amazon-button');
    const searchQuery = encodeURIComponent(displaySeriesName);
    rakutenBtn.href = `https://search.rakuten.co.jp/search/mall/${searchQuery}/?s=11`;
    amazonBtn.href = `https://www.amazon.co.jp/s?k=${searchQuery}`;
    document.getElementById('action-buttons').style.display = 'flex';

    // フォローボタンの設定
    setupFollowButton({
        ...firstVol,
        title: displaySeriesName,
    });

    // あらすじ折りたたみ
    setupSynopsisToggle();

    // --- 巻一覧を表示 ---
    displayVolumesList(volumes);
    document.getElementById('volumes-section').style.display = 'block';

    // 表紙がない画像をGoogle Books APIでアップグレード
    upgradeCovers();
}

// 巻一覧を横スクロールカルーセルで表示
function displayVolumesList(volumes) {
    const carousel = document.getElementById('volumes-carousel');
    carousel.innerHTML = '';

    if (volumes.length === 0) {
        carousel.innerHTML = '<p style="text-align:center;padding:20px;color:var(--color-text-sub);">巻情報が見つかりませんでした</p>';
        return;
    }

    // 巻数を抽出してソート
    const withVolNum = volumes.map(vol => ({
        ...vol,
        volumeNum: extractVolumeNumber(vol.title),
    }));

    withVolNum.sort((a, b) => {
        if (a.volumeNum !== null && b.volumeNum !== null) return a.volumeNum - b.volumeNum;
        if (a.volumeNum !== null) return -1;
        if (b.volumeNum !== null) return 1;
        return (a.title || '').localeCompare(b.title || '');
    });

    withVolNum.forEach(vol => {
        const volumeItem = document.createElement('div');
        volumeItem.className = 'volume-item';

        const imageHtml = createImageElement(vol, 185);
        const volumeLabel = vol.volumeNum !== null ? `${vol.volumeNum}巻` : vol.title;

        volumeItem.innerHTML = `
            ${imageHtml}
            <div class="volume-info">
                <div class="volume-number">${volumeLabel}</div>
                <div class="volume-date">${vol.firstReleaseDate || ''}</div>
            </div>
        `;

        volumeItem.addEventListener('click', () => {
            if (vol.isbn) {
                const seriesName = extractSeriesName(vol.title) || '';
                window.location.href = `volume.html?isbn=${vol.isbn}&title=${encodeURIComponent(vol.title)}&series=${encodeURIComponent(seriesName)}`;
            }
        });

        carousel.appendChild(volumeItem);
    });
}

// フォロー機能
function setupFollowButton(manga) {
    const followButton = document.getElementById('follow-button');
    const followedBooks = getFollowedBooks();

    const isFollowed = followedBooks.some(m => m.title === manga.title);
    if (isFollowed) {
        followButton.classList.add('followed');
    }

    followButton.addEventListener('click', () => {
        toggleFollow(manga, followButton);
    });
}

function toggleFollow(manga, button) {
    let followedBooks = getFollowedBooks();
    const index = followedBooks.findIndex(m => m.title === manga.title);

    if (index > -1) {
        followedBooks.splice(index, 1);
        button.classList.remove('followed');
    } else {
        followedBooks.push({
            id: manga.id || manga.isbn,
            isbn: manga.isbn || '',
            title: manga.title,
            author: manga.author,
            imageUrl: manga.imageUrl || '',
            color: manga.color || '#666',
        });
        button.classList.add('followed');
    }

    localStorage.setItem('followedBooks', JSON.stringify(followedBooks));
}

function getFollowedBooks() {
    const stored = localStorage.getItem('followedBooks');
    return stored ? JSON.parse(stored) : [];
}

// ページ読み込み時に実行
window.addEventListener('DOMContentLoaded', displayBookDetail);
