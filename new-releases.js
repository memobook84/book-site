const PAGE_SIZE = 30;
let currentPage = 1;
let totalPages = 1;
let allLocalReleases = [];

// 新刊リストを表示（メイン処理）
async function displayNewReleases(page) {
    page = page || 1;
    currentPage = page;

    const listContainer = document.getElementById('releases-list');
    listContainer.innerHTML = '<p style="text-align:center;padding:40px;color:var(--color-text-sub);">新刊情報を読み込み中...</p>';

    let releases = await fetchNewReleases(page);

    if (!releases || releases.length === 0) {
        if (allLocalReleases.length === 0) {
            allLocalReleases = generateLocalNewReleases();
        }
        totalPages = Math.ceil(allLocalReleases.length / PAGE_SIZE);
        const start = (page - 1) * PAGE_SIZE;
        releases = allLocalReleases.slice(start, start + PAGE_SIZE);
    }

    listContainer.innerHTML = '';

    releases.forEach((release, index) => {
        const releaseItem = document.createElement('div');
        releaseItem.className = 'release-item';

        const globalIndex = (page - 1) * PAGE_SIZE + index;
        const isNew = globalIndex < 3;
        const badge = isNew
            ? '<span class="status-badge badge-new">New</span>'
            : '<span class="status-badge badge-release">Release</span>';

        releaseItem.innerHTML = `
            <span class="col-status">${badge}</span>
            <span class="col-title">${release.title}</span>
            <span class="col-author">${release.author}</span>
            <span class="col-publisher">${release.publisher || '-'}</span>
            <span class="col-date">${release.firstReleaseDate || '-'}</span>
        `;

        releaseItem.addEventListener('click', () => {
            if (release.isbn) {
                window.location.href = `volume.html?isbn=${release.isbn}&title=${encodeURIComponent(release.title)}&series=${encodeURIComponent(extractSeriesName(release.title) || release.title)}`;
            } else {
                window.location.href = `volume.html?seriesId=${release.id}`;
            }
        });

        listContainer.appendChild(releaseItem);
    });

    renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ページネーションUIを描画
function renderPagination() {
    let container = document.getElementById('pagination');
    if (!container) {
        container = document.createElement('div');
        container.id = 'pagination';
        container.className = 'pagination';
        document.querySelector('.releases-container').after(container);
    }

    container.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn' + (currentPage <= 1 ? ' disabled' : '');
    prevBtn.disabled = currentPage <= 1;
    prevBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6l6 6"/></svg> 前へ';
    prevBtn.addEventListener('click', () => displayNewReleases(currentPage - 1));

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn' + (currentPage >= totalPages ? ' disabled' : '');
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.innerHTML = '次へ <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6l-6 6"/></svg>';
    nextBtn.addEventListener('click', () => displayNewReleases(currentPage + 1));

    const info = document.createElement('span');
    info.className = 'page-info';
    info.textContent = `${currentPage} / ${totalPages}`;

    container.appendChild(prevBtn);
    container.appendChild(info);
    container.appendChild(nextBtn);
}

// APIから新刊を取得
async function fetchNewReleases(page) {
    try {
        const response = await fetch(`/api/books?genre=001004&hits=${PAGE_SIZE}&sort=-releaseDate&page=${page}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        const adapted = adaptApiResponse(data);
        if (adapted.totalCount) {
            totalPages = Math.ceil(adapted.totalCount / PAGE_SIZE);
        }
        return adapted.items;
    } catch (err) {
        console.warn('新刊取得失敗:', err);
        return null;
    }
}

// ローカルデータから新刊情報を生成（フォールバック）
function generateLocalNewReleases() {
    const releases = bookDatabase.map(manga => {
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
    return releases;
}

// ページ読み込み時に実行
window.addEventListener('DOMContentLoaded', () => displayNewReleases(1));
