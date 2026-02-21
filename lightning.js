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
        if (enabled) initStreams();
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
        initStreams();
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

    // --- 光の線エフェクト ---
    var streams = [];
    var STREAM_COUNT = 60;

    function createStream(randomY) {
        var x = Math.random() * canvas.width;
        var speed = 3 + Math.random() * 7;
        var lineLen = 40 + Math.random() * 120;
        var width = 1 + Math.random() * 2.5;
        var alpha = 0.15 + Math.random() * 0.5;

        return {
            x: x,
            y: randomY ? Math.random() * (canvas.height + lineLen) - lineLen : -lineLen - Math.random() * canvas.height * 0.5,
            speed: speed,
            lineLen: lineLen,
            width: width,
            alpha: alpha,
            glow: 4 + Math.random() * 8,
        };
    }

    function initStreams() {
        streams = [];
        for (var i = 0; i < STREAM_COUNT; i++) {
            streams.push(createStream(true));
        }
    }

    function animate() {
        if (!enabled) return;

        // 半透明クリアで残像
        ctx.fillStyle = 'rgba(52, 80, 162, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (var i = 0; i < streams.length; i++) {
            var s = streams[i];

            // グラデーション（先頭が明るく、末尾が透明）
            var headY = s.y;
            var tailY = s.y - s.lineLen;

            var grad = ctx.createLinearGradient(s.x, tailY, s.x, headY);
            grad.addColorStop(0, 'rgba(250, 190, 35, 0)');
            grad.addColorStop(0.5, 'rgba(250, 190, 35, ' + (s.alpha * 0.5) + ')');
            grad.addColorStop(0.85, 'rgba(250, 210, 80, ' + s.alpha + ')');
            grad.addColorStop(1, 'rgba(255, 255, 220, ' + Math.min(s.alpha * 1.3, 1) + ')');

            // グロー
            ctx.save();
            ctx.shadowColor = 'rgba(250, 190, 35, ' + (s.alpha * 0.6) + ')';
            ctx.shadowBlur = s.glow;
            ctx.beginPath();
            ctx.moveTo(s.x, tailY);
            ctx.lineTo(s.x, headY);
            ctx.strokeStyle = grad;
            ctx.lineWidth = s.width;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();

            // 先頭の明るい点
            ctx.beginPath();
            ctx.arc(s.x, headY, s.width * 1.2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 220, ' + Math.min(s.alpha * 1.5, 1) + ')';
            ctx.fill();

            // 移動
            s.y += s.speed;

            // 画面外に出たらリセット
            if (s.y - s.lineLen > canvas.height) {
                streams[i] = createStream(false);
            }
        }

        animId = requestAnimationFrame(animate);
    }

    if (enabled) {
        initStreams();
        animId = requestAnimationFrame(animate);
    }
})();
