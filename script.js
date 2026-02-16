// 現在のページ状態
let currentPage = 1;
let totalPages = 1;
let isLoading = false;
let currentKeyword = '';

// スケルトンUI表示
function showSkeleton(count = 30) {
    const gridContainer = document.querySelector('.manga-grid');
    gridContainer.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'manga-item skeleton';
        skeleton.innerHTML = `
            <div class="skeleton-image"></div>
            <div class="skeleton-title"></div>
            <div class="skeleton-author"></div>
        `;
        gridContainer.appendChild(skeleton);
    }
}

// 漫画データを表示する関数（API or フォールバック共通）
function displayMangaItems(items) {
    const gridContainer = document.querySelector('.manga-grid');
    gridContainer.innerHTML = '';

    if (!items || items.length === 0) {
        gridContainer.innerHTML = '<p style="text-align:center;grid-column:1/-1;padding:40px;color:var(--color-text-sub);">作品が見つかりませんでした</p>';
        return;
    }

    items.forEach(item => {
        const mangaItem = document.createElement('div');
        mangaItem.className = 'manga-item';

        const imageHtml = createImageElement(item);

        mangaItem.innerHTML = `
            ${imageHtml}
            <h3>${item.title}</h3>
            <p class="author">${item.author}</p>
        `;

        mangaItem.addEventListener('click', () => {
            if (item.isbn) {
                window.location.href = `detail.html?isbn=${item.isbn}&title=${encodeURIComponent(item.title)}`;
            } else {
                window.location.href = `detail.html?id=${item.id}`;
            }
        });

        gridContainer.appendChild(mangaItem);
    });
}

// APIからデータを取得
async function fetchFromApi(page = 1, keyword = '') {
    isLoading = true;
    showSkeleton();

    try {
        let url;
        if (keyword) {
            url = `/api/search?keyword=${encodeURIComponent(keyword)}&page=${page}&hits=30`;
        } else {
            url = `/api/books?genre=001001&hits=30&page=${page}&sort=sales`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        const adapted = adaptApiResponse(data);

        totalPages = adapted.pageCount;
        currentPage = adapted.page;

        displayMangaItems(adapted.items);
        updatePagination();
    } catch (err) {
        console.warn('API取得失敗、フォールバックデータを使用:', err);
        fallbackDisplay(keyword);
    } finally {
        isLoading = false;
    }
}

// フォールバック表示（manga-data.jsから）
function fallbackDisplay(keyword = '') {
    let items = mangaDatabase;
    if (keyword) {
        items = mangaDatabase.filter(m =>
            m.title.toLowerCase().includes(keyword.toLowerCase()) ||
            m.author.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    // manga-data.jsのデータをadapted形式に合わせる
    const adapted = items.map((m, i) => ({
        ...m,
        imageUrl: '',
        price: '',
        priceRaw: 0,
        isbn: '',
        itemUrl: '',
        seriesName: m.label || '',
    }));

    totalPages = 1;
    currentPage = 1;
    displayMangaItems(adapted);
    updatePagination();
}

// ページネーション更新
function updatePagination() {
    const container = document.getElementById('pagination');
    if (!container) return;

    if (totalPages <= 1) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = '';

    // 前へボタン
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '← 前へ';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchFromApi(currentPage, currentKeyword);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    container.appendChild(prevBtn);

    // ページ番号
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
    container.appendChild(pageInfo);

    // 次へボタン
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = '次へ →';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchFromApi(currentPage, currentKeyword);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    container.appendChild(nextBtn);
}

// 検索機能
function setupSearch() {
    const searchInput = document.querySelector('.search-box input');
    const searchButton = document.querySelector('.search-box button');

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

function performSearch() {
    const searchInput = document.querySelector('.search-box input');
    const keyword = searchInput.value.trim();
    currentKeyword = keyword;
    currentPage = 1;

    if (!keyword) {
        fetchFromApi(1);
        return;
    }

    fetchFromApi(1, keyword);
}

// ページ読み込み時に実行
window.addEventListener('DOMContentLoaded', () => {
    console.log('ページ読み込み開始');
    setupSearch();
    fetchFromApi(1);
});
