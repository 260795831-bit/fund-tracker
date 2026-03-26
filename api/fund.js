export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: '请提供基金代码' });
  }

  // 天天基金实时估值接口
  const url = `http://fundgz.1234567.com.cn/gz/${code}.js?rt=${Date.now()}`;

  try {
    const response = await fetch(url);
    const text = await response.text();

    // 返回格式: jsonpgz({"fundcode":"110022","name":"易方达消费行业","jzrq":"2024-01-01","dwjz":"3.1234","gsz":"3.1500","gszzl":"0.86","gztime":"2025-01-01 14:30"});
    const match = text.match(/jsonpgz\((\{.*?\})\)/);
    if (!match) {
      return res.status(404).json({ error: '未找到该基金，请检查基金代码' });
    }

    const data = JSON.parse(match[1]);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      code: data.fundcode,
      name: data.name,
      lastNav: data.dwjz,           // 上一日净值
      lastNavDate: data.jzrq,       // 上一日净值日期
      estimatedNav: data.gsz,       // 实时估值
      estimatedChange: data.gszzl,  // 估值涨跌幅 %
      estimatedTime: data.gztime,   // 估值更新时间
    });
  } catch (e) {
    res.status(500).json({ error: '数据获取失败: ' + e.message });
  }
}
