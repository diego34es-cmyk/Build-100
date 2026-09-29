/** PERMCHK-032 — local AI-assistant permission check. Pure functions, no DOM. */

export const PAGE_URL = "https://build-100.com/032/";
export const BRAND = "PERMCHK-032";
export const STORAGE_KEY = "permchk-032";
export const TITLE = Object.freeze({
  zh: "PERMCHK-032 · AI 助手权限体检",
  en: "PERMCHK-032 · AI assistant permission check",
});

export const DISCLAIMER = Object.freeze({
  zh: "本页不收集、不上传任何数据。勾选和报告只留在这台浏览器里。",
  en: "This page collects and uploads nothing. Checks and the report stay in this browser.",
});

export const DEMO_NOTE = Object.freeze({
  zh: "演示数据全是假的。这一屏不会读取、删除、打开网页或付款，也不会碰你的真实文件。",
  en: "Every demo line is fake. This screen does not read, delete, open a page, or pay, and it does not touch your real files.",
});

export const PLATFORMS = Object.freeze([
  Object.freeze({
    id: "ios",
    form: "phone",
    zh: "iOS",
    en: "iOS",
    formZh: "手机端",
    formEn: "Phone",
    hintZh: "iPhone 与 iPad 的系统设置",
    hintEn: "Settings on iPhone and iPad",
  }),
  Object.freeze({
    id: "android",
    form: "phone",
    zh: "Android",
    en: "Android",
    formZh: "手机端",
    formEn: "Phone",
    hintZh: "手机系统设置。小米机会多出小爱同学",
    hintEn: "Phone settings. Xiaomi phones also have Xiaoai",
  }),
  Object.freeze({
    id: "windows",
    form: "computer",
    zh: "Windows",
    en: "Windows",
    formZh: "电脑端",
    formEn: "Computer",
    hintZh: "系统隐私页，以及终端里的编程代理",
    hintEn: "System privacy pages, plus coding agents in a terminal",
  }),
  Object.freeze({
    id: "macos",
    form: "computer",
    zh: "macOS",
    en: "macOS",
    formZh: "电脑端",
    formEn: "Computer",
    hintZh: "隐私与安全性：完全磁盘、辅助功能、自动化",
    hintEn: "Privacy & Security: Full Disk, Accessibility, Automation",
  }),
]);

export const PLATFORM_IDS = Object.freeze(PLATFORMS.map((p) => p.id));

export const RULES = Object.freeze([
  Object.freeze({
    id: "folder",
    zh: "只把这一次任务要用的那个文件夹授权给助手，不要给整盘或完全磁盘访问。",
    en: "Grant only the single folder this task needs — never the whole disk or Full Disk Access.",
  }),
  Object.freeze({
    id: "confirm",
    zh: "删除、付款和向外发送，每一次都要你亲手确认，不要打开全部允许。",
    en: "Confirm every delete, payment, and outbound send yourself — never switch on allow-all.",
  }),
  Object.freeze({
    id: "revoke",
    zh: "任务一结束就收回钥匙：退出账号，并关掉辅助功能、自动化和完全磁盘访问。",
    en: "When the task ends, take the keys back: sign out and switch off Accessibility, Automation, and Full Disk Access.",
  }),
  Object.freeze({
    id: "profile",
    zh: "浏览器代理只用一个没有登录态、也没有保存密码的单独配置。",
    en: "Run a browser agent only in a separate profile with no saved logins and no saved passwords.",
  }),
  Object.freeze({
    id: "pay",
    zh: "不要把付款方式交给助手；演示卡和真卡分开，用完就删掉。",
    en: "Do not give the assistant a payment method; keep demo cards away from real cards and delete them after.",
  }),
]);

export const EVENTS = Object.freeze([
  Object.freeze({
    id: "delete-files",
    tagZh: "删文件",
    tagEn: "Deleted files",
    date: "2026-09-25",
    zh: "TechRadar 在 2026-09-25 报道：一名开发者在 Reddit 称，Claude Code 约 103 秒内删除了其工作区里约 48,218 个文件。2026-09-27 的后续报道称，清理 Windows 联接（junction）时跟进了真实目录。这是当事人的公开叙述，不是本页能复现的实验。",
    en: "TechRadar reported on 2026-09-25 that a developer said on Reddit that Claude Code deleted about 48,218 files from a working tree in roughly 103 seconds. A 2026-09-27 follow-up said a cleanup followed Windows junctions into live folders. That is the published account, not a test this page can recreate.",
    sourceZh: "TechRadar · 2026-09-25 / 2026-09-27",
    sourceEn: "TechRadar · 2026-09-25 / 2026-09-27",
  }),
  Object.freeze({
    id: "gov-bypass",
    tagZh: "绕过政府网站防线",
    tagEn: "Government-site controls",
    date: "2026-09-25",
    zh: "BBC 在 2026-09-25 报道：OpenAI 承认其智能体接触了美国证券交易委员会（SEC）、人口普查局等机构网站，部分行为会绕过网站上的安全措施。OpenAI 表示取到的政府数据是公开的。路透社同日报道，公司称未发现未经授权的访问。",
    en: "The BBC reported on 2026-09-25 that OpenAI acknowledged agents reached sites including the US SEC and the Census Bureau, and that some bots worked to bypass security measures. OpenAI said the government data accessed was public. Reuters reported the same day that the company found no unauthorized access.",
    sourceZh: "BBC / Reuters · 2026-09-25",
    sourceEn: "BBC / Reuters · 2026-09-25",
  }),
  Object.freeze({
    id: "image-leak",
    tagZh: "图片泄露",
    tagEn: "Image leak",
    date: "2026-09-25",
    zh: "路透社在 2026-09-25 报道：OpenAI 称，其智能体在至少 53 起事件中，把 ChatGPT 用户活动里的图片传到了别处。公司表示这不是对这些数据的恰当使用。",
    en: "Reuters reported on 2026-09-25 that OpenAI said its agents, in at least 53 incidents, transferred images from ChatGPT user activity somewhere they should not have gone. The company said that was not an appropriate use of the data.",
    sourceZh: "Reuters · 2026-09-25",
    sourceEn: "Reuters · 2026-09-25",
  }),
]);

const DEMO_FILES = Object.freeze([
  Object.freeze({
    nameZh: "预算-假数据.xlsx",
    nameEn: "budget-FAKE.xlsx",
    metaZh: "12 KB · 假文件",
    metaEn: "12 KB · fake file",
  }),
  Object.freeze({
    nameZh: "会议纪要-假.txt",
    nameEn: "notes-FAKE.txt",
    metaZh: "4 KB · 假文件",
    metaEn: "4 KB · fake file",
  }),
  Object.freeze({
    nameZh: "证件扫描-假.png",
    nameEn: "id-scan-FAKE.png",
    metaZh: "800 KB · 假文件",
    metaEn: "800 KB · fake file",
  }),
]);

function fakeLine(zh, en) {
  return Object.freeze({ zh: "[FAKE] " + zh, en: "[FAKE] " + en });
}

export const RISK_LEVELS = Object.freeze([
  Object.freeze({
    id: "read",
    rank: 1,
    zh: "读文件",
    en: "Read files",
    fake: true,
    blurbZh: "只读，就已经能看见预算、纪要和证件扫描的文件名。下面三行是写死的假名单。",
    blurbEn: "Read-only is enough to list budgets, notes, and ID scans. The three rows below are hard-coded fakes.",
    visual: Object.freeze({ kind: "files", items: DEMO_FILES }),
    lines: Object.freeze([
      fakeLine("请求列出 ~/PERMCHK-DEMO/ 。目录不存在。", "ask to list ~/PERMCHK-DEMO/ . The folder does not exist."),
      fakeLine("看见 预算-假数据.xlsx 、会议纪要-假.txt 、证件扫描-假.png 。", "see budget-FAKE.xlsx, notes-FAKE.txt, id-scan-FAKE.png."),
      fakeLine("停止。没有打开任何真实文件。", "stop. No real file was opened."),
    ]),
  }),
  Object.freeze({
    id: "delete",
    rank: 2,
    zh: "删文件",
    en: "Delete files",
    fake: true,
    blurbZh: "删除权比读取重一档。这里只给假文件打上删除标记，不会执行删除。",
    blurbEn: "Delete rights sit one step above read. These fake files are only marked deleted. Nothing is executed.",
    visual: Object.freeze({ kind: "delete", items: DEMO_FILES }),
    lines: Object.freeze([
      fakeLine("模拟：3 个演示文件被标成已删除。", "simulation: 3 demo files marked deleted."),
      fakeLine("没有运行删除命令，也没有扫描磁盘。", "no delete command ran, and the disk was not scanned."),
      fakeLine("对照公开报道：有开发者称约 48,218 个真实文件在约 103 秒内被删。本页不重演。", "published account for contrast: a developer said about 48,218 real files were deleted in about 103 seconds. This page does not replay that."),
    ]),
  }),
  Object.freeze({
    id: "browser",
    rank: 3,
    zh: "浏览器自动操作",
    en: "Browser automation",
    fake: true,
    blurbZh: "能替你点页面，就能填表、点提交。这个地址在保留域名 .invalid 上，浏览器到不了。",
    blurbEn: "An agent that can click can fill a form and hit submit. This address is on the reserved .invalid name, so it cannot resolve.",
    visual: Object.freeze({
      kind: "browser",
      url: "https://demo.invalid/form",
      fields: Object.freeze([
        Object.freeze({ kZh: "姓名", kEn: "Name", vZh: "演示用户", vEn: "Demo User" }),
        Object.freeze({ kZh: "动作", kEn: "Action", vZh: "点击提交", vEn: "Click submit" }),
        Object.freeze({ kZh: "网络", kEn: "Network", vZh: "未发送", vEn: "Not sent" }),
      ]),
    }),
    lines: Object.freeze([
      fakeLine("打开 https://demo.invalid/form 。不会发起网络请求。", "open https://demo.invalid/form . No network request is made."),
      fakeLine("填入假姓名「演示用户」。", "fill the fake name Demo User."),
      fakeLine("按钮停在未发送。没有提交任何表单。", "the button stays unsent. No form was submitted."),
    ]),
  }),
  Object.freeze({
    id: "pay",
    rank: 4,
    zh: "自动付款",
    en: "Auto-pay",
    fake: true,
    blurbZh: "最高一档是替你付钱。卡号是业界常用测试号，商户和金额都是假的，没有支付接口。",
    blurbEn: "The top step is paying for you. The card is the common test number. Merchant and amount are fake. There is no payment endpoint.",
    visual: Object.freeze({
      kind: "pay",
      merchantZh: "PERMCHK 演示商店",
      merchantEn: "PERMCHK DEMO STORE",
      amount: "$42.42",
      card: "4242 4242 4242 4242",
      statusZh: "未发送 · 没有支付接口",
      statusEn: "Not sent · no payment endpoint",
    }),
    lines: Object.freeze([
      fakeLine("商户 PERMCHK DEMO STORE 。", "merchant PERMCHK DEMO STORE."),
      fakeLine("金额 $42.42 。卡号 4242 4242 4242 4242 ，这是测试号，不是真卡。", "amount $42.42 . Card 4242 4242 4242 4242 , a test number, not a real card."),
      fakeLine("状态：未发送。这一屏没有支付接口。", "status: not sent. This screen has no payment endpoint."),
    ]),
  }),
]);

function pack(platform, toolId, rows) {
  return Object.freeze(rows.map((row) => Object.freeze({
    id: platform + "." + toolId + "." + row[0],
    platform,
    toolId,
    pathZh: row[1],
    pathEn: row[2],
    zh: row[3],
    en: row[4],
  })));
}

const STEP_ROWS = {
  "claude-code": {
    windows: [
      ["no-admin", "终端 → 不用管理员", "Terminal → not as Administrator",
        "如果启动方式是「以管理员身份运行」，先关掉。日常只用普通用户权限。",
        "If it was started as Administrator, close that session. Day to day, use a normal user account."],
      ["ask", "Claude Code → 权限模式", "Claude Code → permission mode",
        "把跳过确认、自动全部允许，改回每一次都问你。允许列表只放当前项目目录，不要放用户主目录或整块磁盘。",
        "Turn off skip-confirm and allow-all. Ask every time. Allow only the current project folder, not the home folder and not the whole disk."],
      ["privacy", "设置 → 隐私和安全性 → 文件系统", "Settings → Privacy & security → File system",
        "关掉桌面版或终端用不到的文件系统、文档和麦克风。菜单名称若有差别，用系统搜索找「文件系统」。",
        "Turn off File system, Documents, and Microphone for the desktop app or terminal if they are not needed. If the label differs, search settings for File system."],
      ["remote", "版本管理 → 远端", "Version control → remote",
        "让代理改文件之前，确认重要仓库已经推到远端。本页不会访问你的仓库。",
        "Before an agent edits files, confirm important repos are already on a remote. This page never touches your repos."],
    ],
    macos: [
      ["full-disk", "系统设置 → 隐私与安全性 → 完全磁盘访问权限", "System Settings → Privacy & Security → Full Disk Access",
        "移除 Claude 和终端，或关掉开关。写代码最多只给「文件与文件夹」里的当前项目。旧系统此页可能在「系统偏好设置」。",
        "Remove Claude and the terminal, or switch them off. For coding, grant only the current project under Files and Folders. Older systems may call this System Preferences."],
      ["folders", "系统设置 → 隐私与安全性 → 文件与文件夹", "System Settings → Privacy & Security → Files and Folders",
        "取消桌面、文稿、下载里不需要的勾。只留这一次任务的文件夹。",
        "Uncheck Desktop, Documents, and Downloads if this task does not need them. Leave only that one folder."],
      ["ask", "Claude Code → 权限模式", "Claude Code → permission mode",
        "自动全部允许改成每次询问。不要对整个主目录点允许。",
        "Switch allow-all back to ask-each-time. Do not allow the whole home folder."],
      ["a11y", "系统设置 → 隐私与安全性 → 辅助功能 / 自动化", "System Settings → Privacy & Security → Accessibility / Automation",
        "只写代码的话，这两项保持关闭。用完退出这次会话。",
        "If it only writes code, leave both off. Quit the session when you are done."],
    ],
  },
  chatgpt: {
    ios: [
      ["app", "设置 → ChatGPT", "Settings → ChatGPT",
        "逐项看照片、麦克风、相机、本地网络。不做语音就关麦克风；不看相册就把照片改成「无」或「选中的照片」。",
        "Review Photos, Microphone, Camera, and Local Network. Turn Microphone off if you do not use voice. Set Photos to None or Selected Photos if the library is not needed."],
      ["data", "ChatGPT → 设置 → 数据控制", "ChatGPT → Settings → Data controls",
        "按你的需要关掉用于改进模型的开关。OpenAI 在 2026-09 的公开说明里提到过数据控制。本页不会替你登录。",
        "Turn off model-improvement sharing if you do not want it. OpenAI mentioned data controls in its September 2026 statements. This page will not sign in for you."],
      ["connectors", "ChatGPT → 连接器 / 智能体", "ChatGPT → connectors / agent",
        "断开邮箱、日历、网盘。代你操作浏览器或 App 的模式，用完就关。",
        "Disconnect mail, calendar, and cloud drives. If an agent mode can operate the browser or apps, turn it off when the task ends."],
      ["pay", "ChatGPT → 付款方式", "ChatGPT → payment methods",
        "不要在对话或连接器里保存银行卡。要买东西，只让它给你链接。",
        "Do not save a card in the chat or in a connector. If you need to buy something, let it hand you a link."],
    ],
    android: [
      ["app", "设置 → 应用 → ChatGPT → 权限", "Settings → Apps → ChatGPT → Permissions",
        "短信、通话记录、通讯录、位置改成不允许。麦克风和照片只在当次需要时打开。各家菜单名称不同，可用系统搜索找该应用。",
        "Set SMS, Call logs, Contacts, and Location to Don't allow. Open Microphone and Photos only for the moment you need them. Menu names differ; search settings for the app."],
      ["a11y", "设置 → 应用 → 特殊应用权限 → 无障碍", "Settings → Apps → Special app access → Accessibility",
        "无障碍能让应用替你点屏幕。不用自动操作，就关掉 ChatGPT 和你不认识的服务。",
        "Accessibility lets an app tap the screen for you. If you do not want that, switch off ChatGPT and any service you do not recognize."],
      ["overlay", "设置 → 特殊应用权限 → 显示在其他应用上层", "Settings → Special app access → Display over other apps",
        "关掉 ChatGPT 的悬浮窗权限。不需要它盖在银行或验证码上面。",
        "Turn off Display over other apps for ChatGPT. It does not need to sit on top of a bank page or a verification code."],
      ["connectors", "ChatGPT → 设置 → 数据控制与连接器", "ChatGPT → Settings → Data controls and connectors",
        "断开邮箱、日历、网盘，并按需关掉改进模型。不要保存付款方式。",
        "Disconnect mail, calendar, and drives, and turn off model-improvement sharing if you want. Do not save a payment method."],
    ],
    windows: [
      ["privacy", "设置 → 隐私和安全性 → 麦克风 / 文件系统", "Settings → Privacy & security → Microphone / File system",
        "关掉 ChatGPT 用不到的麦克风、相机和文件系统。",
        "Turn off Microphone, Camera, and File system for ChatGPT where they are not needed."],
      ["extension", "浏览器 → 扩展 → 站点访问", "Browser → Extensions → site access",
        "若装了相关扩展，把「读取所有网站上的数据」改成「点击时」或直接移除。",
        "If an extension is installed, change read-all-site-data to on-click, or remove the extension."],
      ["profile", "浏览器 → 新建未登录的配置", "Browser → a new signed-out profile",
        "自动操作只用这个配置：不登录邮箱和银行，不保存密码。",
        "Use that profile for automation only: no mail, no bank, no saved passwords."],
      ["connectors", "ChatGPT → 连接器与数据控制", "ChatGPT → connectors and data controls",
        "断开网盘、邮箱、日历。不要在对话里留下卡号。",
        "Disconnect drives, mail, and calendar. Do not leave a card number in the chat."],
    ],
    macos: [
      ["a11y", "系统设置 → 隐私与安全性 → 辅助功能", "System Settings → Privacy & Security → Accessibility",
        "不用它替你点界面，就关掉 ChatGPT 和对应浏览器。这是「能操作电脑」的那把钥匙。",
        "If it should not click for you, switch off ChatGPT and that browser. This is the key that operates the computer."],
      ["auto", "系统设置 → 隐私与安全性 → 自动化", "System Settings → Privacy & Security → Automation",
        "展开 ChatGPT 或浏览器，取消控制其他 App 的勾选。",
        "Expand ChatGPT or the browser and uncheck control of other apps."],
      ["screen", "系统设置 → 隐私与安全性 → 屏幕录制", "System Settings → Privacy & Security → Screen Recording",
        "关掉 ChatGPT 和浏览器的屏幕录制。屏幕上的邮件不该被录进去。",
        "Turn off Screen Recording for ChatGPT and the browser. Mail on your display should not be recorded."],
      ["files", "系统设置 → 隐私与安全性 → 文件与文件夹", "System Settings → Privacy & Security → Files and Folders",
        "只留当前任务的文件夹，并在 App 里断开连接器。不要保存银行卡。",
        "Leave only the current task folder, and disconnect connectors in the app. Do not save a card."],
    ],
  },
  copilot: {
    ios: [
      ["app", "设置 → Copilot", "Settings → Copilot",
        "看麦克风、照片、相机。不用语音就关麦克风，照片改为「无」。",
        "Check Microphone, Photos, and Camera. Turn Microphone off if you do not use voice, and set Photos to None."],
      ["account", "Copilot → 账号与插件", "Copilot → account and plugins",
        "退出用不到的微软账号连接。关掉能改文件或发邮件的插件。",
        "Sign out of Microsoft account links you do not need. Turn off plugins that can edit files or send mail."],
      ["pay", "Copilot → 付款与购物", "Copilot → payments and shopping",
        "不要绑定付款方式。购物停在链接，由你自己付款。",
        "Do not attach a payment method. Stop shopping at a link and pay yourself."],
    ],
    android: [
      ["app", "设置 → 应用 → Copilot → 权限", "Settings → Apps → Copilot → Permissions",
        "短信、电话、通讯录、位置改为不允许。麦克风按需再开。",
        "Set SMS, Phone, Contacts, and Location to Don't allow. Turn Microphone on only when you need it."],
      ["a11y", "设置 → 特殊应用权限 → 无障碍", "Settings → Special app access → Accessibility",
        "关掉 Copilot 的无障碍服务，除非你明确要它替你点屏幕。",
        "Switch off the Copilot accessibility service unless you explicitly want it to tap the screen."],
      ["plugins", "Copilot → 插件与账号", "Copilot → plugins and account",
        "移除能访问邮箱、文件或日历的插件，并退出不需要的账号。",
        "Remove plugins that can reach mail, files, or calendar, and sign out of accounts you do not need."],
    ],
    windows: [
      ["startup", "设置 → Copilot", "Settings → Copilot",
        "关掉开机自启，以及你不用的视觉和语音。入口若在「个性化」里，用搜索找 Copilot。",
        "Turn off launch-at-startup, plus vision or voice you do not use. If the page sits under Personalization, search for Copilot."],
      ["activity", "设置 → 隐私和安全性 → 活动历史记录", "Settings → Privacy & security → Activity history",
        "关掉你不希望用来个性化的活动历史和诊断项。",
        "Turn off activity history and diagnostic items you do not want used for personalization."],
      ["editor", "编辑器 → Copilot 代理", "Editor → Copilot agent",
        "关掉自动运行终端命令。工作区不要信任整块磁盘，弹窗选询问而不是始终允许。",
        "Turn off auto-running terminal commands. Do not trust the whole disk. Choose ask, not always allow."],
      ["remove", "设置 → 应用 → 已安装的应用", "Settings → Apps → Installed apps",
        "完全不用就退出账号后卸载 Copilot 应用。编辑器插件可单独禁用。",
        "If you do not use it at all, sign out and uninstall the Copilot app. The editor plugin can be disabled on its own."],
    ],
    macos: [
      ["folders", "系统设置 → 隐私与安全性 → 文件与文件夹", "System Settings → Privacy & Security → Files and Folders",
        "编辑器和 Copilot 只留项目目录，不要给整个桌面和文稿。",
        "Leave the editor and Copilot only the project folder, not the whole Desktop and Documents."],
      ["editor", "编辑器 → 终端命令", "Editor → terminal commands",
        "关闭自动执行。每次运行都选询问。",
        "Turn off automatic execution. Choose ask every time a command wants to run."],
      ["account", "Copilot → 微软账号连接", "Copilot → Microsoft account links",
        "不要在 Copilot 里授权邮箱和日历。",
        "Do not authorize mail and calendar inside Copilot."],
      ["mic", "系统设置 → 隐私与安全性 → 麦克风", "System Settings → Privacy & Security → Microphone",
        "不用语音就关掉麦克风。",
        "If you do not use voice, turn Microphone off."],
    ],
  },
  gemini: {
    ios: [
      ["app", "设置 → Gemini", "Settings → Gemini",
        "位置选「永不」，除非这一次就要导航。照片不要选「所有照片」。不用语音就关麦克风。",
        "Set Location to Never unless this task is navigation. Do not choose All Photos. Turn Microphone off if you do not use voice."],
      ["activity", "Gemini → 设置 → 应用活动记录", "Gemini → Settings → Gemini Apps Activity",
        "暂停你不想留下的活动记录。这是账号里的历史开关，不是本页上传。本页也不会替你打开那个账号页。",
        "Pause activity you do not want kept. That switch is account history, not an upload from this page. This page will not open the account page for you."],
      ["assistant", "设置 → Gemini → Siri 与搜索", "Settings → Gemini → Siri & Search",
        "关掉「从此 App 学习」，避免系统建议把 Gemini 里的内容拿去别处显示。",
        "Turn off Learn from this App so system suggestions do not surface Gemini content elsewhere."],
    ],
    android: [
      ["app", "设置 → 应用 → Gemini → 权限", "Settings → Apps → Gemini → Permissions",
        "短信、电话、通讯录改为不允许。位置和照片按这一次的需要单独开。",
        "Set SMS, Phone, and Contacts to Don't allow. Turn Location and Photos on only for this task."],
      ["assist", "设置 → 应用 → 默认应用 → 数字助理应用", "Settings → Apps → Default apps → Digital assistant",
        "看默认助理是不是 Gemini。不想用侧边键唤起，就改成「无」。",
        "See whether the default assistant is Gemini. If you do not want the side button to open it, choose None."],
      ["a11y", "设置 → 特殊应用权限 → 无障碍", "Settings → Special app access → Accessibility",
        "关掉 Gemini 或 Google 应用里用来自动点按的服务。",
        "Switch off Gemini or Google services that tap the screen for you."],
      ["activity", "Gemini → 设置 → 活动记录", "Gemini → Settings → Activity",
        "暂停 Gemini 应用活动记录。不要在里面保存付款方式。",
        "Pause Gemini Apps Activity. Do not save a payment method there."],
    ],
    windows: [
      ["site", "浏览器 → 地址栏锁图标 → 网站权限", "Browser → lock icon → site permissions",
        "对 Gemini 所在的站点，麦克风、相机、位置选阻止。",
        "For the site where Gemini runs, block Microphone, Camera, and Location."],
      ["os", "设置 → 隐私和安全性 → 麦克风 / 位置", "Settings → Privacy & security → Microphone / Location",
        "确认没有桌面版被允许使用麦克风和位置。",
        "Confirm no desktop build is allowed to use Microphone and Location."],
      ["activity", "Gemini → 活动记录", "Gemini → Activity",
        "在你自己的账号设置里暂停活动记录。本页不会登录，也不会把记录发出去。",
        "Pause activity in your own account settings. This page does not sign in and does not send that history anywhere."],
    ],
    macos: [
      ["site", "浏览器 → 锁图标 → 网站权限", "Browser → lock icon → site permissions",
        "阻止麦克风、相机和位置。不要把桌面与文稿整夹授权给浏览器。",
        "Block Microphone, Camera, and Location. Do not grant the browser your whole Desktop and Documents folders."],
      ["auto", "系统设置 → 隐私与安全性 → 自动化", "System Settings → Privacy & Security → Automation",
        "浏览器控制其他 App 的条目，不认识就关。",
        "If the browser is allowed to control other apps and you do not recognize the entry, turn it off."],
      ["activity", "Gemini → 活动记录", "Gemini → Activity",
        "暂停活动记录。购物和付款不要交给这一侧。",
        "Pause activity. Do not hand shopping or payment to this side."],
    ],
  },
  "meta-muse": {
    ios: [
      ["app", "设置 → Muse", "Settings → Muse",
        "看照片、麦克风、位置、本地网络。用不到的关掉。Meta 在 2026-09 的发布说明里写：每个人决定 Muse 能拿多少权限。",
        "Review Photos, Microphone, Location, and Local Network. Turn off what you do not need. Meta's September 2026 launch notes say each person decides how much access Muse gets."],
      ["links", "Muse → 邮件 / 日历 / 浏览器连接", "Muse → mail / calendar / browser links",
        "断开没在用的连接。用完可以退出登录；不需要就删掉 App。",
        "Disconnect links you are not using. Sign out when finished; delete the app if you do not need it."],
      ["pay", "Muse → 付款", "Muse → payments",
        "不要保存银行卡。需要下单时，停在确认页，由你自己付。",
        "Do not save a card. When an order is needed, stop on the confirm step and pay yourself."],
      ["siri", "设置 → Muse → Siri 与搜索", "Settings → Muse → Siri & Search",
        "关掉「从此 App 学习」和锁屏时的建议。",
        "Turn off Learn from this App, and suggestions on the lock screen."],
    ],
    android: [
      ["app", "设置 → 应用 → Muse → 权限", "Settings → Apps → Muse → Permissions",
        "短信、通讯录、电话、位置改为不允许。照片改为仅本次允许或直接关闭。",
        "Set SMS, Contacts, Phone, and Location to Don't allow. Set Photos to ask each time, or off."],
      ["a11y", "设置 → 特殊应用权限 → 无障碍", "Settings → Special app access → Accessibility",
        "不用它替你点屏幕，就关掉 Muse 的无障碍服务。",
        "If it should not tap the screen for you, switch off the Muse accessibility service."],
      ["overlay", "设置 → 特殊应用权限 → 显示在其他应用上层", "Settings → Special app access → Display over other apps",
        "关掉悬浮窗。验证码和付款页不应该被盖住。",
        "Turn off the overlay. Verification codes and payment pages should not sit underneath it."],
      ["links", "Muse → 连接与付款", "Muse → links and payments",
        "断开邮件、日历和浏览器授权。不要保存银行卡。",
        "Disconnect mail, calendar, and browser access. Do not save a card."],
    ],
    windows: [
      ["which", "先确认你用的是不是网页", "First confirm whether you only have the site",
        "公开报道里的桌面版是 macOS（约 2026-09-17）。Windows 上若只有网页，就按浏览器权限收，不必找一个不存在的客户端开关。",
        "The desktop app in public reports is macOS (around 2026-09-17). On Windows, if you only have the site, revoke it in the browser. Do not hunt for a client switch that is not there."],
      ["site", "浏览器 → 锁图标 → 网站权限", "Browser → lock icon → site permissions",
        "阻止麦克风、相机、位置。站点访问不要选「所有网站」。",
        "Block Microphone, Camera, and Location. Do not choose access to all sites."],
      ["profile", "浏览器 → 未登录的单独配置", "Browser → a separate signed-out profile",
        "自动操作放在这个配置里。不要让浏览器记住付款方式。",
        "Keep automation in that profile. Do not let the browser remember a payment method."],
      ["links", "网页里的 Muse → 连接器", "Muse on the site → connectors",
        "断开邮件、日历、网盘。将来若安装了客户端，文件系统里只给一个空的演示文件夹。",
        "Disconnect mail, calendar, and drives. If a client appears later, give File system only an empty demo folder."],
    ],
    macos: [
      ["folders", "系统设置 → 隐私与安全性 → 文件与文件夹", "System Settings → Privacy & Security → Files and Folders",
        "只留一个你指定的文件夹。完全磁盘访问权限里不要出现 Muse。Mac 版约在 2026-09-17 推出，官方说明访问范围由你决定。",
        "Leave only one folder you chose. Muse should not be in Full Disk Access. The Mac app shipped around 2026-09-17, and Meta says you decide the scope."],
      ["a11y", "系统设置 → 隐私与安全性 → 辅助功能 / 自动化", "System Settings → Privacy & Security → Accessibility / Automation",
        "不用它替你点 App，就把这两项关掉。",
        "If it should not click apps for you, turn both off."],
      ["personal", "系统设置 → 隐私与安全性 → 日历 / 提醒事项 / 通讯录", "System Settings → Privacy & Security → Calendars / Reminders / Contacts",
        "移除 Muse。邮件连接在 App 内单独断开。",
        "Remove Muse. Disconnect mail inside the app as well."],
      ["pay", "Muse → 付款方式", "Muse → payment methods",
        "删除已存的卡。下单必须回到你自己确认的那一步。",
        "Delete any saved card. An order has to come back to a confirm step you do yourself."],
    ],
  },
  siri: {
    ios: [
      ["wake", "设置 → Apple 智能与 Siri", "Settings → Apple Intelligence & Siri",
        "不需要语音唤醒就关掉「听取嘿 Siri」。老系统这一页可能叫「Siri 与搜索」。同时关掉锁定时使用。",
        "If you do not want a wake phrase, turn off Listen for Hey Siri. Older systems may label this Siri & Search. Also turn off use while locked."],
      ["apps", "设置 → [App] → Siri 与搜索", "Settings → [App] → Siri & Search",
        "对邮件、信息、照片和银行 App，关掉「从此 App 学习」和「建议」。",
        "For Mail, Messages, Photos, and banking apps, turn off Learn from this App and Suggestions."],
      ["mic", "设置 → 隐私与安全性 → 麦克风", "Settings → Privacy & Security → Microphone",
        "确认只有你还想用语音的那几个 App 留着麦克风。",
        "Confirm Microphone stays on only for apps you still want to talk to."],
    ],
    macos: [
      ["wake", "系统设置 → Apple 智能与 Siri", "System Settings → Apple Intelligence & Siri",
        "关掉听取嘿 Siri，并关掉锁定时使用。",
        "Turn off Listen for Hey Siri, and turn off use while locked."],
      ["learn", "系统设置 → Siri 建议与隐私", "System Settings → Siri Suggestions & Privacy",
        "关掉会读取邮件、信息和备忘录的学习项。入口名称若不同，搜索「Siri」。",
        "Turn off learning items that read Mail, Messages, and Notes. If the label differs, search for Siri."],
      ["mic", "系统设置 → 隐私与安全性 → 麦克风", "System Settings → Privacy & Security → Microphone",
        "不用语音就关掉 Siri 的麦克风。",
        "If you do not use voice, turn Siri's Microphone off."],
    ],
  },
  xiaoai: {
    android: [
      ["app", "设置 → 应用设置 → 应用管理 → 小爱同学 → 权限", "Settings → Apps → Manage apps → Xiaoai → Permissions",
        "短信、通讯录、电话改成不允许。原生 Android 路径通常是「设置 → 应用 → 小爱同学 → 权限」。麦克风留到你真的要语音时再开。",
        "Set SMS, Contacts, and Phone to Don't allow. On stock Android the path is usually Settings → Apps → Xiaoai → Permissions. Leave Microphone off until you actually want voice."],
      ["wake", "设置 → 小爱同学 → 语音唤醒", "Settings → Xiaoai → Voice wake",
        "不需要喊一声就唤起的话，关掉语音唤醒。",
        "If you do not want a wake phrase, turn voice wake off."],
      ["autostart", "应用管理 → 小爱同学 → 自启动", "Manage apps → Xiaoai → Autostart",
        "关掉自启动和关联启动，避免它一直留在后台。这是小米 HyperOS / MIUI 的项；原生系统没有就跳过。",
        "Turn off Autostart and associated start so it does not stay resident. This is a Xiaomi HyperOS / MIUI item; skip it on stock Android."],
      ["pay", "小爱同学 → 支付与钱包", "Xiaoai → payments and wallet",
        "不要绑定钱包，不要开免密支付。购物只生成链接，付款由你完成。",
        "Do not link a wallet and do not enable pay-without-password. Shopping should stop at a link you pay yourself."],
    ],
  },
};

const TOOL_DEFS = [
  ["claude-code", "Claude Code", "Claude Code", "终端或桌面里的编程代理", "Coding agent in a terminal or desktop app"],
  ["chatgpt", "ChatGPT 智能体", "ChatGPT agent", "含 App 内的 Agent 与连接器", "Includes in-app Agent and connectors"],
  ["copilot", "Copilot", "Copilot", "微软 Copilot，以及编辑器里的 GitHub Copilot", "Microsoft Copilot, and GitHub Copilot in an editor"],
  ["gemini", "Gemini", "Gemini", "App、默认助理，或浏览器里的 Gemini", "The app, the default assistant, or Gemini in a browser"],
  ["meta-muse", "Meta Muse", "Meta Muse", "Meta 的个人智能体：手机、网页，Mac 已有公开桌面版", "Meta's personal agent: phone, web, and a public Mac app"],
  ["siri", "Siri", "Siri", "系统自带的语音助手", "The system voice assistant"],
  ["xiaoai", "小爱同学", "Xiaoai", "小米手机上的语音助手", "Voice assistant on Xiaomi phones"],
];

export const TOOLS = Object.freeze(TOOL_DEFS.map((row) => {
  const id = row[0];
  const steps = {};
  const platforms = [];
  for (const platform of PLATFORM_IDS) {
    const rows = STEP_ROWS[id][platform];
    if (!rows) continue;
    platforms.push(platform);
    steps[platform] = pack(platform, id, rows);
  }
  return Object.freeze({
    id,
    zh: row[1],
    en: row[2],
    hintZh: row[3],
    hintEn: row[4],
    platforms: Object.freeze(platforms),
    steps: Object.freeze(steps),
  });
}));

export const TOOL_IDS = Object.freeze(TOOLS.map((t) => t.id));

export function platformById(id) {
  return PLATFORMS.find((p) => p.id === id) || null;
}

export function toolById(id) {
  return TOOLS.find((t) => t.id === id) || null;
}

export function toolsForPlatform(platformId) {
  if (!PLATFORM_IDS.includes(platformId)) return [];
  return TOOLS.filter((tool) => tool.platforms.includes(platformId));
}

export function normalizeSelection(input) {
  const src = input && typeof input === "object" ? input : {};
  const platform = PLATFORM_IDS.includes(src.platform) ? src.platform : "";
  const allowed = new Set(toolsForPlatform(platform).map((tool) => tool.id));
  const picked = new Set();
  const raw = Array.isArray(src.toolIds) ? src.toolIds : [];
  for (const id of raw) {
    if (allowed.has(id)) picked.add(id);
  }
  return {
    platform,
    toolIds: TOOL_IDS.filter((id) => picked.has(id)),
  };
}

export function buildChecklist(input) {
  const sel = normalizeSelection(input);
  const steps = [];
  for (const id of sel.toolIds) {
    const tool = toolById(id);
    const list = (tool && tool.steps[sel.platform]) || [];
    for (const step of list) steps.push(step);
  }
  return {
    platform: sel.platform,
    toolIds: sel.toolIds.slice(),
    steps,
  };
}

export function knownStepIds() {
  const ids = [];
  for (const tool of TOOLS) {
    for (const platform of tool.platforms) {
      for (const step of tool.steps[platform]) ids.push(step.id);
    }
  }
  return ids;
}

export function stepById(id) {
  for (const tool of TOOLS) {
    for (const platform of tool.platforms) {
      for (const step of tool.steps[platform]) {
        if (step.id === id) return step;
      }
    }
  }
  return null;
}

export function normalizeChecked(ids, checklist) {
  const valid = new Set(
    checklist && Array.isArray(checklist.steps)
      ? checklist.steps.map((step) => step.id)
      : knownStepIds()
  );
  const out = [];
  const raw = Array.isArray(ids) ? ids : [];
  for (const id of raw) {
    if (valid.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

export function progress(checklist, checkedIds) {
  const steps = checklist && Array.isArray(checklist.steps) ? checklist.steps : [];
  const done = normalizeChecked(checkedIds, { steps }).length;
  return { total: steps.length, done, left: steps.length - done };
}

export function splitSteps(checklist, checkedIds) {
  const steps = checklist && Array.isArray(checklist.steps) ? checklist.steps : [];
  const checked = new Set(normalizeChecked(checkedIds, { steps }));
  const pending = [];
  const done = [];
  for (const step of steps) (checked.has(step.id) ? done : pending).push(step);
  return { pending, done };
}

export function groupChecklist(checklist) {
  const groups = [];
  const map = new Map();
  const steps = checklist && Array.isArray(checklist.steps) ? checklist.steps : [];
  for (const step of steps) {
    if (!map.has(step.toolId)) {
      const group = { toolId: step.toolId, steps: [] };
      map.set(step.toolId, group);
      groups.push(group);
    }
    map.get(step.toolId).steps.push(step);
  }
  return groups;
}

export function stepLabel(step, lang) {
  if (!step) return "";
  const en = lang === "en";
  return (en ? step.pathEn : step.pathZh) + " — " + (en ? step.en : step.zh);
}

export function toolLabel(id, lang) {
  const tool = toolById(id);
  if (!tool) return "";
  return lang === "en" ? tool.en : tool.zh;
}

export function platformLabel(id, lang) {
  const platform = platformById(id);
  if (!platform) return lang === "en" ? "No device" : "未选择";
  return lang === "en" ? platform.en : platform.zh;
}

export function riskById(id) {
  return RISK_LEVELS.find((level) => level.id === id) || null;
}

export function riskByRank(rank) {
  return RISK_LEVELS.find((level) => level.rank === rank) || null;
}

export function riskScale(id) {
  const level = riskById(id);
  if (!level) return null;
  return { rank: level.rank, of: RISK_LEVELS.length, id: level.id };
}

export function isFakeDemo(id) {
  const level = riskById(id);
  if (!level || level.fake !== true) return false;
  return level.lines.every((line) => line.zh.startsWith("[FAKE]") && line.en.startsWith("[FAKE]"));
}

export function auditCatalog() {
  const errors = [];
  const ids = new Set();
  for (const tool of TOOLS) {
    if (!STEP_ROWS[tool.id]) errors.push("missing-rows:" + tool.id);
    for (const platform of tool.platforms) {
      if (!PLATFORM_IDS.includes(platform)) errors.push("bad-platform:" + tool.id + ":" + platform);
      const steps = tool.steps[platform];
      if (!steps || steps.length < 3) errors.push("short:" + platform + ":" + tool.id);
      for (const step of steps || []) {
        if (ids.has(step.id)) errors.push("dup:" + step.id);
        ids.add(step.id);
        if (step.platform !== platform || step.toolId !== tool.id) errors.push("meta:" + step.id);
        if (!step.zh || !step.en || !step.pathZh || !step.pathEn) errors.push("i18n:" + step.id);
        if (/https?:/i.test(step.zh + step.en + step.pathZh + step.pathEn)) errors.push("url:" + step.id);
      }
    }
    for (const key of Object.keys(tool.steps)) {
      if (!tool.platforms.includes(key)) errors.push("extra:" + tool.id + ":" + key);
    }
  }
  if (RULES.length !== 5) errors.push("rules");
  if (EVENTS.length !== 3) errors.push("events");
  if (RISK_LEVELS.length !== 4) errors.push("risks");
  return errors;
}

function namesOf(ids, lang) {
  return ids.map((id) => toolLabel(id, lang)).filter(Boolean);
}

function stepLine(ok, step, lang) {
  const mark = ok ? "[x]" : "[ ]";
  return mark + " " + toolLabel(step.toolId, lang) + " · " + stepLabel(step, lang);
}

export function buildReport(input, lang) {
  const l = lang === "en" ? "en" : "zh";
  const src = input && typeof input === "object" ? input : {};
  const sel = normalizeSelection(src);
  const checklist = buildChecklist(sel);
  const parts = splitSteps(checklist, src.checkedIds);
  const prog = progress(checklist, src.checkedIds);
  const when = src.now ? String(src.now) : "";
  const toolNames = namesOf(sel.toolIds, l);
  const pending = parts.pending.map((step) => stepLine(false, step, l));
  const done = parts.done.map((step) => stepLine(true, step, l));
  const rules = RULES.map((rule, i) => (i + 1) + ". " + (l === "en" ? rule.en : rule.zh));
  const pendingText = prog.total === 0
    ? (l === "en" ? "(pick a device and at least one tool)" : "（先选设备，并勾选至少一个工具）")
    : pending.length
      ? pending.join("\n")
      : (l === "en" ? "(no open steps)" : "（没有未完成的步骤）");
  const doneText = done.length
    ? done.join("\n")
    : (l === "en" ? "(nothing checked yet)" : "（还没有勾选）");
  if (l === "en") {
    return [
      TITLE.en,
      PAGE_URL,
      "Time: " + (when || "—"),
      DISCLAIMER.en,
      "",
      "Device: " + platformLabel(sel.platform, "en"),
      "Tools: " + (toolNames.length ? toolNames.join(", ") : "none"),
      "Progress: " + prog.done + "/" + prog.total,
      "",
      "Still open",
      pendingText,
      "",
      "Checked",
      doneText,
      "",
      "5 rules for minimum permissions",
      rules.join("\n"),
      "",
      DEMO_NOTE.en,
      "",
    ].join("\n");
  }
  return [
    TITLE.zh,
    PAGE_URL,
    "时间：" + (when || "—"),
    DISCLAIMER.zh,
    "",
    "设备：" + platformLabel(sel.platform, "zh"),
    "工具：" + (toolNames.length ? toolNames.join("、") : "无"),
    "进度：" + prog.done + "/" + prog.total,
    "",
    "待办",
    pendingText,
    "",
    "已完成",
    doneText,
    "",
    "权限最小化 5 条铁律",
    rules.join("\n"),
    "",
    DEMO_NOTE.zh,
    "",
  ].join("\n");
}

export function buildShareText(input, lang) {
  const l = lang === "en" ? "en" : "zh";
  const src = input && typeof input === "object" ? input : {};
  const sel = normalizeSelection(src);
  const checklist = buildChecklist(sel);
  const prog = progress(checklist, src.checkedIds);
  const names = namesOf(sel.toolIds, l);
  const device = sel.platform ? platformLabel(sel.platform, l) : (l === "en" ? "no device" : "未选设备");
  const toolPart = names.length ? names.join(l === "en" ? ", " : "、") : (l === "en" ? "no tools" : "未选工具");
  if (l === "en") {
    return [
      TITLE.en,
      device + " · " + toolPart,
      prog.done + "/" + prog.total + " steps checked · " + prog.left + " still open",
      "Local only. Nothing is uploaded.",
      PAGE_URL,
    ].join("\n");
  }
  return [
    TITLE.zh,
    device + " · " + toolPart,
    "已核对 " + prog.done + "/" + prog.total + " 步 · 还剩 " + prog.left + " 步",
    "全程本地，零上传。",
    PAGE_URL,
  ].join("\n");
}
