/**
 * getRecommendStream — 调用后端 AI 推荐，兼容流式 API 签名
 * @param {object} selected  - 用户选择要使用的数据类别
 * @param {function} onChunk - 流式文本回调
 * @param {function} onDone  - 完成回调 (data)
 * @param {function} onError - 错误回调 (message)
 */
export async function getRecommendStream(selected, onChunk, onDone, onError) {
  const token = localStorage.getItem('abdl_token');
  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ selected })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '推荐失败');

    // 模拟流式输出
    if (data.summary) {
      onChunk(data.summary);
    }
    onDone(data);
  } catch (e) {
    onError(e.message);
  }
}
