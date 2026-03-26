export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { code, action } = req.query;
  if (!code) return res.status(400).json({ error: '请提供基金代码' });

  const headers = {
    'Referer': 'https://fund.eastmoney.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  try {
    // ── 1. 实时估值（天天基金）──────────────────────────
    const gzUrl = `https://fundgz.1234567.com.cn/gz/${code}.js?rt=${Date.now()}`;
    const gzRes = await fetch(gzUrl, { headers });
    const gzText = await gzRes.text();
    const gzMatch = gzText.match(/jsonpgz\((\{.*?\})\)/);

    // ── 2. 历史净值（最近5日）────────────────────────────
    const histUrl = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=5&token=webfund`;
    const histRes = await fetch(histUrl, { headers });
    const histJson = await histRes.json();
    const histList = histJson?.Data?.LSJZList || [];

    // ── 3. 基金基本信息 ───────────────────────────────────
    const infoUrl = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=x&Fcodes=${code}`;
    const infoRes = await fetch(infoUrl, { headers: { 'User-Agent': headers['User-Agent'] } });
    const infoJson = await infoRes.json();
    const info = infoJson?.Datas?.[0];

    let result = {
      code,
      name: info?.SHORTNAME || code,
      fundType: info?.FTYPE || '',
      // 实时估值
      estimatedNav: null,
      estimatedChange: null,
      estimatedTime: null,
      // 昨日净值
      lastNav: histList[0]?.DWJZ || null,
      lastNavDate: histList[0]?.FSRQ || null,
      lastChange: histList[0]?.JZZZL || null,
      // 历史走势（最近5日）
      history: histList.map(h => ({
        date: h.FSRQ,
        nav: h.DWJZ,
        change: h.JZZZL,
      })),
    };

    if (gzMatch) {
      const gz = JSON.parse(gzMatch[1]);
      result.estimatedNav = gz.gsz;
      result.estimatedChange = gz.gszzl;
      result.estimatedTime = gz.gztime;
      result.name = gz.name || result.name;
      result.lastNav = gz.dwjz;
      result.lastNavDate = gz.jzrq;
    }

    return res.status(200).json(result);

  } catch (e) {
    return res.status(500).json({ error: '数据获取失败: ' + e.message });
  }
}
