(async function () {
    const container = document.getElementById('scatter-container');
    const BOOK_COUNT = 60;
    const CACHE_KEY = 'scatter-layout';

    const vw = Math.min(Math.max(window.innerWidth, 1200), 1400);
    const cols = 10;
    const rows = Math.ceil(BOOK_COUNT / cols);
    const cellW = vw / cols;
    const cellH = 180;
    const totalH = rows * cellH + 200;
    container.style.height = totalH + 'px';

    const rand = (min, max) => Math.random() * (max - min) + min;

    // キャッシュされたレイアウトがあれば使う
    let layout = null;
    try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) layout = JSON.parse(cached);
    } catch (e) {}

    if (!layout) {
        // 初回：ランダム生成
        let books = [];
        try {
            const resp = await fetch('/data/book-all.json');
            const all = await resp.json();
            const withCover = all.filter(b =>
                b.coverCandidates && b.coverCandidates.some(c => c.hasRealCover)
            );
            for (let i = withCover.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [withCover[i], withCover[j]] = [withCover[j], withCover[i]];
            }
            books = withCover.slice(0, BOOK_COUNT);
        } catch (e) {
            console.error('データ読み込み失敗:', e);
            return;
        }

        layout = books.map((book, i) => {
            const candidates = book.coverCandidates.filter(c => c.hasRealCover);
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            const w = Math.round(rand(90, 140));
            const h = Math.round(w * 1.45);
            const col = i % cols;
            const row = Math.floor(i / cols);
            const baseX = col * cellW - cellW * 0.1;
            const baseY = row * cellH + 40;
            const x = Math.round(baseX + rand(0, cellW * 0.9));
            const y = Math.round(baseY + rand(0, cellH * 0.7));
            const rotate = rand(-20, 20).toFixed(1);
            const zIndex = Math.floor(rand(1, 50));
            return {
                imageUrl: pick.imageUrl,
                isbn: pick.isbn || '',
                title: book.displayTitle || book.title,
                w, h, x, y, rotate, zIndex
            };
        });

        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(layout));
        } catch (e) {}
    }

    layout.forEach((item, i) => {
        const { imageUrl, isbn, title, w, h, x, y, rotate, zIndex } = item;

        const el = document.createElement('div');
        el.className = 'scatter-book';
        el.style.cssText = `
            left: ${x}px;
            top: ${y}px;
            width: ${w}px;
            height: ${h}px;
            transform: rotate(${rotate}deg);
            z-index: ${zIndex};
        `;

        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = title;
        img.width = w;
        img.height = h;
        img.style.objectFit = 'cover';
        img.onerror = function () {
            const color = generateColor(title, i);
            el.innerHTML = `<div class="placeholder" style="width:${w}px;height:${h}px;background:${color};">
                <span>${title}</span>
            </div>`;
        };
        el.appendChild(img);

        el.addEventListener('click', () => {
            const params = new URLSearchParams();
            if (isbn) params.set('isbn', isbn);
            params.set('title', title);
            params.set('series', title);
            window.location.href = `volume.html?${params.toString()}`;
        });

        el.addEventListener('mouseenter', () => {
            el.style.transform = `rotate(${rotate}deg) translateY(-6px) scale(1.05)`;
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = `rotate(${rotate}deg) translateY(0px) scale(1)`;
        });

        container.appendChild(el);
    });

    function generateColor(title, index) {
        const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#FFA07A','#F06292','#66BB6A',
                        '#FFA726','#8D6E63','#7E57C2','#29B6F6','#26A69A','#D4AF37'];
        let hash = 0;
        for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash + index) % colors.length];
    }
})();
