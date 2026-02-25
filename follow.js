// フォローした作品を取得
function getFollowedBooks() {
    const stored = localStorage.getItem('followedBooks');
    return stored ? JSON.parse(stored) : [];
}

// 1段あたりの冊数を画面幅から決定
function getBooksPerShelf() {
    if (window.innerWidth <= 768) return 3;
    if (window.innerWidth <= 1200) return 4;
    return 5;
}

// フォローした作品を表示
function displayFollowedBooks() {
    const followedBooks = getFollowedBooks();
    const grid = document.getElementById('followed-book-grid');
    const emptyMessage = document.getElementById('empty-message');
    const followCount = document.getElementById('follow-count');

    if (followCount) followCount.textContent = `${followedBooks.length}作品`;

    if (followedBooks.length === 0) {
        grid.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }

    grid.style.display = 'block';
    emptyMessage.style.display = 'none';
    grid.innerHTML = '';

    const perShelf = getBooksPerShelf();

    // 棚段ごとにグループ化
    for (let i = 0; i < followedBooks.length; i += perShelf) {
        const shelfBooks = followedBooks.slice(i, i + perShelf);

        const shelf = document.createElement('div');
        shelf.className = 'glass-shelf';

        const shelfInner = document.createElement('div');
        shelfInner.className = 'shelf-books';

        shelfBooks.forEach(book => {
            const bookItem = document.createElement('div');
            bookItem.className = 'followed-book-item';

            let imageHtml;
            if (book.imageUrl) {
                imageHtml = `<img src="${book.imageUrl}" alt="${book.title}"
                              onerror="this.parentElement.innerHTML='<div class=\\'book-placeholder\\' style=\\'background-color:${book.color || '#666'};height:220px;\\'><span class=\\'book-placeholder-text\\'>${book.title}</span></div>'"
                              loading="lazy">`;
            } else {
                imageHtml = `<div class="book-placeholder" style="background-color: ${book.color || '#666'}; height: 220px;">
                    <span class="book-placeholder-text">${book.title}</span>
                </div>`;
            }

            bookItem.innerHTML = `
                ${imageHtml}
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p class="author">${book.author}</p>
                </div>
            `;

            bookItem.addEventListener('click', () => {
                if (book.isbn) {
                    window.location.href = `detail.html?isbn=${book.isbn}&title=${encodeURIComponent(book.title)}`;
                } else {
                    window.location.href = `detail.html?id=${book.id}`;
                }
            });

            shelfInner.appendChild(bookItem);
        });

        shelf.appendChild(shelfInner);
        // ガラス棚板
        const shelfPlate = document.createElement('div');
        shelfPlate.className = 'shelf-plate';
        shelf.appendChild(shelfPlate);

        grid.appendChild(shelf);
    }
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
