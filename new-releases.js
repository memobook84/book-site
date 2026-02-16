// 新刊リストを表示（メイン処理）
async function displayNewReleases() {
    const listContainer = document.getElementById('releases-list');
    listContainer.innerHTML = '<p style="text-align:center;padding:40px;color:var(--color-text-sub);">新刊情報を読み込み中...</p>';

    let releases = await fetchNewReleases();

    // APIで取得できなかった場合、ローカルデータからフォールバック
    if (!releases || releases.length === 0) {
        releases = generateLocalNewReleases();
    }

    listContainer.innerHTML = '';

    releases.forEach((release, index) => {
        const releaseItem = document.createElement('div');
        releaseItem.className = 'release-item';

        const isNew = index < 3;
        const newBadge = isNew ? '<span class="new-badge">NEW</span>' : '<span style="width: 60px;"></span>';

        const priceDisplay = release.price ? ` / ${release.price}` : '';

        releaseItem.innerHTML = `
            ${newBadge}
            <div class="release-info">
                <div class="release-title">${release.title}</div>
                <div class="release-author">${release.author}</div>
            </div>
            <div class="release-publisher">
                <span class="publisher-name">${release.publisher}</span>
                <span class="label-name">${release.label || ''}${priceDisplay}</span>
            </div>
            <div class="release-date">${release.firstReleaseDate || ''}</div>
        `;

        releaseItem.addEventListener('click', () => {
            if (release.isbn) {
                window.location.href = `detail.html?isbn=${release.isbn}&title=${encodeURIComponent(release.title)}`;
            } else {
                window.location.href = `detail.html?id=${release.id}`;
            }
        });

        listContainer.appendChild(releaseItem);
    });
}

// APIから新刊を取得
async function fetchNewReleases() {
    try {
        const response = await fetch('/api/books?genre=001001&hits=20&sort=sales');
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        const adapted = adaptApiResponse(data);
        return adapted.items;
    } catch (err) {
        console.warn('新刊取得失敗:', err);
        return null;
    }
}

// ローカルデータから新刊情報を生成（フォールバック）
function generateLocalNewReleases() {
    const releases = mangaDatabase.map(manga => {
        const dateMatch = (manga.firstReleaseDate || '').match(/(\d+)年(\d+)月/);
        const startYear = dateMatch ? parseInt(dateMatch[1]) : 2020;
        const startMonth = dateMatch ? parseInt(dateMatch[2]) : 1;

        const monthsElapsed = ((manga.totalVolumes || 1) - 1) * 3;
        const year = startYear + Math.floor((startMonth - 1 + monthsElapsed) / 12);
        const month = ((startMonth - 1 + monthsElapsed) % 12) + 1;

        return {
            id: manga.id,
            title: `${manga.title} ${manga.totalVolumes}巻`,
            author: manga.author,
            publisher: manga.publisher,
            label: manga.label,
            firstReleaseDate: `${year}/${String(month).padStart(2, '0')}`,
            isbn: '',
            sortDate: new Date(year, month - 1, 1),
        };
    });

    releases.sort((a, b) => b.sortDate - a.sortDate);
    return releases.slice(0, 20);
}

// ページ読み込み時に実行
window.addEventListener('DOMContentLoaded', displayNewReleases);
