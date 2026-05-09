# 🍼 ABDL Space v2

ABDL 群体社区网站 — 纸尿裤评价、排行与 AI 智能推荐平台。

**主题色：宝宝蓝 #A8D8F0 | 婴儿可爱风**

## ✨ 已实现功能

### v2 新增
| 功能 | 说明 |
|------|------|
| 📏 多尺码系统 | 每款纸尿裤支持多尺码，含腰围/臀围范围 |
| 💧 双吸收量 | 区分"厂家标称吸水量"和"成人实际可用吸水量" |
| 👶 婴儿款标注 | 婴儿纸尿裤自动标注警告，成人吸收量按50-60%折算 |
| 📖 Wiki 系统 | 产品详细评测Wiki，用户可提交编辑申请，管理员审批 |
| 📚 术语 Wiki | ABDL 圈内 16 个常用术语，支持搜索和管理员编辑 |
| 🎯 尺码匹配 | 输入臀围自动匹配推荐尺码 |

### v1 基础
| 功能 | 说明 |
|------|------|
| 👤 账户系统 | 注册/登录、个人资料管理、bcrypt 加密 |
| 📦 纸尿裤数据库 | 11 款中国市场真实产品（ABU/咔哆拉/万宝熊/尤妮佳/花王/大王） |
| ⭐ 评分系统 | 1-10 星评分，贝叶斯平均 + 威尔逊置信区间 + 管理员权重 |
| 🏆 排行榜 | 热门/最强吸收（成人实际吸收量）/最受关注 |
| 🤖 AI 推荐 | DeepSeek 流式推荐 |

### 默认管理员
| 用户名 | 密码 |
|--------|------|
| ZhX | ZhX&ZYongX_0311 |
| ZYongX | ZhX&ZYongX_0311 |

## 🚀 快速启动

```bash
cd ~/projects/abdl-space
npm start
# → http://localhost:3000
```

## 🛠 技术栈

- **后端**: Node.js + Express + sql.js (SQLite WASM)
- **前端**: React 18 + React Router + Vite
- **AI**: DeepSeek API

## 📁 项目结构

```
abdl-space/
├── server/
│   ├── index.js          # 主入口 + 种子数据
│   ├── db.js             # 数据库 v2（多尺码、双吸收量）
│   ├── middleware/auth.js # JWT 认证
│   └── routes/
│       ├── auth.js, diapers.js, ratings.js
│       ├── rankings.js   # 排行榜（成人吸收量排序）
│       ├── recommend.js  # AI 推荐（SSE）
│       ├── wiki.js       # 纸尿裤 Wiki（含编辑申请审批）
│       └── termwiki.js   # 术语 Wiki
├── client/
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx, DiaperDetail.jsx, Rankings.jsx
│       │   ├── Login.jsx, Register.jsx, Profile.jsx
│       │   ├── Recommendations.jsx, TermWiki.jsx
│       └── api.js        # API 封装 v2
├── package.json
└── README.md
```

## 🔑 环境变量

| 变量 | 必填 |
|------|------|
| `DEEPSEEK_API_KEY` | 推荐（AI 审核+推荐） |
| `JWT_SECRET` | 否 |
| `PORT` | 否（默认 3000） |

## 📦 产品数据库

当前收录 **11 款**中国市场纸尿裤产品：

| 品牌 | 产品数 | 类型 |
|------|--------|------|
| ABU (ABUniverse) | 2 | 成人ABDL纸尿裤 |
| 咔哆拉 (Kadola) | 2 | 大码婴儿拉拉裤/一体裤 ⚠️待补充详细信息 |
| 万宝熊 | 2 | 大码婴儿纸尿裤/拉拉裤 ⚠️待补充详细信息 |
| 尤妮佳 (Unicharm) | 2 | 婴儿纸尿裤（ABDL圈常用） |
| 花王 (Kao) | 1 | 婴儿纸尿裤（消委会5星评价） |
| 大王 (GOO.N) | 2 | 婴儿纸尿裤 |

> ⚠️ 标注"待补充"的品牌因公开信息有限，部分数据为合理推算。

## 📊 尺码标准

| 尺码 | 臀围范围 |
|------|----------|
| S | 80-95 cm |
| M | 95-110 cm |
| L | 110-125 cm |
| XL | 125-140 cm |
| XXL | 140-160 cm |
