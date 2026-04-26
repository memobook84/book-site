// URLパラメータを取得
function getVolumeParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        seriesId: params.get('seriesId') ? parseInt(params.get('seriesId')) : null,
        volumeNum: params.get('volumeNum') ? parseInt(params.get('volumeNum')) : null,
        isbn: params.get('isbn') || null,
        title: params.get('title') ? decodeURIComponent(params.get('title')) : null,
        series: params.get('series') ? decodeURIComponent(params.get('series')) : null,
    };
}

// タイトルから巻数を抽出
function extractVolumeNum(title) {
    if (!title) return null;
    let m = title.match(/[\s\u3000]+(\d+)$/);
    if (m) return parseInt(m[1]);
    m = title.match(/[（(](\d+)[）)]$/);
    if (m) return parseInt(m[1]);
    m = title.match(/第(\d+)巻?$/);
    if (m) return parseInt(m[1]);
    m = title.match(/(\d+)巻$/);
    if (m) return parseInt(m[1]);
    return null;
}

// 巻の詳細を表示（メイン処理）
async function displayVolumeDetail() {
    const { seriesId, volumeNum, isbn, title, series } = getVolumeParams();

    let volume = null;

    // APIから取得を試みる
    if (isbn) {
        volume = await fetchVolumeByIsbn(isbn);
    } else if (title) {
        volume = await fetchVolumeByTitle(title);
    }

    // book-all.json からフォールバック
    if (!volume) {
        try {
            const localResp = await fetch('/data/book-all.json');
            if (localResp.ok) {
                const allBooks = await localResp.json();
                let match = null;
                let matchedCandidate = null;

                if (isbn) {
                    // ISBNで候補を検索
                    for (const b of allBooks) {
                        const c = (b.coverCandidates || []).find(c => c.isbn === isbn);
                        if (c) { match = b; matchedCandidate = c; break; }
                    }
                }
                if (!match && (title || series)) {
                    const seriesKey = series || extractSeriesName(title) || title;
                    match = allBooks.find(b =>
                        b.displayTitle === seriesKey || b.title === seriesKey ||
                        extractSeriesName(b.title) === seriesKey
                    );
                    matchedCandidate = match?.coverCandidates?.[0] || null;
                }

                if (match) {
                    volume = adaptItem({
                        ...match,
                        imageUrl: matchedCandidate?.imageUrl || match.imageUrl || '',
                        isbn: matchedCandidate?.isbn || match.isbn || isbn || '',
                        hasRealCover: matchedCandidate?.hasRealCover ?? match.hasRealCover,
                        title: title || match.displayTitle,
                    }, 0);
                }
            }
        } catch (e) {
            console.warn('book-all.jsonフォールバック失敗:', e);
        }
    }

    // book-data.js からフォールバック
    if (!volume && seriesId !== null) {
        const manga = bookDatabase.find(m => m.id === seriesId);
        if (manga) {
            volume = buildLocalVolume(manga, volumeNum || 1);
        }
    }

    if (!volume) {
        document.getElementById('volume-title').textContent = '作品が見つかりません';
        return;
    }

    // ページタイトルを更新
    document.title = `${volume.title} - THE BOOK STORE`;

    // 画像を表示
    const volumeImage3d = document.querySelector('.volume-image-3d');
    if (volumeImage3d) {
        volumeImage3d.innerHTML = createDetailImageElement(volume);
    }

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
    document.getElementById('volume-isbn').textContent = volume.isbn || '-';
    document.getElementById('volume-pagecount').textContent = volume.pageCount ? `${volume.pageCount}ページ` : '-';
    document.getElementById('volume-synopsis').textContent = volume.description || 'この巻の情報はありません。';

    // 購入ボタンのリンクを設定
    document.getElementById('buy-rakuten').href = getRakutenBuyUrl(volume);
    document.getElementById('buy-amazon').href = getAmazonBuyUrl(volume);

    const seriesName = series || extractSeriesName(volume.title) || volume.title;
    setupFollowBtn(seriesName);

    // 全巻データを取得してスライダーとシリーズ一覧を構築
    setupSeriesData(seriesName, isbn, title);

    // 関連作品を表示
    loadRelatedBooks(volume);
}

// シリーズ全巻データを取得してスライダーとシリーズ一覧を構築
async function setupSeriesData(seriesName, currentIsbn, currentTitle) {
    if (!seriesName) return;

    let allVolumes = [];

    // API から取得
    try {
        const response = await fetch(`/api/search?keyword=${encodeURIComponent(seriesName)}&hits=30`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        const adapted = adaptApiResponse(data);
        const filtered = adapted.items.filter(v => extractSeriesName(v.title) === seriesName);
        allVolumes = filtered.length > 0 ? filtered : adapted.items;
    } catch (err) {
        console.warn('API取得失敗、book-all.jsonから検索:', err);
        // book-all.json フォールバック
        try {
            const localResp = await fetch('/data/book-all.json');
            if (localResp.ok) {
                const allBooks = await localResp.json();
                const match = allBooks.find(b =>
                    b.displayTitle === seriesName || b.title === seriesName ||
                    extractSeriesName(b.title) === seriesName
                );
                if (match && match.coverCandidates?.length > 0) {
                    allVolumes = match.coverCandidates.map((c, i) => adaptItem({
                        ...match,
                        imageUrl: c.imageUrl,
                        isbn: c.isbn,
                        hasRealCover: c.hasRealCover,
                        title: match.coverCandidates.length > 1
                            ? `${match.displayTitle} ${i + 1}`
                            : match.displayTitle,
                    }, i));
                }
            }
        } catch (localErr) {
            console.warn('ローカルデータも取得失敗:', localErr);
        }
    }

    if (allVolumes.length === 0) return;

    // 巻数を抽出してソート
    const withVolNum = allVolumes.map(vol => ({
        ...vol,
        volNum: extractVolumeNum(vol.title),
    }));
    withVolNum.sort((a, b) => {
        if (a.volNum !== null && b.volNum !== null) return a.volNum - b.volNum;
        if (a.volNum !== null) return -1;
        if (b.volNum !== null) return 1;
        return (a.title || '').localeCompare(b.title || '');
    });

    // 前後スライダーを設定
    let currentIndex = -1;
    if (currentIsbn) currentIndex = withVolNum.findIndex(v => v.isbn === currentIsbn);
    if (currentIndex === -1 && currentTitle) currentIndex = withVolNum.findIndex(v => v.title === currentTitle);

    if (withVolNum.length > 1 && currentIndex !== -1) {
        const slider = document.getElementById('volume-slider');
        slider.style.display = 'flex';

        const prevBtn = document.getElementById('prev-volume');
        const nextBtn = document.getElementById('next-volume');
        const positionLabel = document.getElementById('volume-position');
        const currentVol = withVolNum[currentIndex];
        positionLabel.textContent = currentVol.volNum !== null
            ? `${currentVol.volNum} / ${withVolNum.length}巻`
            : `${currentIndex + 1} / ${withVolNum.length}`;

        if (currentIndex > 0) {
            const prev = withVolNum[currentIndex - 1];
            prevBtn.disabled = false;
            document.getElementById('prev-label').textContent = prev.volNum !== null ? `${prev.volNum}巻` : '前の巻';
            prevBtn.addEventListener('click', () => navigateToVolume(prev, seriesName));
        }
        if (currentIndex < withVolNum.length - 1) {
            const next = withVolNum[currentIndex + 1];
            nextBtn.disabled = false;
            document.getElementById('next-label').textContent = next.volNum !== null ? `${next.volNum}巻` : '次の巻';
            nextBtn.addEventListener('click', () => navigateToVolume(next, seriesName));
        }
    }

    // シリーズ一覧を表示
    if (withVolNum.length > 1) {
        renderSeriesList(withVolNum, currentIsbn, seriesName);
    }
}

// シリーズ一覧グリッドを描画
function renderSeriesList(volumes, currentIsbn, seriesName) {
    const section = document.getElementById('series-list-section');
    const grid = document.getElementById('series-volumes-grid');
    if (!section || !grid) return;

    section.style.display = 'block';
    grid.innerHTML = '';

    volumes.forEach(vol => {
        const item = document.createElement('div');
        item.className = 'volume-item' + (vol.isbn === currentIsbn ? ' volume-item--active' : '');

        const imageHtml = createImageElement(vol, 280);
        const label = vol.volNum !== null ? `${vol.volNum}巻` : vol.title;

        item.innerHTML = `
            ${imageHtml}
            <div class="volume-info">
                <div class="volume-number">${label}</div>
                <div class="volume-date">${vol.firstReleaseDate || ''}</div>
            </div>
        `;

        if (vol.isbn && vol.isbn !== currentIsbn) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => navigateToVolume(vol, seriesName));
        }

        grid.appendChild(item);
    });

    upgradeCovers();
}

// 指定した巻のページに遷移
function navigateToVolume(vol, seriesName) {
    const params = new URLSearchParams();
    if (vol.isbn) params.set('isbn', vol.isbn);
    params.set('title', vol.title);
    if (seriesName) params.set('series', seriesName);
    window.location.href = `volume.html?${params.toString()}`;
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

// 関連作品を取得して表示
async function loadRelatedBooks(volume) {
    const section = document.getElementById('related-section');
    const grid = document.getElementById('related-grid');
    if (!section || !grid) return;

    const currentSeries = extractSeriesName(volume.title) || volume.title;

    try {
        const resp = await fetch('/data/book-all.json');
        if (!resp.ok) return;
        const allBooks = await resp.json();

        const genre = volume.genre || '';
        const publisher = volume.publisher || '';

        // 同ジャンルを優先、次に同出版社
        let candidates = allBooks.filter(b => {
            if (extractSeriesName(b.title) === currentSeries) return false;
            return b.genre === genre || b.publisher === publisher;
        });

        // 同ジャンルだけで絞り込んだものを優先順に並べる
        const byGenre = candidates.filter(b => b.genre === genre);
        const byPublisher = candidates.filter(b => b.genre !== genre && b.publisher === publisher);
        candidates = [...byGenre, ...byPublisher];

        // シャッフルして最大18件
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        candidates = candidates.slice(0, 18);

        if (candidates.length === 0) return;

        section.style.display = 'block';
        grid.innerHTML = '';

        candidates.forEach(b => {
            // coverCandidatesからランダムに表紙を選択
            if (b.coverCandidates && b.coverCandidates.length > 0) {
                const pick = b.coverCandidates[Math.floor(Math.random() * b.coverCandidates.length)];
                b.imageUrl = pick.imageUrl;
                b.isbn = pick.isbn;
                b.hasRealCover = pick.hasRealCover;
            }
            const item = adaptItem(b, 0);
            item.displayTitle = b.displayTitle || b.title;

            const el = document.createElement('div');
            el.className = 'book-item';
            el.innerHTML = `${createImageElement(item)}<h3>${item.displayTitle}</h3>`;
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
                const params = new URLSearchParams();
                if (item.isbn) params.set('isbn', item.isbn);
                params.set('title', item.title);
                params.set('series', item.displayTitle);
                window.location.href = `volume.html?${params.toString()}`;
            });
            grid.appendChild(el);
        });

        upgradeCovers();
    } catch (e) {
        console.warn('関連作品取得失敗:', e);
    }
}

// フォローボタン
function setupFollowBtn(seriesTitle) {
    const btn = document.getElementById('follow-btn');
    if (!btn || !seriesTitle) return;
    const followed = JSON.parse(localStorage.getItem('followedBooks') || '[]');
    const isFollowed = followed.some(b => b.title === seriesTitle || b.displayTitle === seriesTitle);
    const label = btn.querySelector('.follow-label');
    if (isFollowed) { btn.classList.add('followed'); if (label) label.textContent = 'Following'; }
    btn.addEventListener('click', function() {
        const list = JSON.parse(localStorage.getItem('followedBooks') || '[]');
        const idx = list.findIndex(b => b.title === seriesTitle || b.displayTitle === seriesTitle);
        if (idx >= 0) {
            list.splice(idx, 1);
            btn.classList.remove('followed');
            if (label) label.textContent = 'Follow';
        } else {
            list.push({ title: seriesTitle, displayTitle: seriesTitle });
            btn.classList.add('followed');
            if (label) label.textContent = 'Following';
        }
        localStorage.setItem('followedBooks', JSON.stringify(list));
    });
}

// ページ読み込み時に実行
window.addEventListener('DOMContentLoaded', displayVolumeDetail);
