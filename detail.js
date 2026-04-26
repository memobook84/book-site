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
        console.warn('API検索失敗、ローカルデータから検索:', err);
        // ローカルJSONからフォールバック
        try {
            const localResp = await fetch('/data/book-all.json');
            if (!localResp.ok) throw new Error('book-all.json not found');
            const allBooks = await localResp.json();
            const seriesName = extractSeriesName(title);
            const match = allBooks.find(b =>
                b.displayTitle === title || b.title === title ||
                extractSeriesName(b.title) === seriesName
            );
            if (match) {
                // coverCandidatesから疑似巻リストを生成
                const candidates = match.coverCandidates || [];
                allVolumes = candidates.map((c, i) => adaptItem({
                    ...match,
                    imageUrl: c.imageUrl,
                    isbn: c.isbn,
                    hasRealCover: c.hasRealCover,
                    title: candidates.length > 1 ? `${match.displayTitle} ${i + 1}` : match.displayTitle,
                }, i));
                // 候補がなければシリーズ単体を1巻として扱う
                if (allVolumes.length === 0) {
                    allVolumes = [adaptItem(match, 0)];
                }
            }
        } catch (localErr) {
            console.warn('ローカルデータ検索も失敗:', localErr);
        }
        if (allVolumes.length === 0) {
            document.getElementById('book-title').textContent = '作品が見つかりません';
            return;
        }
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

    // タイトル
    const displaySeriesName = seriesName || title;
    document.title = `${displaySeriesName} - THE BOOK STORE`;
    document.getElementById('book-title').textContent = displaySeriesName;

    // 著者・出版社・レーベル: 最初の巻から取得
    const firstVol = volumes[0];
    const authorLink = document.getElementById('book-author');
    authorLink.textContent = firstVol.author || '-';
    authorLink.href = `author.html?name=${encodeURIComponent(firstVol.author || '')}`;

    document.getElementById('book-publisher').textContent = firstVol.publisher || '-';
    document.getElementById('book-label').textContent = firstVol.label || firstVol.seriesName || '-';
    document.getElementById('book-genre').textContent = firstVol.genre || '-';

    // 巻数表示
    document.getElementById('book-date').textContent = `${volumes.length}巻`;

    // 作品紹介: descriptionが空でない最初の巻から取得
    const withDescription = volumes.find(v => v.description && v.description.trim() !== '');
    document.getElementById('book-description').textContent =
        (withDescription ? withDescription.description : '') || '作品紹介情報がありません。';

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

    // 表紙画像のみ差し替え（フォローボタンは残す）
    const imageContainer = document.querySelector('.detail-image');
    const followBtn = document.getElementById('follow-button');
    imageContainer.innerHTML = createDetailImageElement({
        ...coverVol,
        title: displaySeriesName,
    });
    if (followBtn) imageContainer.appendChild(followBtn);

    // フォローボタンの設定
    setupFollowButton({
        ...firstVol,
        title: displaySeriesName,
    });

    // --- 巻一覧を表示 ---
    displayVolumesList(volumes);

    // 表紙がない画像をGoogle Books APIでアップグレード
    upgradeCovers();
}

// 巻一覧を表示（巻数でソート、volume.htmlへリンク）
function displayVolumesList(volumes) {
    const volumesGrid = document.getElementById('volumes-grid');
    volumesGrid.innerHTML = '';

    if (volumes.length === 0) {
        volumesGrid.innerHTML = '<p style="text-align:center;grid-column:1/-1;padding:20px;color:var(--color-text-sub);">巻情報が見つかりませんでした</p>';
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

        const imageHtml = createImageElement(vol, 280);
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

        volumesGrid.appendChild(volumeItem);
    });
}

// フォロー機能
function setupFollowButton(manga) {
    const followButton = document.getElementById('follow-button');
    const followedBooks = getFollowedBooks();

    const label = followButton.querySelector('.follow-label');
    const isFollowed = followedBooks.some(m => m.title === manga.title);
    if (isFollowed) {
        followButton.classList.add('followed');
        if (label) label.textContent = 'Following';
    }

    followButton.addEventListener('click', () => {
        toggleFollow(manga, followButton);
        const nowFollowed = followButton.classList.contains('followed');
        if (label) label.textContent = nowFollowed ? 'Following' : 'Follow';
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
