function getFollowedBooks() {
    const stored = localStorage.getItem('followedBooks');
    return stored ? JSON.parse(stored) : [];
}

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

    grid.style.display = '';
    emptyMessage.style.display = 'none';
    grid.innerHTML = '';

    followedBooks.forEach(book => {
        const seriesTitle = book.displayTitle || book.title || '';
        const el = document.createElement('div');
        el.className = 'book-item';
        el.style.cursor = 'pointer';

        let imageHtml;
        if (book.imageUrl) {
            imageHtml = `<img src="${book.imageUrl}" alt="${seriesTitle}" loading="lazy"
                          onerror="this.style.display='none'">`;
        } else {
            const color = book.color || '#888';
            imageHtml = `<div class="book-cover-placeholder" style="background:${color};aspect-ratio:2/3;display:flex;align-items:center;justify-content:center;padding:8px;">
                <span style="color:#fff;font-size:12px;text-align:center;word-break:break-all;">${seriesTitle}</span>
            </div>`;
        }

        el.innerHTML = `${imageHtml}<h3>${seriesTitle}</h3>`;

        el.addEventListener('click', () => {
            const params = new URLSearchParams();
            params.set('title', seriesTitle);
            window.location.href = `detail.html?${params.toString()}`;
        });

        grid.appendChild(el);
    });
}

window.addEventListener('DOMContentLoaded', displayFollowedBooks);
