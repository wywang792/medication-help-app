# Token 管理系统说明

## 概述

为了能够主动控制用户的登录态，我们对 JWT token 系统进行了升级，增加了数据库层面的 token 管理功能。

## 主要改动

### 1. 新增数据库表：`user_tokens`

存储所有有效的 token 信息：

- `user_id`: 用户 ID
- `token`: JWT token 字符串
- `createTime`: 创建时间
- `expireTime`: 过期时间
- `device`: 设备信息（可选）
- `status`: 状态（active/revoked）

### 2. 修改 auth 模块 (`common/auth/index.js`)

auth 模块内部创建了数据库实例，无需外部传入。

#### 修改的方法：

- **`generateToken(userInfo, device)`**: 现在会将生成的 token 保存到数据库
- **`verifyToken(token)`**: **先查询数据库**确认 token 是否存在，再验证 JWT 有效性（这样可以强制让旧 token 失效）
- **`authenticate(event)`**: 调用 verifyToken 进行认证

#### 新增的方法：

- **`revokeToken(token)`**: 撤销指定的 token
- **`revokeAllUserTokens(userId)`**: 撤销指定用户的所有 token（强制登出）
- **`cleanExpiredTokens()`**: 清理过期的 token 记录

### 3. 更新所有云函数

所有使用 `authenticate` 和 `generateToken` 的云函数都已更新，无需传入数据库实例。

### 4. 新增云函数：`revokeUserToken`

专门用于管理 token 的云函数，支持以下操作：

## 使用方法

### 用户登出（撤销自己的 token）

```javascript
uniCloud.callFunction({
  name: "revokeUserToken",
  data: {
    action: "revokeSelf",
    token: "当前用户的token",
  },
});
```

### 管理员撤销指定用户的所有 token（强制用户登出）

```javascript
uniCloud.callFunction({
  name: "revokeUserToken",
  data: {
    action: "revokeAllUserTokens",
    userId: "要撤销的用户ID",
    token: "管理员的token",
  },
});
```

### 管理员撤销指定的 token

```javascript
uniCloud.callFunction({
  name: "revokeUserToken",
  data: {
    action: "revokeToken",
    token: "管理员的token",
    targetToken: "要撤销的token",
  },
});
```

### 清理过期的 token（定时任务）

```javascript
uniCloud.callFunction({
  name: "revokeUserToken",
  data: {
    action: "cleanExpired",
  },
});
```

## 使用场景

1. **用户主动登出**：用户点击登出按钮时，调用 `revokeSelf` 撤销当前 token
2. **密码修改后强制重新登录**：修改密码后，撤销该用户的所有 token
3. **账号异常处理**：发现账号异常时，管理员可以强制该用户登出
4. **设备管理**：限制同一账号的登录设备数量
5. **定期清理**：通过定时任务定期清理过期的 token 记录

## 注意事项

1. **强制重新登录**：`verifyToken` 先查询数据库，再验证 JWT。所有旧 token（数据库中不存在的）将失效，用户需要重新登录
2. **性能考虑**：每次验证 token 都会查询数据库，建议在数据库中为 `token`、`user_id` 和 `expireTime` 字段建立索引
3. **定期清理**：建议设置定时任务定期调用 `cleanExpired` 清理过期的 token 记录
4. **安全性**：只有管理员可以撤销其他用户的 token

## 数据库索引建议

为了提高查询性能，建议在 `user_tokens` 表上建立以下索引：

```javascript
// token 字段索引（用于快速查询验证）
db.collection("user_tokens").createIndex({
  token: 1,
});

// user_id + status 复合索引（用于查询用户的活跃 token）
db.collection("user_tokens").createIndex({
  user_id: 1,
  status: 1,
});

// expireTime 索引（用于清理过期 token）
db.collection("user_tokens").createIndex({
  expireTime: 1,
});
```

## 迁移指南

**当前实现会强制所有旧用户重新登录**

如果你有现存的用户已经登录（持有旧的 token），这些 token 在数据库中不存在。当前实现会：

- ✅ 先查询数据库中的 token 记录
- ❌ 如果数据库中不存在，则认为 token 无效
- 📱 用户需要重新登录以生成新的 token

这样设计的好处是可以**立即清除所有旧的登录态**，确保系统安全。

## 扩展功能建议

未来可以考虑添加以下功能：

1. **单设备登录限制**：限制同一账号只能在一个设备上登录
2. **多设备管理**：显示用户在哪些设备上登录，支持远程登出某个设备
3. **登录日志**：记录每次 token 生成和撤销的日志
4. **Token 刷新机制**：实现 access token 和 refresh token 分离
