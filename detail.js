// URLパラメータを取得
function getDetailParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        id: params.get('id') ? parseInt(params.get('id')) : null,
        isbn: params.get('isbn') || null,
        title: params.get('title') ? decodeURIComponent(params.get('title')) : null,
    };
}

// 漫画の詳細を表示（メイン処理）
async function displayMangaDetail() {
    const { id, isbn, title } = getDetailParams();

    // APIから取得を試みる
    let manga = null;

    if (isbn) {
        manga = await fetchMangaByIsbn(isbn);
    } else if (title) {
        manga = await fetchMangaByTitle(title);
    }

    // APIで取得できなかった場合、ローカルデータベースからフォールバック
    if (!manga && id !== null) {
        const localManga = mangaDatabase.find(m => m.id === id);
        if (localManga) {
            manga = {
                ...localManga,
                imageUrl: '',
                price: '',
                priceRaw: 0,
                isbn: '',
                itemUrl: '',
                seriesName: localManga.label || '',
                color: localManga.color,
            };
        }
    }

    if (!manga) {
        document.getElementById('manga-title').textContent = '漫画が見つかりません';
        return;
    }

    // ページタイトルを更新
    document.title = `${manga.title} - THE MANGA STORE`;

    // 画像を表示
    const imageContainer = document.querySelector('.detail-image');
    imageContainer.innerHTML = createDetailImageElement(manga);

    document.getElementById('manga-title').textContent = manga.title;

    // 著者名をリンクとして設定
    const authorLink = document.getElementById('manga-author');
    authorLink.textContent = manga.author;
    authorLink.href = `author.html?name=${encodeURIComponent(manga.author)}`;

    document.getElementById('manga-publisher').textContent = manga.publisher || '-';
    document.getElementById('manga-label').textContent = manga.label || manga.seriesName || '-';
    document.getElementById('manga-genre').textContent = manga.genre || '-';
    document.getElementById('manga-date').textContent = manga.firstReleaseDate || '-';
    document.getElementById('manga-description').textContent = manga.description || 'あらすじ情報がありません。';

    // フォローボタンの設定
    setupFollowButton(manga);

    // 同シリーズの巻一覧を取得・表示
    if (manga.seriesName || manga.title) {
        await displayVolumesFromApi(manga);
    } else if (manga.totalVolumes) {
        displayVolumesLocal(manga);
    }
}

// ISBNでAPIから漫画を取得
async function fetchMangaByIsbn(isbn) {
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

// タイトルでAPIから漫画を取得
async function fetchMangaByTitle(title) {
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

// APIから同シリーズの巻を取得して表示
async function displayVolumesFromApi(manga) {
    const volumesGrid = document.getElementById('volumes-grid');
    volumesGrid.innerHTML = '<p style="text-align:center;grid-column:1/-1;padding:20px;color:var(--color-text-sub);">巻一覧を読み込み中...</p>';

    try {
        const searchTerm = manga.seriesName || manga.title;
        const response = await fetch(`/api/books?keyword=${encodeURIComponent(searchTerm)}&hits=30&sort=standard`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        const adapted = adaptApiResponse(data);

        if (adapted.items.length === 0) {
            volumesGrid.innerHTML = '<p style="text-align:center;grid-column:1/-1;padding:20px;color:var(--color-text-sub);">巻情報が見つかりませんでした</p>';
            return;
        }

        volumesGrid.innerHTML = '';
        adapted.items.forEach((vol, i) => {
            const volumeItem = document.createElement('div');
            volumeItem.className = 'volume-item';

            const imageHtml = createImageElement(vol, 280);

            volumeItem.innerHTML = `
                ${imageHtml}
                <div class="volume-info">
                    <div class="volume-number">${vol.title}</div>
                    <div class="volume-date">${vol.firstReleaseDate || ''}</div>
                </div>
            `;

            volumeItem.addEventListener('click', () => {
                if (vol.isbn) {
                    window.location.href = `volume.html?isbn=${vol.isbn}&title=${encodeURIComponent(vol.title)}`;
                }
            });

            volumesGrid.appendChild(volumeItem);
        });
    } catch (err) {
        console.warn('巻一覧取得失敗:', err);
        if (manga.totalVolumes) {
            displayVolumesLocal(manga);
        } else {
            volumesGrid.innerHTML = '<p style="text-align:center;grid-column:1/-1;padding:20px;color:var(--color-text-sub);">巻情報を取得できませんでした</p>';
        }
    }
}

// ローカルデータで巻一覧を表示（フォールバック）
function displayVolumesLocal(manga) {
    const volumesGrid = document.getElementById('volumes-grid');
    volumesGrid.innerHTML = '';

    const totalVolumes = manga.totalVolumes || 1;
    const dateMatch = (manga.firstReleaseDate || '').match(/(\d+)年(\d+)月/);
    let startYear = dateMatch ? parseInt(dateMatch[1]) : 2020;
    let startMonth = dateMatch ? parseInt(dateMatch[2]) : 1;

    for (let i = 1; i <= totalVolumes; i++) {
        const volumeItem = document.createElement('div');
        volumeItem.className = 'volume-item';

        const monthsElapsed = (i - 1) * 3;
        const year = startYear + Math.floor((startMonth - 1 + monthsElapsed) / 12);
        const month = ((startMonth - 1 + monthsElapsed) % 12) + 1;

        volumeItem.innerHTML = `
            <div class="manga-placeholder" style="background-color: ${manga.color || '#666'}; height: 280px;">
                <span class="manga-placeholder-text">${manga.title} ${i}巻</span>
            </div>
            <div class="volume-info">
                <div class="volume-number">${i}巻</div>
                <div class="volume-date">${year}/${String(month).padStart(2, '0')}</div>
            </div>
        `;

        volumeItem.addEventListener('click', () => {
            window.location.href = `volume.html?seriesId=${manga.id}&volumeNum=${i}`;
        });

        volumesGrid.appendChild(volumeItem);
    }
}

// フォロー機能
function setupFollowButton(manga) {
    const followButton = document.getElementById('follow-button');
    const followedManga = getFollowedManga();

    const followId = manga.isbn || manga.id;
    const isFollowed = followedManga.some(m => (m.isbn && m.isbn === manga.isbn) || m.id === manga.id);
    if (isFollowed) {
        followButton.classList.add('followed');
    }

    followButton.addEventListener('click', () => {
        toggleFollow(manga, followButton);
    });
}

function toggleFollow(manga, button) {
    let followedManga = getFollowedManga();
    const index = followedManga.findIndex(m => (m.isbn && m.isbn === manga.isbn) || m.id === manga.id);

    if (index > -1) {
        followedManga.splice(index, 1);
        button.classList.remove('followed');
    } else {
        followedManga.push({
            id: manga.id || manga.isbn,
            isbn: manga.isbn || '',
            title: manga.title,
            author: manga.author,
            imageUrl: manga.imageUrl || '',
            color: manga.color || '#666',
        });
        button.classList.add('followed');
    }

    localStorage.setItem('followedManga', JSON.stringify(followedManga));
}

function getFollowedManga() {
    const stored = localStorage.getItem('followedManga');
    return stored ? JSON.parse(stored) : [];
}

// ページ読み込み時に実行
window.addEventListener('DOMContentLoaded', displayMangaDetail);
