(function () {
    // ヘッダーfixed化によるbody padding調整
    function adjustBodyPadding() {
        var h = document.querySelector('header');
        if (h) document.body.style.paddingTop = h.offsetHeight + 'px';
    }
    adjustBodyPadding();
    window.addEventListener('resize', adjustBodyPadding);

    // 現在ページのナビリンクにactiveクラスを付与
    var path = location.pathname.replace(/\/$/, '') || '/home.html';
    document.querySelectorAll('.nav-link').forEach(function (a) {
        var href = a.getAttribute('href') || '';
        var page = href.replace(/^\//, '').replace('.html', '');
        if (page && path.includes(page)) {
            a.classList.add('active');
        }
    });

    if (window.innerWidth <= 1024) return;

    // ポップアップ注入
    var popup = document.createElement('div');
    popup.id = 'header-search-popup';
    popup.innerHTML =
        '<div class="hsp-bar">' +
            '<div class="hsp-input-wrap">' +
                '<input type="search" id="hsp-input" placeholder="Search..." autocomplete="off" spellcheck="false">' +
            '</div>' +
            '<button class="hsp-submit" type="button" aria-label="検索">' +
                '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>' +
            '</button>' +
        '</div>';
    document.body.appendChild(popup);

    // ヘッダー高さに合わせてtopを設定
    function setTop() {
        var header = document.querySelector('header');
        var h = header ? header.getBoundingClientRect().bottom : 54;
        popup.style.top = (h + 10) + 'px';
    }
    setTop();
    window.addEventListener('resize', setTop);

    var input = document.getElementById('hsp-input');
    var submitBtn = popup.querySelector('.hsp-submit');

    function openPopup() {
        setTop();
        popup.classList.add('open');
        setTimeout(function () { input.focus(); }, 30);
    }

    function closePopup() {
        popup.classList.remove('open');
        input.value = '';
    }

    function doSearch() {
        var q = input.value.trim();
        if (q) window.location.href = '/search.html?q=' + encodeURIComponent(q);
    }

    // ヘッダーアイコンにバインド
    var btn = document.querySelector('.search-box .search-icon');
    if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); openPopup(); });

    submitBtn.addEventListener('click', doSearch);

    // 外側クリックで閉じる
    document.addEventListener('click', function (e) {
        if (popup.classList.contains('open') && !popup.contains(e.target)) {
            closePopup();
        }
    });
    popup.addEventListener('click', function (e) { e.stopPropagation(); });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doSearch();
        if (e.key === 'Escape') closePopup();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && popup.classList.contains('open')) closePopup();
    });
})();
