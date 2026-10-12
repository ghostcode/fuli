/**
 * 复利 / 年金计算核心
 * 模型说明：按期复利（期末定投），公式 FV = PMT × [(1+r)ⁿ − 1] / r
 * 其中 r 为每期利率，n 为总期数。
 */

export interface AnnuityResult {
  /** 到期 / 目标总额 */
  futureValue: number
  /** 累计投入本金 */
  principal: number
  /** 累计收益（利息） */
  interest: number
}

/** 期限定投：已知每期定投额 PMT、年化收益率、年限，求到期总额 */
export function futureValueOfAnnuity(
  pv: number,
  pmt: number,
  annualRate: number,
  years: number,
  freqPerYear = 12,
): AnnuityResult {
  const r = annualRate / freqPerYear
  const n = years * freqPerYear
  const growth = Math.pow(1 + r, n)
  const fv = pv * growth + (r === 0 ? pmt * n : pmt * ((growth - 1) / r))
  const principal = pv + pmt * n
  return { futureValue: fv, principal, interest: fv - principal }
}

/** 目标金额：已知目标 FV、年化收益率、年限，反推每期应定投额 */
export function pmtForTarget(
  fv: number,
  pv: number,
  annualRate: number,
  years: number,
  freqPerYear = 12,
): AnnuityResult {
  const r = annualRate / freqPerYear
  const n = years * freqPerYear
  const growth = Math.pow(1 + r, n)
  const pmt = r === 0 ? (fv - pv) / n : ((fv - pv * growth) * r) / (growth - 1)
  const principal = pv + pmt * n
  return { futureValue: fv, principal, interest: fv - principal }
}

/** 通用终值：现值 PV + 每期定投 PMT，在每期利率 r、共 n 期下的终值 */
function fvAtRate(pv: number, pmt: number, r: number, n: number): number {
  if (r === 0) return pv + pmt * n
  const growth = Math.pow(1 + r, n)
  return pv * growth + pmt * ((growth - 1) / r)
}

/**
 * 返回年化：已知初始本金 PV（可为 0）、每期定投 PMT、最终金额 FV、年限，
 * 反推所需年化收益率。无解析解，使用二分法（f(r) 单调递增）求解每期利率。
 * @returns 年化收益率（小数，如 0.08 = 8%），无解返回 null
 */
export function annualRateForTarget(
  pv: number,
  pmt: number,
  fv: number,
  years: number,
  freqPerYear = 12,
): number | null {
  const n = years * freqPerYear
  if (n <= 0) return null
  const f = (r: number) => fvAtRate(pv, pmt, r, n) - fv
  let lo = -0.999999
  let hi = 5 // 每期上限 500%，覆盖极端高收益场景
  const flo = f(lo)
  const fhi = f(hi)
  if (flo > 0 || fhi < 0) return null // 目标过小时为负、过大时超出范围，无解
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fm = f(mid)
    if (Math.abs(fm) < 1e-9) {
      lo = hi = mid
      break
    }
    if (flo * fm < 0) hi = mid
    else lo = mid
  }
  const rPerPeriod = (lo + hi) / 2
  return rPerPeriod * freqPerYear
}

/**
 * 生成增长序列（逐期余额），用于曲线可视化。
 * 模拟真实现金流：每期期初投入 PMT 并计息。
 */
export function growthSeries(
  pv: number,
  pmt: number,
  annualRate: number,
  years: number,
  freqPerYear = 12,
): number[] {
  const r = annualRate / freqPerYear
  const total = Math.max(0, Math.round(years * freqPerYear))
  const series: number[] = []
  let bal = pv
  for (let i = 0; i <= total; i++) {
    if (i > 0) bal = bal * (1 + r) + pmt
    series.push(bal)
  }
  return series
}

/** 柱状图单点拆解：每期余额拆分为「初始本金 / 投入本金 / 盈利」三段 */
export interface GrowthPoint {
  /** 第几期（0 表示期初，仅初始本金） */
  period: number
  /** X 轴标签 */
  label: string
  /** 初始本金（固定） */
  pv: number
  /** 截至该期累计投入本金（初始本金 + 已投定投） */
  invested: number
  /** 截至该期累计盈利（利息，可为负） */
  interest: number
  /** 余额 = invested + interest */
  balance: number
}

/** 图表最大柱数，超出则等距降采样（保留首、尾点），避免频率过高时柱子过密 */
const MAX_BARS = 60

/**
 * 生成逐期余额拆解序列，用于堆叠柱状图：
 * 每根柱子由三段堆叠 —— 初始本金(pv) / 投入本金累计(invested-pv) / 盈利(interest)。
 */
export function growthBreakdown(
  pv: number,
  pmt: number,
  annualRate: number,
  years: number,
  freqPerYear = 12,
): GrowthPoint[] {
  const r = annualRate / freqPerYear
  const total = Math.max(0, Math.round(years * freqPerYear))
  const raw: GrowthPoint[] = []
  let bal = pv
  for (let i = 0; i <= total; i++) {
    const invested = pv + pmt * i
    raw.push({
      period: i,
      label: i === 0 ? '期初' : `第${i}期`,
      pv,
      invested,
      interest: bal - invested,
      balance: bal,
    })
    if (i < total) bal = bal * (1 + r) + pmt
  }
  if (raw.length <= MAX_BARS) return raw
  const step = Math.ceil(raw.length / MAX_BARS)
  const out: GrowthPoint[] = []
  for (let i = 0; i < raw.length; i += step) out.push(raw[i])
  const last = raw[raw.length - 1]
  if (out[out.length - 1] !== last) out.push(last)
  return out
}
