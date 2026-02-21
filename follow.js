// フォローした作品を取得
function getFollowedBooks() {
    const stored = localStorage.getItem('followedBooks');
    return stored ? JSON.parse(stored) : [];
}

// フォローした作品を表示
function displayFollowedBooks() {
    const followedBooks = getFollowedBooks();
    const grid = document.getElementById('followed-book-grid');
    const emptyMessage = document.getElementById('empty-message');
    const followCount = document.getElementById('follow-count');

    followCount.textContent = `${followedBooks.length}作品`;

    if (followedBooks.length === 0) {
        grid.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }

    grid.style.display = 'grid';
    emptyMessage.style.display = 'none';
    grid.innerHTML = '';

    followedBooks.forEach(book => {
        const bookItem = document.createElement('div');
        bookItem.className = 'followed-book-item';

        // 実画像またはプレースホルダー
        let imageHtml;
        if (book.imageUrl) {
            imageHtml = `<img src="${book.imageUrl}" alt="${book.title}"
                          style="width:100%;height:320px;object-fit:contain;background:#f5f3f0;"
                          onerror="this.parentElement.innerHTML='<div class=\\'book-placeholder\\' style=\\'background-color:${book.color || '#666'};height:280px;\\'><span class=\\'book-placeholder-text\\'>${book.title}</span></div>'"
                          loading="lazy">`;
        } else {
            imageHtml = `<div class="book-placeholder" style="background-color: ${book.color || '#666'}; height: 280px;">
                <span class="book-placeholder-text">${book.title}</span>
            </div>`;
        }

        bookItem.innerHTML = `
            <button class="unfollow-button" data-id="${book.id}" aria-label="フォロー解除">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </button>
            ${imageHtml}
            <div class="book-info">
                <h3>${book.title}</h3>
                <p class="author">${book.author}</p>
            </div>
        `;

        bookItem.addEventListener('click', (e) => {
            if (!e.target.closest('.unfollow-button')) {
                if (book.isbn) {
                    window.location.href = `detail.html?isbn=${book.isbn}&title=${encodeURIComponent(book.title)}`;
                } else {
                    window.location.href = `detail.html?id=${book.id}`;
                }
            }
        });

        const unfollowButton = bookItem.querySelector('.unfollow-button');
        unfollowButton.addEventListener('click', (e) => {
            e.stopPropagation();
            unfollowBook(book.id, book.isbn);
        });

        grid.appendChild(bookItem);
    });
}

// フォローを解除
function unfollowBook(bookId, isbn) {
    let followedBooks = getFollowedBooks();
    followedBooks = followedBooks.filter(m => {
        if (isbn && m.isbn) return m.isbn !== isbn;
        return m.id !== bookId;
    });
    localStorage.setItem('followedBooks', JSON.stringify(followedBooks));
    displayFollowedBooks();
}

// ページ読み込み時に実行
window.addEventListener('DOMContentLoaded', displayFollowedBooks);
