/**
 * CLOCK-052 · clock-mismatch week (no DOM).
 * Switch instants are UTC millisecond constants. Illegal input never throws.
 */
(function () {
  "use strict";

  var SHARE_URL = "https://build-100.com/052/";
  var DISCLAIMER = {
    zh: "时间信息仅供参考，以交易所和航空公司官方公告为准",
    en: "For reference only; check official exchange and airline notices."
  };

  var META = { asOf: "2026-10-19" };

  var EU_SWITCH = Date.UTC(2026, 9, 25, 1, 0, 0);
  var US_SWITCH = Date.UTC(2026, 10, 1, 6, 0, 0);

  var ZERO_CD = { done: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };

  var PHASES = [
    {
      id: "before",
      label: { zh: "切换前", en: "Before the switch" },
      range: { zh: "至 10-23 周五", en: "Through Fri 10-23" },
      madrid: "CEST UTC+2",
      ny: "EDT UTC-4",
      gapHours: 6,
      nyseOpen: "15:30",
      nyseClose: "22:00"
    },
    {
      id: "gap",
      label: { zh: "错位周", en: "Mismatch week" },
      range: { zh: "10-26–10-30", en: "Oct 26–30" },
      madrid: "CET UTC+1",
      ny: "EDT UTC-4",
      gapHours: 5,
      nyseOpen: "14:30",
      nyseClose: "21:00"
    },
    {
      id: "after",
      label: { zh: "11-02 起", en: "From Nov 2" },
      range: { zh: "美国已切换", en: "After the US switch" },
      madrid: "CET UTC+1",
      ny: "EST UTC-5",
      gapHours: 6,
      nyseOpen: "15:30",
      nyseClose: "22:00"
    }
  ];

  var PHASE_OFFSET = { before: 6, gap: 5, after: 6 };

  var CITIES = [
    {
      id: "london",
      name: { zh: "伦敦", en: "London" },
      diffs: { before: -1, gap: -1, after: -1 }
    },
    {
      id: "newyork",
      name: { zh: "纽约", en: "New York" },
      diffs: { before: -6, gap: -5, after: -6 }
    },
    {
      id: "beijing",
      name: { zh: "北京", en: "Beijing" },
      diffs: { before: 6, gap: 7, after: 7 }
    },
    {
      id: "tokyo",
      name: { zh: "东京", en: "Tokyo" },
      diffs: { before: 7, gap: 8, after: 8 }
    }
  ];

  var CHECKLIST = [
    {
      id: "auto",
      text: {
        zh: "手机、电脑确认已打开自动设置时间",
        en: "On your phone and computer, confirm automatic time is on"
      }
    },
    {
      id: "oven",
      text: { zh: "烤箱时钟手动拨回 1 小时", en: "Set the oven clock back 1 hour by hand" }
    },
    {
      id: "microwave",
      text: { zh: "微波炉时钟手动拨回 1 小时", en: "Set the microwave clock back 1 hour by hand" }
    },
    {
      id: "car",
      text: { zh: "汽车时钟手动拨回 1 小时", en: "Set the car clock back 1 hour by hand" }
    },
    {
      id: "alarm",
      text: { zh: "床头闹钟手动拨回 1 小时", en: "Set the bedside alarm back 1 hour by hand" }
    },
    {
      id: "watch",
      text: {
        zh: "智能手表 / 运动手环（未联网同步时）手动调",
        en: "Set a smartwatch or fitness band by hand if it is not syncing over the network"
      }
    },
    {
      id: "flights",
      text: {
        zh: "检查 10-25 凌晨航班或班次：马德里本地 02:00–03:00 会出现两次，看 UTC 或起飞地时间",
        en: "Check overnight flights or shifts on Oct 25: Madrid local 02:00–03:00 happens twice — use UTC or the origin time"
      }
    },
    {
      id: "meetings",
      text: {
        zh: "和美国同事的固定例会重对一次时间（时差 6 小时 → 5 小时 → 6 小时）",
        en: "Reconfirm standing meetings with US colleagues (offset 6h → 5h → 6h)"
      }
    },
    {
      id: "trader",
      text: {
        zh: "交易者：把开盘提醒从 15:30 改到 14:30，只改一周（10-26–10-30），11-02 改回",
        en: "Traders: move the open reminder from 15:30 to 14:30 for one week only (Oct 26–30), then back on Nov 2"
      }
    }
  ];

  var QUESTIONS = [
    {
      id: "q1",
      q: {
        zh: "错位周（10-26–10-30）美股 9:30 开盘是马德里时间几点？",
        en: "During mismatch week (Oct 26–30), the 9:30 US Eastern open is what time in Madrid?"
      },
      options: [
        { zh: "15:30", en: "15:30" },
        { zh: "14:30", en: "14:30" },
        { zh: "13:30", en: "13:30" },
        { zh: "16:30", en: "16:30" }
      ],
      answer: 1,
      explain: {
        zh: "错位周马德里是 CET UTC+1，美东仍是 EDT UTC-4，时差 5 小时。9:30 加 5 小时是 14:30。平时是 15:30。",
        en: "Madrid is CET UTC+1 and the US East Coast is still EDT UTC-4, so the offset is 5 hours. 9:30 plus 5 hours is 14:30. In a normal week it is 15:30."
      }
    },
    {
      id: "q2",
      q: {
        zh: "哪个设备最可能不会自动调时间？",
        en: "Which device is most likely not to change time on its own?"
      },
      options: [
        { zh: "开了自动时间的手机", en: "A phone with automatic time on" },
        { zh: "烤箱或微波炉的时钟", en: "An oven or microwave clock" },
        { zh: "联网的笔记本电脑", en: "A laptop on the network" },
        { zh: "都会自动调", en: "They all change automatically" }
      ],
      answer: 1,
      explain: {
        zh: "开了自动时间的手机、联网的电脑会跟着调。烤箱、微波炉这类时钟通常要手动拨。",
        en: "A phone with automatic time and a laptop on the network will follow the switch. Oven and microwave clocks usually have to be set by hand."
      }
    },
    {
      id: "q3",
      q: {
        zh: "10-25 凌晨马德里哪个本地时段会出现两次？",
        en: "On the morning of Oct 25 in Madrid, which local hour happens twice?"
      },
      options: [
        { zh: "03:00–04:00", en: "03:00–04:00" },
        { zh: "01:00–02:00", en: "01:00–02:00" },
        { zh: "02:00–03:00", en: "02:00–03:00" },
        { zh: "没有时段重复", en: "No hour repeats" }
      ],
      answer: 2,
      explain: {
        zh: "03:00 CEST 拨回 02:00 CET，所以马德里本地 02:00–03:00 这一小时会出现两次。",
        en: "03:00 CEST is set back to 02:00 CET, so the local hour 02:00–03:00 in Madrid happens twice."
      }
    }
  ];

  function pad2(n) {
    n = Math.floor(n);
    if (n < 0) n = 0;
    return (n < 10 ? "0" : "") + n;
  }

  function countdown(targetMs, nowMs) {
    try {
      var target = Number(targetMs);
      var now = Number(nowMs);
      if (!isFinite(target) || !isFinite(now)) return ZERO_CD;
      var totalMs = target - now;
      if (!(totalMs > 0)) return ZERO_CD;
      var totalSec = Math.floor(totalMs / 1000);
      return {
        done: false,
        days: Math.floor(totalSec / 86400),
        hours: Math.floor((totalSec % 86400) / 3600),
        minutes: Math.floor((totalSec % 3600) / 60),
        seconds: totalSec % 60,
        totalMs: totalMs
      };
    } catch (e) {
      return ZERO_CD;
    }
  }

  function phaseAt(nowMs) {
    try {
      var t = Number(nowMs);
      if (!isFinite(t)) return "before";
      if (t < EU_SWITCH) return "before";
      if (t < US_SWITCH) return "gap";
      return "after";
    } catch (e) {
      return "before";
    }
  }

  function offsetFor(phaseId) {
    if (Object.prototype.hasOwnProperty.call(PHASE_OFFSET, phaseId)) return PHASE_OFFSET[phaseId];
    var i;
    for (i = 0; i < PHASES.length; i++) {
      if (PHASES[i].id === phaseId) return PHASES[i].gapHours;
    }
    return null;
  }

  function madridTimeForNY(hh, mm, phaseId) {
    try {
      if (hh == null || mm == null || phaseId == null || phaseId === "") return "";
      var h = Number(hh);
      var m = Number(mm);
      var add = offsetFor(phaseId);
      if (!isFinite(h) || !isFinite(m) || add == null || !isFinite(add)) return "";
      var total = Math.round(h) * 60 + Math.round(m) + add * 60;
      total = ((total % 1440) + 1440) % 1440;
      var oh = Math.floor(total / 60);
      var om = total % 60;
      return pad2(oh) + ":" + pad2(om);
    } catch (e) {
      return "";
    }
  }

  function knownIds() {
    var map = {};
    var i;
    for (i = 0; i < CHECKLIST.length; i++) map[CHECKLIST[i].id] = true;
    return map;
  }

  function asIdList(checkedIds) {
    if (Array.isArray(checkedIds)) return checkedIds;
    if (checkedIds && typeof checkedIds === "object") {
      return Object.keys(checkedIds).filter(function (k) { return checkedIds[k]; });
    }
    return [];
  }

  function checklistProgress(checkedIds) {
    try {
      var known = knownIds();
      var seen = {};
      var done = 0;
      var list = asIdList(checkedIds);
      var i;
      for (i = 0; i < list.length; i++) {
        var id = String(list[i]);
        if (!known[id] || seen[id]) continue;
        seen[id] = true;
        done += 1;
      }
      return { done: done, total: CHECKLIST.length };
    } catch (e) {
      return { done: 0, total: CHECKLIST.length };
    }
  }

  function scoreQuiz(answers) {
    try {
      var correct = 0;
      var i;
      for (i = 0; i < QUESTIONS.length; i++) {
        var given;
        if (Array.isArray(answers)) given = answers[i];
        else if (answers && typeof answers === "object") given = answers[QUESTIONS[i].id];
        if (typeof given === "number" && given === QUESTIONS[i].answer) correct += 1;
      }
      return { correct: correct, total: 3 };
    } catch (e) {
      return { correct: 0, total: 3 };
    }
  }

  function badgeFor(correct) {
    var n = Number(correct);
    if (!isFinite(n)) n = 0;
    if (n >= 3) return { id: "survivor", name: { zh: "冬令时幸存者", en: "DST Survivor" } };
    if (n >= 2) return { id: "almost", name: { zh: "差一点就调对了", en: "Almost in sync" } };
    return { id: "review", name: { zh: "再看一遍对照表", en: "Check the table again" } };
  }

  function clampScore(score) {
    var n = Number(score);
    if (score && typeof score === "object") n = Number(score.correct);
    if (!isFinite(n)) n = 0;
    n = Math.round(n);
    if (n < 0) n = 0;
    if (n > 3) n = 3;
    return n;
  }

  function shareText(lang, score) {
    try {
      var en = lang === "en";
      var n = clampScore(score);
      var badge = badgeFor(n);
      var lines;
      if (en) {
        lines = [
          "CLOCK-052 · Clock-mismatch week",
          "US stocks open at 14:30 Madrid time during mismatch week",
          "Score " + n + "/3 · " + badge.name.en,
          SHARE_URL,
          "Data as of " + META.asOf,
          DISCLAIMER.en
        ];
      } else {
        lines = [
          "CLOCK-052 · 冬令时错位周",
          "错位周美股 14:30 开盘（马德里）",
          "成绩 " + n + "/3 · " + badge.name.zh,
          SHARE_URL,
          "数据日期 " + META.asOf,
          DISCLAIMER.zh
        ];
      }
      return lines.join("\n");
    } catch (e) {
      return SHARE_URL;
    }
  }

  var API = {
    META: META,
    EU_SWITCH: EU_SWITCH,
    US_SWITCH: US_SWITCH,
    PHASES: PHASES,
    CITIES: CITIES,
    CHECKLIST: CHECKLIST,
    QUESTIONS: QUESTIONS,
    DISCLAIMER: DISCLAIMER,
    countdown: countdown,
    phaseAt: phaseAt,
    madridTimeForNY: madridTimeForNY,
    checklistProgress: checklistProgress,
    scoreQuiz: scoreQuiz,
    badgeFor: badgeFor,
    shareText: shareText
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof window !== "undefined") window.ClockEngine = API;
})();
