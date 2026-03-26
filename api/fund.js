export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: '请提供基金代码' });

  try {
    // 用东方财富基金估值接口（支持新基金）
    const url = `https://fundgz.1234567.com.cn/gz/${code}.js?rt=${Date.now()}`;
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://fund.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const text = await response.text();
    const match = text.match(/jsonpgz\((\{.*?\})\)/);

    if (match) {
      // 天天基金接口成功
      const data = JSON.parse(match[1]);
      return res.status(200).json({
        code: data.fundcode,
        name: data.name,
        lastNav: data.dwjz,
        lastNavDate: data.jzrq,
        estimatedNav: data.gsz,
        estimatedChange: parseFloat(data.gszzl).toFixed(2),
        estimatedTime: data.gztime,
      });
    }

    // 回退：用东方财富净值接口（不含盘中估值，只有昨日净值）
    const url2 = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=1`;
    const res2 = await fetch(url2, {
      headers: {
        'Referer': 'https://fund.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const json2 = await res2.json();
    const item = json2?.Data?.LSJZList?.[0];

    if (!item) {
      return res.status(404).json({ error: '未找到该基金，请检查基金代码' });
    }

    // 再取基金名称
    const url3 = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=x&Fcodes=${code}`;
    const res3 = await fetch(url3, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json3 = await res3.json();
    const name = json3?.Datas?.[0]?.SHORTNAME || code;

    return res.status(200).json({
      code,
      name,
      lastNav: item.DWJZ,
      lastNavDate: item.FSRQ,
      estimatedNav: item.DWJZ,        // 无盘中估值时用昨日净值代替
      estimatedChange: item.JZZZL,
      estimatedTime: item.FSRQ + ' (昨日净值)',
    });

  } catch (e) {
    res.status(500).json({ error: '数据获取失败: ' + e.message });
  }
}
