// 著者の略歴データ（フォールバック用）
const authorBiosFallback = {
    '村上春樹': '1949年1月12日生まれ、京都府出身。1979年に『風の歌を聴け』でデビュー。『ノルウェイの森』『1Q84』など世界的ベストセラーを多数執筆。ノーベル文学賞候補として毎年注目される、日本を代表する小説家。',
    '東野圭吾': '1958年2月4日生まれ、大阪府出身。1985年に『放課後』で江戸川乱歩賞を受賞しデビュー。『容疑者Xの献身』で直木賞受賞。ミステリー小説の第一人者として圧倒的な人気を誇る。',
    '湊かなえ': '1973年1月19日生まれ、広島県出身。2008年に『告白』でデビューし本屋大賞を受賞。「イヤミス（読後に嫌な気持ちになるミステリー）の女王」と称される。',
    '宮部みゆき': '1960年12月23日生まれ、東京都出身。『火車』『模倣犯』『ソロモンの偽証』など、ミステリーから時代小説まで幅広いジャンルで活躍する国民的作家。',
    '伊坂幸太郎': '1971年5月25日生まれ、千葉県出身。『重力ピエロ』『ゴールデンスランバー』など、独特のユーモアと伏線回収で知られる人気作家。',
    '恩田陸': '1964年10月25日生まれ、宮城県出身。『蜜蜂と遠雷』で直木賞と本屋大賞をダブル受賞。ファンタジーからミステリーまで多彩な作風で魅了する。'
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
    document.title = `${authorName} - THE BOOK STORE`;
    document.getElementById('author-name').textContent = authorName;

    // Wikipedia APIから著者情報を取得
    const cleanName = authorName.replace(/[\s\u3000]+/g, '');
    let bio = authorBiosFallback[authorName] || authorBiosFallback[cleanName] || '';
    let wikipediaUrl = '';
    try {
        const wikiResp = await fetch(`/api/author?name=${encodeURIComponent(authorName)}`);
        if (wikiResp.ok) {
            const wikiData = await wikiResp.json();
            if (wikiData.extract) {
                bio = wikiData.extract;
            }
            if (wikiData.description) {
                document.getElementById('author-name').textContent = `${authorName}`;
                const descEl = document.getElementById('author-description');
                if (descEl) descEl.textContent = wikiData.description;
            }
            wikipediaUrl = wikiData.wikipediaUrl || '';
        }
    } catch (err) {
        console.warn('Wikipedia情報取得失敗:', err);
    }

    if (!bio) {
        bio = `${cleanName}による作品。`;
    }

    const bioEl = document.getElementById('author-bio');
    bioEl.innerHTML = '';

    // Wikipediaのextractをセクション分けして整形表示
    const sections = bio.split(/\n+/);
    sections.forEach(section => {
        const trimmed = section.trim();
        if (!trimmed) return;
        // セクション見出し（== xxx ==）を検出
        const headingMatch = trimmed.match(/^=+\s*(.+?)\s*=+$/);
        if (headingMatch) {
            const h = document.createElement('strong');
            h.textContent = headingMatch[1];
            h.style.cssText = 'display:block;margin-top:16px;margin-bottom:6px;font-size:15px;';
            bioEl.appendChild(h);
        } else {
            const p = document.createElement('p');
            p.textContent = trimmed;
            p.style.cssText = 'margin:0 0 8px 0;';
            bioEl.appendChild(p);
        }
    });

    if (wikipediaUrl) {
        const wikiLink = document.createElement('a');
        wikiLink.href = wikipediaUrl;
        wikiLink.target = '_blank';
        wikiLink.rel = 'noopener noreferrer';
        wikiLink.textContent = 'Wikipedia で詳しく見る →';
        wikiLink.style.cssText = 'display:inline-block;margin-top:12px;color:var(--color-link);font-size:13px;text-decoration:none;border-bottom:1px solid var(--color-link);';
        bioEl.appendChild(wikiLink);
    }

    // APIから著者の作品を取得
    let works = await fetchAuthorWorks(authorName);

    // APIで取得できなかった場合、ローカルデータベースからフォールバック
    if (!works || works.length === 0) {
        const localWorks = bookDatabase.filter(m => m.author === authorName);
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
