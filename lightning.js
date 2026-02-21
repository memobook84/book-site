(function () {
    var canvas = document.getElementById('lightningCanvas');
    var toggle = document.getElementById('lightningToggle');
    if (!canvas || !toggle) return;
    var ctx = canvas.getContext('2d');

    var enabled = localStorage.getItem('lightning') === 'on';
    var animId = null;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (enabled) initColumns();
    }
    resize();
    window.addEventListener('resize', resize);

    function updateUI() {
        if (enabled) {
            toggle.classList.add('active');
            canvas.style.display = '';
        } else {
            toggle.classList.remove('active');
            canvas.style.display = 'none';
        }
    }
    updateUI();

    var tapTimes = [];

    function turnOn() {
        enabled = true;
        localStorage.setItem('lightning', 'on');
        updateUI();
        initColumns();
        animId = requestAnimationFrame(animate);
    }

    function turnOff() {
        enabled = false;
        localStorage.setItem('lightning', 'off');
        updateUI();
        if (animId) cancelAnimationFrame(animId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    toggle.addEventListener('click', function () {
        if (enabled) {
            turnOff();
            tapTimes = [];
        } else {
            var now = Date.now();
            tapTimes.push(now);
            tapTimes = tapTimes.filter(function (t) { return now - t < 2000; });
            if (tapTimes.length >= 5) {
                turnOn();
                tapTimes = [];
            }
        }
    });

    // --- マトリックス雨 ---
    var FONT_SIZE = 16;
    var columns = [];
    var chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ本書読物語文学小説作著編集店棚架頁章節巻冊';

    function initColumns() {
        var colCount = Math.ceil(canvas.width / FONT_SIZE);
        columns = [];
        for (var i = 0; i < colCount; i++) {
            columns.push({
                x: i * FONT_SIZE,
                drops: [],
            });
            // 各カラムに1〜3本のストリームを配置
            var streamCount = 1 + Math.floor(Math.random() * 2);
            for (var s = 0; s < streamCount; s++) {
                columns[i].drops.push({
                    y: Math.random() * canvas.height * -1,
                    speed: 2 + Math.random() * 6,
                    length: 8 + Math.floor(Math.random() * 20),
                    chars: [],
                    changeTimer: 0,
                });
                // 文字列を事前生成
                var drop = columns[i].drops[columns[i].drops.length - 1];
                for (var c = 0; c < drop.length; c++) {
                    drop.chars.push(chars[Math.floor(Math.random() * chars.length)]);
                }
            }
        }
    }

    var lastTime = 0;
    var frameInterval = 50; // 約20fps（マトリックスっぽい速度）

    // 除外エリアなし（全画面にエフェクト）
    function getExcludeZone() {
        return null;
    }

    function animate(time) {
        if (!enabled) return;

        if (time - lastTime < frameInterval) {
            animId = requestAnimationFrame(animate);
            return;
        }
        lastTime = time;

        var zone = getExcludeZone();

        // 背景を半透明で塗り残像
        ctx.fillStyle = 'rgba(52, 80, 162, 0.12)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 除外エリアをクリア（残像も消す）
        if (zone) {
            ctx.clearRect(zone.left, zone.top, zone.right - zone.left, zone.bottom - zone.top);
        }

        ctx.font = FONT_SIZE + 'px monospace';

        for (var i = 0; i < columns.length; i++) {
            var col = columns[i];
            for (var d = 0; d < col.drops.length; d++) {
                var drop = col.drops[d];

                // 文字をランダムに変化
                drop.changeTimer++;
                if (drop.changeTimer > 2) {
                    var idx = Math.floor(Math.random() * drop.length);
                    drop.chars[idx] = chars[Math.floor(Math.random() * chars.length)];
                    drop.changeTimer = 0;
                }

                // 各文字を描画
                for (var c = 0; c < drop.length; c++) {
                    var charY = drop.y - c * FONT_SIZE;
                    if (charY < -FONT_SIZE || charY > canvas.height + FONT_SIZE) continue;

                    // ロゴ・タイトル周辺はスキップ
                    if (zone && col.x + FONT_SIZE > zone.left && col.x < zone.right && charY > zone.top && charY < zone.bottom) continue;

                    var progress = c / drop.length;

                    if (c === 0) {
                        // 先頭文字は白く明るい
                        ctx.fillStyle = 'rgba(255, 255, 240, 0.95)';
                    } else if (c <= 2) {
                        // 先頭付近は明るい黄色
                        ctx.fillStyle = 'rgba(250, 190, 35, ' + (0.9 - progress * 0.3) + ')';
                    } else {
                        // 後方は暗くなる
                        var alpha = (1 - progress) * 0.7;
                        // 黄色からオレンジへグラデーション
                        var r = 250;
                        var g = Math.floor(190 - progress * 80);
                        var b = 35;
                        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
                    }

                    ctx.fillText(drop.chars[c], col.x, charY);
                }

                // 先頭のグロー
                if (drop.y > 0 && drop.y < canvas.height) {
                    ctx.beginPath();
                    ctx.arc(col.x + FONT_SIZE / 2, drop.y, FONT_SIZE, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(250, 190, 35, 0.08)';
                    ctx.fill();
                }

                // 移動
                drop.y += drop.speed;

                // 画面下に出たらリセット
                if (drop.y - drop.length * FONT_SIZE > canvas.height) {
                    drop.y = Math.random() * canvas.height * -0.5 - 50;
                    drop.speed = 2 + Math.random() * 6;
                    drop.length = 8 + Math.floor(Math.random() * 20);
                    drop.chars = [];
                    for (var nc = 0; nc < drop.length; nc++) {
                        drop.chars.push(chars[Math.floor(Math.random() * chars.length)]);
                    }
                }
            }
        }

        animId = requestAnimationFrame(animate);
    }

    if (enabled) {
        initColumns();
        animId = requestAnimationFrame(animate);
    }
})();
