# nihongo.ink 🇯🇵⌨️

专注的日语打字练习网站 — React 18 + Vite + TypeScript + Tailwind CSS，纯前端静态站点，可一键部署到 Vercel。

## 功能

- **文章打字练习**：52 篇 N5–N1 分级文章（40 篇原创短文 + 12 篇日本经典昔话：桃太郎、浦島太郎、かぐや姫等），一行原文一行输入逐字实时比对，汉字带假名注音（可开关），IME 变换未确认的假名不计错。完成后显示正确率、速度（字/分钟）、用时、错误次数。
- **单词练习**：4200 个 N5–N1 常用词汇（N5:700 / N4:800 / N3–N1:各900），两种模式（看意思打日语 / 看日语打意思），可按 JLPT 等级和五十音行筛选。
- **语法・敬语**：608 个 N5–N1 语法点（接续 + 中英讲解 + 注音例句 + 易错提示），另有 45 课敬语专项（入門 → 尊敬語 → 謙譲語 → 商务实践 → 误用警示）。
- **JLPT 刷题**：325 道 N5–N1 真题风格原创模拟题（每级 65 题），覆盖汉字读音、表记、文脉规定、近义替换、用法、文法形式、句子排序（★）、读解八种题型，每题附中/英文解析，按等级和部分筛选，本地记录各级正确率。
- **三语界面**：中文 / 日本語 / English，根据浏览器语言自动选择，可手动切换（记忆在 localStorage）。

## 本地运行

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 产物在 dist/
npm run preview    # 本地预览构建产物
```

## 部署到 Vercel

方式一（推荐，Git 集成）：

1. 把仓库推到 GitHub。
2. 在 [vercel.com](https://vercel.com) → Add New Project → 导入该仓库。
3. Vercel 会自动识别 Vite 项目（Build Command: `npm run build`，Output: `dist`），直接 Deploy 即可。

方式二（CLI）：

```bash
npm i -g vercel
vercel          # 首次部署，按提示操作
vercel --prod   # 生产部署
```

仓库中的 `vercel.json` 已配置 SPA 路由重写（所有路径回退到 `index.html`），刷新 `/practice/xxx` 等深层路由不会 404。

## 数据结构与扩展

### 文章 `src/data/articles/n5.json` … `n1.json`

```json
{
  "id": "n5-a1",
  "level": "N5",
  "title": "わたしの一日",
  "content": "わたしは毎朝六時に起きます。…"
}
```

- `content` 为连续的一段日文（不含换行），字数在列表页自动统计。
- 新增文章：往对应等级的 JSON 数组里追加对象即可（`id` 不要重复）；新增等级文件需在 `src/data/articles/index.ts` 中 import。

### 单词 `src/data/vocab/n5.json` … `n1.json`

```json
{
  "id": "n5-0001",
  "word": "学校",
  "reading": "がっこう",
  "meaning_zh": "学校",
  "meaning_en": "school",
  "level": "N5",
  "pos": "noun"
}
```

- `pos` 取值：`noun / verb / i-adj / na-adj / adv / particle / conj / pron / interj / expr / counter / prenoun / num`（界面按语言翻译显示）。
- `meaning_zh` / `meaning_en` 多义用 `；` / `; ` 分隔——「打意思」模式判定时任意一个义项即算对。
- 五十音行筛选按 `reading` 首假名自动归类（浊音/拗音归入清音行），无需额外字段。

## 目录结构

```
src/
├── main.tsx / App.tsx        # 入口与路由
├── i18n/                     # 中/日/英三语文案
├── types.ts                  # Level / Article / VocabWord 类型
├── data/
│   ├── articles/  n5~n1.json + index.ts
│   └── vocab/     n5~n1.json + index.ts
├── hooks/useTyping.ts        # IME 感知的打字判定核心逻辑
├── lib/kana.ts               # 五十音行归类、释义模糊匹配
├── components/               # Layout(语言切换) / LevelFilter / ResultModal
└── pages/                    # Home / Articles / Practice / Vocab
```

## 语音生成（可选，仅在修改文章后需要重跑）

站内音频是**预先合成的静态 MP3**，运行时不加载任何模型、不调用任何 API、也不需要服务器。

- 引擎：[VOICEVOX](https://voicevox.hiroshiba.jp/) ENGINE（本地 CPU 版），配音「四国めたん（ノーマル）」
- 授权：商用・非商用均可，条件是页面标注「VOICEVOX:四国めたん」——已写在页脚
- 产物：`public/audio/<article-id>.mp3`（52 篇，含逐句时间轴）与 `public/audio/kana/<romaji>.mp3`（102 个假名），合计约 20MB
- 时间轴记录在 `src/data/audio-manifest.json`，前端据此高亮正在朗读的句子

重新生成：

```bash
# 1) 启动 VOICEVOX ENGINE（仅生成时需要，生成完即可关闭）
cd voicevox/linux-cpu-x64 && ./run --host 127.0.0.1 --port 50021 --cpu_num_threads 8

# 2) 生成（已存在的文件会跳过；--force 强制重来）
python scripts/generate-audio.py --kana

# 常用参数
python scripts/generate-audio.py --only n5-a1      # 只重做某一篇
python scripts/generate-audio.py --speaker 16      # 换配音（九州そら）
python scripts/generate-audio.py --engine kokoro   # 换引擎（Kokoro，Apache-2.0 无需署名）
```

浏览器语音合成仍作为兜底：没有对应 MP3 的内容（如 4200 个单词）会自动改用系统语音朗读。
