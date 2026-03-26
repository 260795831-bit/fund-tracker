export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: '请提供基金代码' });

  try {
    // 新浪财经基金实时估值接口
    const url = `https://hq.sinajs.cn/list=f_${code}`;
    const response = await fetch(url, {
      headers: { Referer: 'https://finance.sina.com.cn' }
    });
    const text = await response.text();

    // 返回格式: var hq_str_f_025832="基金名称,当日净值,昨日净值,涨跌额,涨跌幅,更新时间,...";
    const match = text.match(/"([^"]+)"/);
    if (!match || !match[1] || match[1].split(',').length < 5) {
      return res.status(404).json({ error: '未找到该基金，请检查基金代码' });
    }

    const parts = match[1].split(',');
    const name = parts[0];
    const estimatedNav = parts[1];   // 实时估值
    const lastNav = parts[2];        // 昨日净值
    const change = parts[3];         // 涨跌额
    const changeRate = parts[4];     // 涨跌幅（如 0.86%）
    const updateTime = parts[5] || '';

    if (!name || !estimatedNav) {
      return res.status(404).json({ error: '未找到该基金，请检查基金代码' });
    }

    res.status(200).json({
      code,
      name,
      lastNav,
      lastNavDate: '',
      estimatedNav,
      estimatedChange: parseFloat(changeRate).toFixed(2),
      estimatedTime: updateTime,
    });
  } catch (e) {
    res.status(500).json({ error: '数据获取失败: ' + e.message });
  }
}
