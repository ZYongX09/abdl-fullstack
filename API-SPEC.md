# ABDL Space — API 需求规格说明

> 给 B 站点后端开发者的精确 API 清单。冗余不怕，模糊就是 bug。

---

## 一、已有 API（B 站点已实现）

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/me` | 当前用户信息 |
| GET | `/api/pages` | Wiki 页面列表 |
| GET | `/api/pages/:slug` | Wiki 页面详情 |

已有数据库表：`comments`、`ratings`

---

## 二、需要 B 站点新实现的 API

---

### P0 — 核心数据（项目没有这些跑不起来）

---

#### P0-1. 纸尿裤列表（带筛选/分页/排序）

- **优先级**：P0
- **方法**：`GET`
- **端点**：`/api/diapers`
- **鉴权**：否
- **功能**：获取纸尿裤列表，支持搜索、筛选、排序、分页。每条记录附带从 ratings 和 feelings 表实时计算的综合评分。
- **请求 query**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `search` | string | 否 | — | 模糊搜索 brand 和 model（不区分大小写） |
| `brand` | string | 否 | — | 精确筛选品牌名 |
| `size` | string | 否 | — | 筛选支持的尺码（如 `"M"`, `"XL"`，匹配 sizes 数组内任意 label） |
| `sort` | string | 否 | `"id"` | 排序字段：`"id"`, `"avg_score"`, `"rating_count"`, `"thickness"` |
| `order` | string | 否 | `"ASC"` | `"ASC"` 或 `"DESC"` |
| `page` | integer | 否 | `1` | 页码，从 1 开始，≥1 |
| `limit` | integer | 否 | `20` | 每页条数，1–100 |

- **响应 body（200）**：

```json
{
  "diapers": [
    {
      "id": 1,
      "brand": "ABU",
      "model": "Little Kings",
      "product_type": "纸尿裤",
      "thickness": 4,
      "absorbency_mfr": "7500ml",
      "absorbency_adult": "7500ml",
      "is_baby_diaper": 0,
      "comfort": 4.5,
      "popularity": 8,
      "material": "布感面料、四钩环魔术贴",
      "features": "日本风格印花…",
      "avg_price": "25-30元/片",
      "sizes": [
        { "label": "M", "waist_min": 79, "waist_max": 92, "hip_min": 95, "hip_max": 110 }
      ],
      "avg_score": 8.5,
      "rating_count": 23,
      "feeling_count": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 11,
    "totalPages": 1
  }
}
```

- **`avg_score` 计算规则**（重要！）：

  ```
  IF feeling_count > 0:
    avg_score = round( (rating_avg × 0.9 + feeling_avg × 0.1) , 1 )
  ELSE:
    avg_score = round( rating_avg , 1 )
  ```
  
  其中：
  - `rating_avg` = 该纸尿裤所有 ratings 记录的 6 个维度（`absorption_score`, `fit_score`, `comfort_score`, `thickness_score`, `appearance_score`, `value_score`）的平均值的均值，范围 **0–10**
  - `feeling_avg` = 该纸尿裤所有 feelings 记录的 5 个维度（`looseness`, `softness`, `dryness`, `odor_control`, `quietness`）分两步：
    1. 每个 feeling 记录取有效维度均值（null 的维度跳过），将 -5..5 映射到 0..10：`(score + 5)×10/10 = score+5`
    2. 所有记录的得分取均值，范围 **0–10**

- **错误**：
  - 400：`sort` 值不合法
  - 400：`page` < 1 或 `limit` 不在 1–100 范围

---

#### P0-2. 纸尿裤详情

- **优先级**：P0
- **方法**：`GET`
- **端点**：`/api/diapers/:id`
- **鉴权**：否
- **功能**：返回单款纸尿裤的完整信息 + 所有评分记录 + 所有使用感受 + Wiki（如果该纸尿裤有绑定的 Wiki 页面）
- **请求**：路径参数 `id`（integer, >0）
- **响应（200）**：

```json
{
  "diaper": {
    "id": 1,
    "brand": "ABU",
    "model": "Little Kings",
    "product_type": "纸尿裤",
    "thickness": 4,
    "absorbency_mfr": "7500ml",
    "absorbency_adult": "7500ml",
    "is_baby_diaper": 0,
    "comfort": 4.5,
    "popularity": 8,
    "material": "布感面料…",
    "features": "日本风格印花…",
    "avg_price": "25-30元/片",
    "sizes": [ /* 同上 */ ],
    "avg_score": 8.5,
    "rating_count": 23,
    "feeling_count": 5
  },
  "reviews": [
    {
      "id": 101,
      "user_id": 1,
      "username": "ZhX",
      "role": "admin",
      "diaper_id": 1,
      "absorption_score": 9,
      "fit_score": 8,
      "comfort_score": 9,
      "thickness_score": 7,
      "appearance_score": 10,
      "value_score": 8,
      "review": "非常舒服，吸水很强",
      "review_status": "approved",
      "created_at": "2026-05-01T12:00:00Z"
    }
  ],
  "wiki": {
    "diaper_id": 1,
    "category": "纸尿裤/ABU",
    "title": "Little Kings",
    "content": "ABU 的旗舰产品…",
    "updated_at": "2026-05-01T00:00:00Z"
  }
}
```

- **`reviews` 排序**：按 `created_at` 降序
- **`wiki`**：如果该纸尿裤没有绑定 Wiki 页面，返回 `null`
- **错误**：
  - 404：纸尿裤不存在

---

#### P0-3. 纸尿裤品牌列表 & 尺码列表

- **优先级**：P0
- **方法**：`GET`
- **端点**：`/api/diapers/brands` 和 `/api/diapers/sizes`
- **鉴权**：否
- **功能**：返回去重后的品牌列表、尺码标签列表（用于筛选器下拉）
- **响应**：

```json
// GET /api/diapers/brands → 200
{ "brands": ["ABU", "咔哆拉", "万宝熊", "尤妮佳", "花王", "大王"] }

// GET /api/diapers/sizes → 200
{ "sizes": ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL"] }
```

---

#### P0-4. 创建评分

- **优先级**：P0
- **方法**：`POST`
- **端点**：`/api/ratings`
- **鉴权**：是
- **功能**：为某款纸尿裤评分（每人每款只能评一次）
- **请求 body**：

```json
{
  "diaper_id": 1,
  "absorption_score": 9,
  "fit_score": 8,
  "comfort_score": 9,
  "thickness_score": 7,
  "appearance_score": 10,
  "value_score": 8,
  "review": "非常舒服，吸水很强"
}
```

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `diaper_id` | integer | 是 | 纸尿裤 id，必须存在 |
| `absorption_score` | integer | 是 | **1–10** |
| `fit_score` | integer | 是 | **1–10** |
| `comfort_score` | integer | 是 | **1–10** |
| `thickness_score` | integer | 是 | **1–10** |
| `appearance_score` | integer | 是 | **1–10** |
| `value_score` | integer | 是 | **1–10** |
| `review` | string | 否 | 文字评价，最大 **500 字符** |

- **响应（200）**：
```json
{
  "message": "评分成功",
  "review_status": "approved",
  "id": 101
}
```

- **错误**：
  - 400：任一 score 不在 1–10 范围
  - 400：review 超过 500 字符
  - 404：diaper_id 不存在
  - 409：该用户已对该纸尿裤评过分

---

#### P0-5. 获取某纸尿裤的评分列表 + 统计

- **优先级**：P0
- **方法**：`GET`
- **端点**：`/api/diapers/:id/ratings`
- **鉴权**：否
- **响应（200）**：

```json
{
  "reviews": [
    {
      "id": 101,
      "user_id": 1,
      "username": "ZhX",
      "role": "admin",
      "diaper_id": 1,
      "absorption_score": 9,
      "fit_score": 8,
      "comfort_score": 9,
      "thickness_score": 7,
      "appearance_score": 10,
      "value_score": 8,
      "review": "…",
      "review_status": "approved",
      "created_at": "2026-05-01T12:00:00Z"
    }
  ],
  "stats": {
    "composite": 8.5,
    "count": 23,
    "dimensions": {
      "absorption_score": { "avg": 8.2, "count": 23 },
      "fit_score": { "avg": 7.8, "count": 23 },
      "comfort_score": { "avg": 8.5, "count": 23 },
      "thickness_score": { "avg": 7.0, "count": 23 },
      "appearance_score": { "avg": 8.9, "count": 23 },
      "value_score": { "avg": 7.6, "count": 23 }
    }
  }
}
```

- `composite` = 6 个维度 avg 的平均值，保留 1 位小数
- `reviews` 按 `created_at` 降序

---

#### P0-6. 获取当前用户对某纸尿裤的评分

- **优先级**：P0
- **方法**：`GET`
- **端点**：`/api/ratings/me/:diaperId`
- **鉴权**：是
- **响应（200）**：
```json
{
  "rating": {
    "id": 101,
    "user_id": 1,
    "diaper_id": 1,
    "absorption_score": 9,
    "fit_score": 8,
    "comfort_score": 9,
    "thickness_score": 7,
    "appearance_score": 10,
    "value_score": 8,
    "review": "…",
    "review_status": "approved",
    "created_at": "2026-05-01T12:00:00Z"
  }
}
```
- 如果没评过：`{ "rating": null }`

---

#### P0-7. 删除评分

- **优先级**：P0
- **方法**：`DELETE`
- **端点**：`/api/ratings/:id`
- **鉴权**：是
- **权限**：只能删除自己的评分（管理员可以删任意）
- **响应（200）**：`{ "message": "删除成功" }`
- **错误**：404（不存在）、403（无权删除）

---

#### P0-8. 排行榜

- **优先级**：P0
- **方法**：`GET`
- **端点**：`/api/rankings`
- **鉴权**：否
- **功能**：返回不同类型的排行榜
- **请求 query**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | `"hot"`, `"absorbency"`, `"popular"`, `"dimension"` |
| `dimension` | string | 否 | 当 type=`"dimension"` 时必填：`"absorption_score"`, `"fit_score"`, `"comfort_score"`, `"thickness_score"`, `"appearance_score"`, `"value_score"` |
| `limit` | integer | 否 | 默认 20，最大 50 |

- **各 type 排序规则**：
  - `hot`：按 `avg_score` 降序
  - `absorbency`：按 `absorbency_adult`（尝试提取 mL 数值，数值越大排越前）
  - `popular`：按 `rating_count` 降序
  - `dimension`：按指定维度的所有评分均值降序

- **响应（200）**：
```json
{
  "rankings": [
    {
      "id": 1,
      "brand": "ABU",
      "model": "Little Kings",
      "avg_score": 8.5,
      "rating_count": 23,
      "thickness": 4,
      "absorbency_adult": "7500ml"
    }
  ],
  "type": "hot",
  "cached": false
}
```

- **错误**：
  - 400：`type` 不在可选值内
  - 400：`type="dimension"` 但未传 `dimension` 参数

---

#### P0-9. 论坛帖子列表

- **优先级**：P0
- **方法**：`GET`
- **端点**：`/api/posts`
- **鉴权**：否
- **请求 query**：

| 字段 | 类型 | 必填 |
|------|------|------|
| `page` | integer | 否，默认 1 |
| `limit` | integer | 否，默认 20，≤100 |
| `search` | string | 否，搜索 content 字段 |

- **响应（200）**：
```json
{
  "posts": [
    {
      "id": 1,
      "user_id": 1,
      "user": { "id": 1, "username": "ZhX", "role": "admin" },
      "content": "今天试了 Little Kings，吸水量惊人！",
      "diaper_id": 1,
      "pinned": false,
      "like_count": 5,
      "has_liked": true,
      "comment_count": 3,
      "created_at": "2026-05-09T12:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

- **排序规则**：
  - 置顶帖（`pinned=true`）优先
  - 然后按 `created_at` 降序

- **`has_liked`**：如果请求带认证头（已登录），返回当前用户是否赞过该帖；否则返回 false

---

#### P0-10. 帖子详情（含评论）

- **优先级**：P0
- **方法**：`GET`
- **端点**：`/api/posts/:id`
- **鉴权**：否
- **响应（200）**：
```json
{
  "post": {
    "id": 1,
    "user_id": 1,
    "user": { "id": 1, "username": "ZhX", "role": "admin" },
    "content": "…",
    "diaper_id": 1,
    "pinned": false,
    "like_count": 5,
    "has_liked": true,
    "comment_count": 3,
    "created_at": "…"
  },
  "comments": [
    {
      "id": 1,
      "post_id": 1,
      "user_id": 2,
      "username": "userB",
      "parent_id": null,
      "content": "同感！",
      "like_count": 0,
      "has_liked": false,
      "created_at": "…"
    }
  ]
}
```

- **`comments` 排序**：按 `created_at` 升序（先旧后新，方便阅读对话）
- **`parent_id`**：null 表示顶级评论；非 null 表示回复某评论（嵌套评论只支持一层即可）
- **错误**：404（帖子不存在）

---

#### P0-11. 创建帖子

- **优先级**：P0
- **方法**：`POST`
- **端点**：`/api/posts`
- **鉴权**：是
- **请求 body**：
```json
{
  "content": "帖子内容（必填）",
  "diaper_id": 1
}
```

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `content` | string | 是 | 最大 **5000 字符**，不能纯空格 |
| `diaper_id` | integer | 否 | 关联的纸尿裤 id（可选） |

- **响应（201）**：
```json
{ "id": 1, "message": "发布成功" }
```

- **错误**：
  - 400：content 为空或超限

---

#### P0-12. 删除帖子

- **优先级**：P0
- **方法**：`DELETE`
- **端点**：`/api/posts/:id`
- **鉴权**：是
- **权限**：只能删除自己的（管理员可删任意）
- **响应（200）**：`{ "message": "已删除" }`
- **错误**：404、403

---

#### P0-13. 发表评论

- **优先级**：P0
- **方法**：`POST`
- **端点**：`/api/posts/:id/comments`
- **鉴权**：是
- **请求 body**：
```json
{
  "content": "评论内容",
  "parent_id": null
}
```

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `content` | string | 是 | 最大 **2000 字符** |
| `parent_id` | integer | 否 | 回复的评论 id（null 表示顶级评论） |

- **响应（201）**：`{ "message": "评论成功", "id": 1 }`
- **错误**：
  - 404：帖子不存在
  - 400：content 为空或超限
  - 400：parent_id 指向不存在的评论或不属于同一帖子的评论

---

#### P0-14. 点赞/取消点赞

- **优先级**：P0
- **方法**：`POST`
- **端点**：`/api/likes`
- **鉴权**：是
- **功能**：点赞 or 再次调用取消点赞（toggle）
- **请求 body**：
```json
{
  "target_type": "post",
  "target_id": 1
}
```

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `target_type` | string | 是 | `"post"` 或 `"comment"` |
| `target_id` | integer | 是 | 帖子或评论的 id，必须存在 |

- **响应（200）**：
```json
{ "liked": true }
```
  - `liked: true` = 已点赞
  - `liked: false` = 已取消点赞

- **错误**：
  - 404：target 不存在
  - 400：target_type 不合法

---

### P1 — 重要功能（没有的话功能不完整）

---

#### P1-1. 使用感受（Feelings）— 创建/获取/我的/删除

四个接口，都是 P1：

| 端点 | 方法 | 鉴权 | 说明 |
|------|------|------|------|
| `/api/feelings` | `POST` | 是 | 创建感受记录 |
| `/api/diapers/:id/feelings` | `GET` | 否 | 获取某纸尿裤的所有感受 |
| `/api/feelings/me/:diaperId/:size` | `GET` | 是 | 获取当前用户对某纸尿裤+某尺码的感受 |
| `/api/feelings/:id` | `DELETE` | 是 | 删除感受（自己 or 管理员） |

**创建感受 POST /api/feelings**：

```json
{
  "diaper_id": 1,
  "size": "M",
  "looseness": -2,
  "softness": 4,
  "dryness": 3,
  "odor_control": 1,
  "quietness": -1
}
```

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `diaper_id` | integer | 是 | |
| `size` | string | 是 | 尺码标签，如 `"M"`, `"XL"` |
| `looseness` | integer | 是 | **-5 到 5**，负数=太紧，0=刚好，正数=太松 |
| `softness` | integer | 是 | **-5 到 5**，负数=粗糙，正数=柔软 |
| `dryness` | integer | 是 | **-5 到 5**，负数=潮湿，正数=干爽 |
| `odor_control` | integer | 是 | **-5 到 5**，负数=异味明显，正数=锁味好 |
| `quietness` | integer | 是 | **-5 到 5**，负数=沙沙声大，正数=静音 |

- **唯一性约束**：同一用户对同一 diapr_id + 同一 size 只能创建一条感受。如果已存在，返回 409。

**获取感受 GET /api/diapers/:id/feelings**：

```json
{
  "feelings": [
    {
      "id": 1,
      "user_id": 1,
      "username": "ZhX",
      "diaper_id": 1,
      "size": "M",
      "looseness": -2,
      "softness": 4,
      "dryness": 3,
      "odor_control": 1,
      "quietness": -1,
      "created_at": "…"
    }
  ],
  "stats": {
    "looseness": -1.5,
    "softness": 3.2,
    "dryness": 2.6,
    "odor_control": 0.8,
    "quietness": -0.3
  },
  "count": 12
}
```

- `stats` 每个维度是所有记录的该维度均值（跳过 null），保留 1 位小数
- `feelings` 按 `created_at` 降序

**获取我的感受 GET /api/feelings/me/:diaperId/:size**：
```json
{ "feeling": { /* 同上 */ } }
```
- 如无记录：`{ "feeling": null }`

---

#### P1-2. 用户信息（公开 + 自改 + 查他人）

| 端点 | 方法 | 鉴权 | 说明 |
|------|------|------|------|
| `/api/users/:id` | `GET` | 否 | 获取某用户公开信息 |
| `/api/users/me` | `PATCH` | 是 | 修改当前用户个人信息 |

**PATCH /api/users/me** — 修改个人信息：

```json
{
  "avatar": "https://…",
  "age": 25,
  "region": "北京",
  "weight": 65.0,
  "waist": 75.0,
  "hip": 95.0,
  "style_preference": "日系",
  "bio": "个人简介"
}
```

| 字段 | 类型 | 约束 |
|------|------|------|
| `avatar` | string/null | URL，最长 2048 |
| `age` | integer/null | 1–150 |
| `region` | string/null | 最长 50 |
| `weight` | number/null | 单位 kg，>0，≤500，保留 1 位小数 |
| `waist` | number/null | 单位 cm，>0，≤300，保留 1 位小数 |
| `hip` | number/null | 单位 cm，>0，≤300，保留 1 位小数 |
| `style_preference` | string/null | 最长 100 |
| `bio` | string/null | 最长 500 |

- 所有字段均可选（未传的不修改）
- **响应（200）**：`{ "user": { /* 完整用户对象，无 password */ } }`

**GET /api/users/:id** — 获取用户公开信息：
```json
{
  "user": {
    "id": 1,
    "username": "ZhX",
    "role": "admin",
    "avatar": "https://…",
    "age": 25,
    "region": "北京",
    "weight": 65.0,
    "waist": 75.0,
    "hip": 95.0,
    "style_preference": "日系",
    "bio": "个人简介",
    "created_at": "2026-05-01T00:00:00Z"
  }
}
```

- **绝对不返回** `password` 字段
- 用户不存在返回 404

---

#### P1-3. 用户等级/经验值

- **优先级**：P1
- **方法**：`GET`
- **端点**：`/api/users/:id/level`
- **鉴权**：否
- **功能**：返回用户的经验值和等级

- **经验值获取规则**：
  - 发表评分：+10 exp
  - 发表感受：+5 exp
  - 发表帖子：+15 exp
  - 发表评论：+3 exp
  - 收到点赞（被点赞）：+1 exp（每条最多计 1 次）

- **等级表**（固定）：

| 等级 | 所需累计经验 | 徽章名称 | 徽章图标 |
|------|------------|---------|---------|
| 1 | 0 | 婴儿奶瓶 | 🍼 |
| 2 | 100 | 安抚奶嘴 | 👶 |
| 3 | 300 | 婴儿围兜 | 🧣 |
| 4 | 600 | 毛绒玩偶 | 🧸 |
| 5 | 1000 | 学步车 | 🦽 |
| 6 | 1500 | 小童床 | 🛏️ |
| 7 | 2100 | 儿童王座 | 👑 |

- **响应（200）**：
```json
{
  "level": {
    "level": 2,
    "exp": 150,
    "total_exp": 150,
    "badge_name": "安抚奶嘴",
    "badge_icon": "👶",
    "next_level": 3,
    "next_exp_required": 300,
    "progress": 25
  }
}
```
- `progress = (exp / next_exp_required) × 100`，保留整数

---

#### P1-4. 术语百科（TermWiki）

**四个操作**：

| 端点 | 方法 | 鉴权 | 说明 |
|------|------|------|------|
| `/api/terms` | `GET` | 否 | 术语列表 |
| `/api/terms` | `POST` | 管理员 | 创建术语 |
| `/api/terms/:id` | `PATCH` | 管理员 | 编辑术语 |
| `/api/terms/:id` | `DELETE` | 管理员 | 删除术语 |
| `/api/terms/categories` | `GET` | 否 | 获取去重后的分类列表 |

**GET /api/terms** 请求 query：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `search` | string | 否 | 模糊搜索 term 和 definition |
| `category` | string | 否 | 精确筛选分类 |

响应：
```json
{
  "terms": [
    {
      "id": 1,
      "term": "ABDL",
      "abbreviation": "Adult Baby / Diaper Lover",
      "definition": "成人宝宝/纸尿裤爱好者群体的统称…",
      "category": "基本概念",
      "created_by": 1,
      "created_at": "…"
    }
  ]
}
```

**POST /api/terms** 请求 body：
```json
{ "term": "新术语", "abbreviation": "缩写（可选）", "definition": "释义", "category": "分类" }
```

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `term` | string | 是 | 1–50 字符 |
| `abbreviation` | string | 否 | 最长 100 |
| `definition` | string | 是 | 10–2000 字符 |
| `category` | string | 否 | 最长 30 |

---

#### P1-5. AI 推荐

- **优先级**：P1
- **方法**：`POST`
- **端点**：`/api/recommend`
- **鉴权**：是
- **功能**：根据当前用户信息和纸尿裤数据库，返回 3–5 款推荐。这是 B 端自行调用 AI 模型（如 DeepSeek）生成结果后返回。
- **请求 body**：

```json
{
  "selected": {
    "basic": true,
    "body": true,
    "prefs": true,
    "bio": true,
    "feelings": true
  }
}
```

`selected` 的 5 个 bool 字段表示用户授权了哪些数据可以用于推荐：
- `basic`：年龄、地区
- `body`：体重、腰围、臀围
- `prefs`：偏好款式（`style_preference`）
- `bio`：个人简介
- `feelings`：使用感受历史

- **响应（200）**：
```json
{
  "recommendations": [
    {
      "diaper_id": 1,
      "brand": "ABU",
      "model": "Little Kings",
      "reason": "吸水量极高，适合臀围 95cm 以上用户，夜用首选",
      "matchScore": 92
    }
  ],
  "summary": "根据您的身材数据和偏好，推荐以上 4 款纸尿裤"
}
```

- `matchScore`：1–100 整数，越高越匹配
- 推荐 3–5 条
- **B 端自行处理**：根据 selected 字段从用户表获取相应数据 → 拼接 prompt → 调用 AI → 解析 JSON → 返回

---

#### P1-6. 纸尿裤对比

- **优先级**：P1
- **方法**：`GET`
- **端点**：`/api/diapers/compare`
- **鉴权**：否
- **功能**：传入多个 id，返回每款的详细对比数据（含评分维度均值）
- **请求 query**：`ids=1,2,3`（逗号分隔的 id，最多 5 个）

- **响应（200）**：
```json
{
  "diapers": [
    {
      "id": 1,
      "brand": "ABU",
      "model": "Little Kings",
      "thickness": 4,
      "absorbency_adult": "7500ml",
      "avg_price": "25-30元/片",
      "sizes": [{ "label": "M", "waist_min": 79, "waist_max": 92, "hip_min": 95, "hip_max": 110 }],
      "dimensions": {
        "absorption_score": { "weighted": 8.2 },
        "fit_score": { "weighted": 7.8 },
        "comfort_score": { "weighted": 8.5 },
        "thickness_score": { "weighted": 7.0 },
        "appearance_score": { "weighted": 8.9 },
        "value_score": { "weighted": 7.6 }
      },
      "avg_score": 8.5,
      "rating_count": 23
    }
  ]
}
```

- 不存在 id 直接跳过（不报 404）
- `ids` 最多 5 个，超过截断

---

#### P1-7. "猜你喜欢" 推荐

- **优先级**：P1
- **方法**：`GET`
- **端点**：`/api/recommend/guess`
- **鉴权**：否
- **功能**：首页"猜你喜欢"模块，纯基于评分数据，不涉及 AI
- **规则**：取 avg_score 最高的 5 款，每款附带推荐理由
  - avg_score ≥ 8.0："综合评分超高，社区力荐"
  - thickness ≤ 2："超薄设计，适合日常穿着"
  - 其他："热门之选"

- **响应（200）**：
```json
{
  "recommendations": [
    {
      "id": 1,
      "brand": "ABU",
      "model": "Little Kings",
      "avg_score": 8.5,
      "rating_count": 23,
      "thickness": 4,
      "reason": "综合评分超高，社区力荐"
    }
  ]
}
```

---

### P2 — 锦上添花（增强体验）

---

#### P2-1. 通知

| 端点 | 方法 | 鉴权 | 说明 |
|------|------|------|------|
| `/api/notifications` | `GET` | 是 | 当前用户的通知列表 |
| `/api/notifications/read-all` | `POST` | 是 | 全部标记已读 |

**GET /api/notifications 响应**：
```json
{
  "notifications": [
    {
      "id": 1,
      "type": "like",
      "message": "ZhX 赞了你的帖子",
      "related_id": 1,
      "read": false,
      "created_at": "…"
    }
  ],
  "unread_count": 3
}
```

- **通知触发事件**：
  - 帖子被点赞：`type: "like"`
  - 帖子被评论：`type: "comment"`
  - 评论被回复：`type: "reply"`

---

#### P2-2. 论坛个人历史

| 端点 | 方法 | 鉴权 | 说明 |
|------|------|------|------|
| `/api/users/:id/posts` | `GET` | 否 | 用户发的帖子 |
| `/api/users/:id/ratings` | `GET` | 否 | 用户的所有评分 |
| `/api/users/:id/feelings` | `GET` | 否 | 用户的所有感受 |

**响应**：
```json
// GET /api/users/:id/ratings → 200
{ "reviews": [ /* 评分对象数组 */ ] }

// GET /api/users/:id/feelings → 200
{ "feelings": [ /* 感受对象数组，按 created_at 降序 */ ] }
```

---

#### P2-3. 管理员面板

所有管理员接口需要 `role === 'admin'`。

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/admin/stats` | `GET` | 站点统计 |
| `/api/admin/users` | `GET` | 用户列表 |
| `/api/admin/users/:id` | `DELETE` | 删除用户 |
| `/api/admin/users/:id/ban` | `POST` | 封禁/解封 |
| `/api/admin/posts/:id/pin` | `POST` | 置顶/取消置顶 |
| `/api/admin/posts/:id` | `DELETE` | 删除帖子 |
| `/api/admin/comments/:id` | `DELETE` | 删除评论 |
| `/api/admin/diapers/:id` | `DELETE` | 删除纸尿裤 |

**GET /api/admin/stats 响应**：
```json
{ "users": 120, "posts": 340, "comments": 890, "diapers": 11, "ratings": 450 }
```

**POST /api/admin/users/:id/ban**（toggle）：
- 请求 body：`{}`
- 响应当前 ban 状态：`{ "banned": true }`

---

## 三、纸尿裤数据表（diapers 表结构）

B 站点需要创建这张表，目前的 11 条数据在此文件中作为种子数据导入：
```
https://github.com/ZYongX09/abdl/blob/master/client/public/data/diapers.json
```

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | integer | PK, auto | |
| `brand` | string | NOT NULL, ≤50 | 品牌 |
| `model` | string | NOT NULL, ≤100 | 型号 |
| `product_type` | string | NOT NULL, ≤20 | "纸尿裤"/"拉拉裤"/"一体裤" |
| `thickness` | integer | NOT NULL, 1–5 | 厚度等级 |
| `absorbency_mfr` | string | NOT NULL, ≤50 | 厂家标称吸水量 |
| `absorbency_adult` | string | NOT NULL, ≤50 | 成人实际估算吸水量 |
| `is_baby_diaper` | integer | NOT NULL, 0/1 | 是否婴儿尿裤 |
| `comfort` | float | 1.0–5.0 | 先天舒适度评级 |
| `popularity` | integer | 1–10 | 社区热度 |
| `material` | string | NOT NULL, ≤500 | 材质描述 |
| `features` | string | NOT NULL, ≤1000 | 特性描述 |
| `avg_price` | string | NOT NULL, ≤50 | 均价描述 |
| `created_at` | timestamp | DEFAULT NOW() | |

**尺码（sizes）— 独立子表**：

| 字段 | 类型 | 约束 |
|------|------|------|
| `id` | integer | PK, auto |
| `diaper_id` | integer | FK → diapers.id, ON DELETE CASCADE |
| `label` | string | NOT NULL, ≤10 |
| `waist_min` | integer | NOT NULL, ≥0, 单位 cm |
| `waist_max` | integer | NOT NULL, 单位 cm |
| `hip_min` | integer | NOT NULL, ≥0, 单位 cm |
| `hip_max` | integer | NOT NULL, 单位 cm |

UNIQUE(diaper_id, label)

---

## 四、用户表（users 表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | integer | PK, auto | |
| `username` | string | UNIQUE, NOT NULL, 3–30 | |
| `password` | string | NOT NULL | hash 存储，API 绝对不返回 |
| `role` | string | NOT NULL, "user"/"admin" | |
| `avatar` | string | NULLABLE, ≤2048 | |
| `age` | integer | NULLABLE, 1–150 | |
| `region` | string | NULLABLE, ≤50 | |
| `weight` | float | NULLABLE | 单位 kg |
| `waist` | float | NULLABLE | 单位 cm |
| `hip` | float | NULLABLE | 单位 cm |
| `style_preference` | string | NULLABLE, ≤100 | |
| `bio` | string | NULLABLE, ≤500 | |
| `created_at` | timestamp | NOT NULL | |

---

## 五、评分表（ratings 表）

| 字段 | 类型 | 约束 |
|------|------|------|
| `id` | integer | PK, auto |
| `user_id` | integer | FK → users.id |
| `diaper_id` | integer | FK → diapers.id |
| `absorption_score` | integer | NOT NULL, **1–10** |
| `fit_score` | integer | NOT NULL, **1–10** |
| `comfort_score` | integer | NOT NULL, **1–10** |
| `thickness_score` | integer | NOT NULL, **1–10** |
| `appearance_score` | integer | NOT NULL, **1–10** |
| `value_score` | integer | NOT NULL, **1–10** |
| `review` | string | NULLABLE, ≤500 |
| `review_status` | string | NOT NULL, 默认 "approved" |
| `created_at` | timestamp | NOT NULL |

UNIQUE(user_id, diaper_id)

---

## 六、感受表（feelings 表）

| 字段 | 类型 | 约束 |
|------|------|------|
| `id` | integer | PK, auto |
| `user_id` | integer | FK → users.id |
| `diaper_id` | integer | FK → diapers.id |
| `size` | string | NOT NULL, ≤10 |
| `looseness` | integer | NOT NULL, **-5 到 5** |
| `softness` | integer | NOT NULL, **-5 到 5** |
| `dryness` | integer | NOT NULL, **-5 到 5** |
| `odor_control` | integer | NOT NULL, **-5 到 5** |
| `quietness` | integer | NOT NULL, **-5 到 5** |
| `created_at` | timestamp | NOT NULL |

UNIQUE(user_id, diaper_id, size)

---

## 七、其他表

### posts（论坛帖子）

| 字段 | 类型 |
|------|------|
| `id` | integer PK |
| `user_id` | integer FK |
| `content` | text, ≤5000 |
| `diaper_id` | integer FK, nullable |
| `pinned` | boolean, 默认 false |
| `created_at` | timestamp |

### likes（点赞）

| 字段 | 类型 |
|------|------|
| `user_id` | integer FK |
| `target_type` | enum("post","comment") |
| `target_id` | integer |
| `created_at` | timestamp |

UNIQUE(user_id, target_type, target_id)

### comments（评论）— B 站点已有，补充字段说明

| 字段 | 类型 | 备注 |
|------|------|------|
| `id` | integer PK | |
| `post_id` | integer FK | |
| `user_id` | integer FK | |
| `parent_id` | integer nullable | FK→comments.id |
| `content` | text, ≤2000 | |
| `created_at` | timestamp | |

### terms（术语百科）

| 字段 | 类型 |
|------|------|
| `id` | integer PK |
| `term` | string, ≤50 |
| `abbreviation` | string nullable, ≤100 |
| `definition` | text, ≤2000 |
| `category` | string nullable, ≤30 |
| `created_by` | integer FK |
| `created_at` | timestamp |

### experience（经验值）

| 字段 | 类型 |
|------|------|
| `id` | integer PK |
| `user_id` | integer FK UNIQUE |
| `current_exp` | integer, ≥0 |
| `total_exp` | integer, ≥0 |
| `current_level` | integer, 1–7 |

### wiki_pages（纸尿裤 Wiki 绑定）

| 字段 | 类型 | 约束 |
|------|------|------|
| `diaper_id` | integer PK | FK→diapers, 一对一 |
| `title` | string | |
| `content` | text | |
| `updated_at` | timestamp | |

B 站点已有的 `/api/pages` 和 `/api/pages/:slug` 如果是通用 Wiki 系统，本项目的纸尿裤 Wiki 可以用单独表或复用（以 `diaper_id` 关联）。

### notifications（通知）

| 字段 | 类型 |
|------|------|
| `id` | integer PK |
| `user_id` | integer FK |
| `type` | enum("like","comment","reply") |
| `message` | string |
| `related_id` | integer |
| `read` | boolean, 默认 false |
| `created_at` | timestamp |

---

## 八、优先级总结

| 优先级 | API | 端点示例 |
|--------|-----|---------|
| **P0** | 纸尿裤列表/详情/品牌/尺码 | `GET /api/diapers` |
| **P0** | 评分（增/查/删/我的） | `POST /api/ratings` |
| **P0** | 排行榜 | `GET /api/rankings` |
| **P0** | 论坛（帖子列表/详情/创建/删除） | `GET /api/posts` |
| **P0** | 评论（发表） | `POST /api/posts/:id/comments` |
| **P0** | 点赞 | `POST /api/likes` |
| **P1** | 使用感受（Feelings CRUD） | `POST /api/feelings` |
| **P1** | 用户详情/修改 | `GET /api/users/:id` |
| **P1** | 等级/经验值 | `GET /api/users/:id/level` |
| **P1** | 术语百科 CRUD | `GET/POST /api/terms` |
| **P1** | AI 推荐 | `POST /api/recommend` |
| **P1** | 纸尿裤对比 | `GET /api/diapers/compare` |
| **P1** | 猜你喜欢 | `GET /api/recommend/guess` |
| **P2** | 通知（列表/已读） | `GET /api/notifications` |
| **P2** | 用户帖/评分/感受历史 | `GET /api/users/:id/posts` |
| **P2** | 管理员面板 | `GET /api/admin/stats` |
