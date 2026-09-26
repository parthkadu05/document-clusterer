function createSnakeSystem(canvasEl, opts = {}) {
    const ctx = canvasEl.getContext('2d');
    let W, H;
    const SEGMENT_LENGTH = opts.segLen || 18;
    const NUM_SNAKES     = opts.count  || 6;
    const TRAIL_LENGTH   = opts.trail  || 120;
    const BASE_SPEED     = opts.speed  || 0.012;
    const colors         = opts.colors || ['#3ddc84','#2ab870','#00b4d8','#c9a84c','#5cf0a8','#80ffe8'];

    function resize() {
      W = canvasEl.width  = canvasEl.offsetWidth  || window.innerWidth;
      H = canvasEl.height = canvasEl.offsetHeight || window.innerHeight;
      // Update orbit centers on resize
      snakes && snakes.forEach(s => {
        s.cx = W / 2 + (Math.random() - 0.5) * W * 0.5;
        s.cy = H / 2 + (Math.random() - 0.5) * H * 0.4;
      });
    }

    // Each snake: orbits a center point with varying radii and tilted ellipses
    const snakes = Array.from({ length: NUM_SNAKES }, (_, i) => {
      const radiusX = 80 + Math.random() * 260;
      const radiusY = radiusX * (0.35 + Math.random() * 0.6);
      const tilt    = Math.random() * Math.PI;
      const speed   = BASE_SPEED * (0.4 + Math.random() * 1.2) * (Math.random() < 0.5 ? 1 : -1);
      return {
        cx: 0, cy: 0,     // set on first resize
        radiusX, radiusY, tilt, speed,
        angle:  Math.random() * Math.PI * 2,
        color:  colors[i % colors.length],
        width:  1.5 + Math.random() * 2.5,
        trail:  [],        // [{x,y}]
        phase:  Math.random() * Math.PI * 2,  // wobble phase
        wobble: 0.05 + Math.random() * 0.15,
      };
    });

    // Place orbit centers spread across canvas
    function initCenters() {
      const cols = Math.ceil(Math.sqrt(NUM_SNAKES));
      snakes.forEach((s, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        s.cx = W * (0.15 + col / cols * 0.7) + (Math.random() - 0.5) * W * 0.1;
        s.cy = H * (0.15 + row / cols * 0.7) + (Math.random() - 0.5) * H * 0.1;
      });
    }

    resize();
    initCenters();
    window.addEventListener('resize', () => { resize(); initCenters(); });

    let frame = 0;

    function draw() {
      // Dark fade trail — do NOT full clear; paint semi-transparent overlay
      ctx.fillStyle = opts.bgColor || 'rgba(10,15,13,0.18)';
      ctx.fillRect(0, 0, W, H);

      frame++;

      snakes.forEach(s => {
        // Advance angle
        s.angle += s.speed;
        s.phase += 0.018;

        // Ellipse position with slight wobble
        const wobbleR = 1 + Math.sin(s.phase) * s.wobble;
        const cosT = Math.cos(s.tilt), sinT = Math.sin(s.tilt);
        const localX = s.radiusX * wobbleR * Math.cos(s.angle);
        const localY = s.radiusY * wobbleR * Math.sin(s.angle);
        const x = s.cx + localX * cosT - localY * sinT;
        const y = s.cy + localX * sinT + localY * cosT;

        // Add to trail
        s.trail.push({ x, y });
        if (s.trail.length > TRAIL_LENGTH) s.trail.shift();

        // Draw trail as tapered glowing line
        if (s.trail.length < 2) return;

        for (let i = 1; i < s.trail.length; i++) {
          const t = i / s.trail.length;          // 0..1 (tail to head)
          const alpha = t * t * 0.85;
          const lineW = s.width * t;

          ctx.beginPath();
          ctx.moveTo(s.trail[i-1].x, s.trail[i-1].y);
          ctx.lineTo(s.trail[i].x,   s.trail[i].y);
          ctx.strokeStyle = hexAlpha(s.color, alpha);
          ctx.lineWidth   = lineW;
          ctx.lineCap     = 'round';
          ctx.stroke();
        }

        // Head glow
        const head = s.trail[s.trail.length - 1];
        const grad = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, s.width * 4);
        grad.addColorStop(0, hexAlpha(s.color, 0.9));
        grad.addColorStop(1, hexAlpha(s.color, 0));
        ctx.beginPath();
        ctx.arc(head.x, head.y, s.width * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Bright head dot
        ctx.beginPath();
        ctx.arc(head.x, head.y, s.width * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
      });

      requestAnimationFrame(draw);
    }

    function hexAlpha(hex, alpha) {
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    draw();
  }