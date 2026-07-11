// share.js — COMBO-001 分享功能（复制文案 + canvas 分享图）
// 规范依据：combo-001-实施规范.md §7
// 纯函数 + canvas，不调用外部图片服务，不接平台 SDK。

// ────────────────────────────────────────────────────────────
// §7 复制文案 —— 模板，双语各一套
// 模板：「我的 AI 订阅最优解：Claude Pro + Cursor Pro = $40/月，要完全满足需求还差 $20 → build-100.com/001」
// ────────────────────────────────────────────────────────────
export function buildShareText(res, answers, lang) {
  const L = (zh, en) => (lang === "en" ? en : zh);
  const primaryNames = res.primary.combo.items.map((p) => p.name).join(" + ");
  const primaryPrice = res.primary.price;
  const URL = "build-100.com/001";

  if (res.merged) {
    // 合并情形：预算已够
    return L(
      `我的 AI 订阅最优解：${primaryNames} = $${primaryPrice}/月，预算刚好够用 → ${URL}`,
      `My optimal AI sub combo: ${primaryNames} = $${primaryPrice}/mo, budget fully covers it → ${URL}`
    );
  }
  if (res.satisfy) {
    const delta = res.satisfy.delta;
    if (delta > 0) {
      return L(
        `我的 AI 订阅最优解：预算内 ${primaryNames} = $${primaryPrice}/月，要完全满足需求还差 $${delta} → ${URL}`,
        `My optimal AI sub combo: ${primaryNames} = $${primaryPrice}/mo within budget, but +$${delta}/mo to truly meet my needs → ${URL}`
      );
    } else {
      const save = -delta;
      return L(
        `我的 AI 订阅最优解：${primaryNames} = $${primaryPrice}/月，满足需求还能省 $${save} → ${URL}`,
        `My optimal AI sub combo: ${primaryNames} = $${primaryPrice}/mo fully meets my needs, $${save} under budget → ${URL}`
      );
    }
  }
  // 不可完全满足
  return L(
    `我的 AI 订阅最优解：${primaryNames} = $${primaryPrice}/月，最接近但仍不够（市面无组合能完全满足）→ ${URL}`,
    `My optimal AI sub combo: ${primaryNames} = $${primaryPrice}/mo is the closest, but nothing on the market fully meets these needs → ${URL}`
  );
}

// ────────────────────────────────────────────────────────────
// §7 分享图 —— canvas 绘制深色卡片
// 内容：组合名 + 总价 + delta + 网址 + COMBO-001 标识
// 不调用外部图片服务；生成 PNG 供长按/右键保存
// ────────────────────────────────────────────────────────────
export function renderShareCanvas(canvas, res, answers, lang) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const L = (zh, en) => (lang === "en" ? en : zh);

  // 背景渐变（深色 + 一抹紫，呼应页面）
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0b0d10");
  g.addColorStop(1, "#060709");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 网格点底纹（呼应主站）
  ctx.fillStyle = "rgba(237,239,241,0.05)";
  for (let x = 0; x < W; x += 36) for (let y = 0; y < H; y += 36) ctx.fillRect(x, y, 1, 1);

  // 顶部标识
  ctx.fillStyle = "#b794f6";
  ctx.font = "600 14px ui-monospace, Menlo, monospace";
  ctx.textBaseline = "top";
  ctx.fillText("● COMBO-001", 48, 44);

  ctx.fillStyle = "#7d848c";
  ctx.font = "12px ui-monospace, Menlo, monospace";
  const tagline = L("AI 订阅最优搭配器", "AI SUBSCRIPTION OPTIMIZER");
  ctx.textAlign = "right";
  ctx.fillText(tagline, W - 48, 46);
  ctx.textAlign = "left";

  // 组合产品名（主信息）
  const names = res.primary.combo.items.map((p) => p.name).join("  +  ");
  ctx.fillStyle = "#edeff1";
  ctx.font = "600 30px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  wrapText(ctx, names, 48, 110, W - 96, 38);

  // 总价（大号 mono）——先在 64px 字体下量宽，再切小字体画 /mo，避免叠字
  ctx.fillStyle = "#edeff1";
  ctx.font = "500 64px ui-monospace, Menlo, monospace";
  const priceStr = `$${res.primary.price}`;
  const priceW = ctx.measureText(priceStr).width;
  ctx.fillText(priceStr, 48, 175);
  ctx.fillStyle = "#4a5057";
  ctx.font = "400 20px ui-monospace, Menlo, monospace";
  ctx.fillText("/mo", 48 + priceW + 8, 210);

  // delta / 状态横条（视觉锚点）
  const bannerY = 270;
  ctx.fillStyle = "rgba(237,239,241,0.06)";
  roundRect(ctx, 48, bannerY, W - 96, 76, 8); ctx.fill();

  let deltaLabel, deltaSub, deltaColor;
  if (res.merged) {
    deltaLabel = L("预算已够用", "BUDGET IS ENOUGH");
    deltaSub = L("$" + res.primary.price + "/月即可完全满足", "$" + res.primary.price + "/mo fully covers your needs");
    deltaColor = "#4ade80";
  } else if (res.satisfy) {
    const delta = res.satisfy.delta;
    if (delta > 0) {
      deltaLabel = L("再加 $" + delta + "/月", "+ $" + delta + "/MO MORE");
      deltaSub = L("即可真正满足需求", "to truly meet your needs");
    } else {
      deltaLabel = L("省 $" + (-delta) + "/月", "$" + (-delta) + "/MO LESS");
      deltaSub = L("满足需求还有富余", "to be fully covered");
    }
    deltaColor = delta > 0 ? "#fbbf24" : "#4ade80";
  } else {
    deltaLabel = L("无法完全满足", "CAN'T BE FULLY MET");
    deltaSub = L("市面无组合能覆盖", "nothing on the market covers this");
    deltaColor = "#7d848c";
  }
  ctx.fillStyle = deltaColor;
  ctx.font = "600 24px ui-monospace, Menlo, monospace";
  ctx.fillText(deltaLabel, 72, bannerY + 18);
  ctx.fillStyle = "#7d848c";
  ctx.font = "400 14px 'Helvetica Neue', sans-serif";
  ctx.fillText(deltaSub, 72, bannerY + 48);

  // 底部：预算 · 网址 + 作者 X（引流回主站与账号）
  ctx.fillStyle = "#4a5057";
  ctx.font = "13px ui-monospace, Menlo, monospace";
  ctx.fillText(`BUDGET $${answers.budget}/mo`, 48, H - 38);
  ctx.textAlign = "right";
  ctx.fillStyle = "#7d848c";
  ctx.fillText("build-100.com/001 · @JCheng557", W - 48, H - 38);
  ctx.textAlign = "left";
}

// —— canvas 工具 ——
function wrapText(ctx, text, x, y, maxW, lh) {
  // 简单按字符宽度换行（产品名可能含 CJK，按词/字符切）
  let line = "";
  let curY = y;
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY); line = ch; curY += lh;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
