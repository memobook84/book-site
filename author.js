// 著者の略歴データ（主要著者のみ）
const authorBios = {
    '尾田栄一郎': '1975年1月1日生まれ、熊本県出身。1997年に『ONE PIECE』の連載を開始。世界中で愛される国民的漫画家として、数々の記録を打ち立てている。「最も多く発行された単一作家によるコミックシリーズ」としてギネス世界記録に認定されている。',
    '吾峠呼世晴': '福岡県出身の漫画家。2016年から2020年まで『鬼滅の刃』を週刊少年ジャンプにて連載。独特の世界観と心に残る名言で、社会現象を巻き起こした。2019年には「第14回東京アニメアワード アニメ オブ ザ イヤー作品賞」を受賞。',
    '芥見下々': '岩手県出身の漫画家。2018年より『呪術廻戦』を週刊少年ジャンプにて連載中。ダークファンタジーとバトルアクションを融合させた作風で、若い世代を中心に絶大な人気を誇る。2021年にはテレビアニメ化され、大ヒットを記録。',
    '遠藤達哉': '茨城県出身の漫画家。2019年より『SPY×FAMILY』を少年ジャンプ+にて連載中。スパイ×殺し屋×超能力者という異色の家族を描いたホームコメディで、幅広い層から支持を集めている。2022年にアニメ化され、さらなる人気を博している。',
    '藤本タツキ': '秋田県出身の漫画家。2019年から2021年まで『チェンソーマン』第一部を週刊少年ジャンプにて連載。2022年より少年ジャンプ+にて第二部を連載中。斬新な発想と予測不可能な展開で、新世代のカリスマ的存在となっている。',
    '堀越耕平': '愛知県出身の漫画家。2014年より『僕のヒーローアカデミア』を週刊少年ジャンプにて連載中。王道ヒーロー漫画として国内外で絶大な人気を誇り、アニメ、映画、ゲームなど多方面でメディア展開されている。熱いバトルと感動のドラマが魅力。'
};

// URLパラメータから著者名を取得
function getAuthorNameFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('name') || '';
}

// 著者の詳細を表示（メイン処理）
async function displayAuthorDetail() {
    const authorName = decodeURIComponent(getAuthorNameFromUrl());

    if (!authorName) {
        document.getElementById('author-name').textContent = '著者が指定されていません';
        return;
    }

    // ページタイトルを更新
    document.title = `${authorName} - THE MANGA STORE`;
    document.getElementById('author-name').textContent = authorName;

    // 略歴を表示
    const bio = authorBios[authorName] || `${authorName}による人気作品を多数執筆している漫画家。独自の世界観と魅力的なキャラクター描写で、多くの読者を魅了している。`;
    document.getElementById('author-bio').textContent = bio;

    // APIから著者の作品を取得
    let works = await fetchAuthorWorks(authorName);

    // APIで取得できなかった場合、ローカルデータベースからフォールバック
    if (!works || works.length === 0) {
        const localWorks = mangaDatabase.filter(m => m.author === authorName);
        works = localWorks.map((m, i) => ({
            ...m,
            imageUrl: '',
            isbn: '',
            itemUrl: '',
            seriesName: m.label || '',
        }));
    }

    if (works.length === 0) {
        document.getElementById('author-works-count').textContent = '作品数: 0作品';
        document.getElementById('representative-works').innerHTML = '<li>作品が見つかりませんでした</li>';
        return;
    }

    document.getElementById('author-works-count').textContent = `作品数: ${works.length}作品`;

    // 代表作品リストを表示
    const representativeWorksList = document.getElementById('representative-works');
    representativeWorksList.innerHTML = '';
    works.slice(0, 3).forEach(work => {
        const li = document.createElement('li');
        li.textContent = work.title;
        representativeWorksList.appendChild(li);
    });

    // 作品一覧を表示
    displayAuthorWorks(works);
}

// APIから著者の作品を検索
async function fetchAuthorWorks(authorName) {
    try {
        const response = await fetch(`/api/search?keyword=${encodeURIComponent(authorName)}&hits=30`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        const adapted = adaptApiResponse(data);
        // 著者名でフィルタリング（API結果が著者名以外にもマッチする可能性があるため）
        return adapted.items.filter(item =>
            item.author && item.author.includes(authorName)
        );
    } catch (err) {
        console.warn('著者検索失敗:', err);
        return null;
    }
}

// 著者の作品一覧を表示
function displayAuthorWorks(works) {
    const worksGrid = document.getElementById('author-works-grid');
    worksGrid.innerHTML = '';

    works.forEach(item => {
        const workItem = document.createElement('div');
        workItem.className = 'work-item';

        const imageHtml = createImageElement(item);

        workItem.innerHTML = `
            ${imageHtml}
            <h3>${item.title}</h3>
        `;

        workItem.addEventListener('click', () => {
            if (item.isbn) {
                window.location.href = `detail.html?isbn=${item.isbn}&title=${encodeURIComponent(item.title)}`;
            } else {
                window.location.href = `detail.html?id=${item.id}`;
            }
        });

        worksGrid.appendChild(workItem);
    });
}

// ページ読み込み時に実行
window.addEventListener('DOMContentLoaded', displayAuthorDetail);
