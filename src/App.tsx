import { useMemo, useState } from 'react'
import {
  futureValueOfAnnuity,
  pmtForTarget,
  annualRateForTarget,
  growthBreakdown,
  type GrowthPoint,
} from './lib/finance'

type Mode = 'fv' | 'target' | 'rate'
interface Freq { label: string; value: number }

const FREQS: Freq[] = [
  { label: '每月', value: 12 },
  { label: '每周', value: 52 },
  { label: '每季', value: 4 },
  { label: '每年', value: 1 },
  { label: '每日', value: 365 },
]

const cny = new Intl.NumberFormat('zh-CN', {
  style: 'currency', currency: 'CNY', maximumFractionDigits: 2,
})
const toPct = (v: number) => `${(v * 100).toFixed(2)}%`
const num = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n }
const formatCNYUnit = (v: number): string => {
  if (!isFinite(v) || v < 1000) return ''
  const trim = (x: number) => (Math.round(x * 100) / 100).toString()
  if (v >= 1e8) return trim(v / 1e8) + '亿'
  if (v >= 1e4) return trim(v / 1e4) + '万'
  return trim(v / 1000) + '千'
}

export default function App() {
  const [mode, setMode] = useState<Mode>('fv')
  const [pmt, setPmt] = useState('2000')
  const [rate, setRate] = useState('8')
  const [years, setYears] = useState('20')
  const [target, setTarget] = useState('1000000')
  const [pv, setPv] = useState('0')
  const [freq, setFreq] = useState(12)

  const r = num(rate) / 100
  const y = num(years)

  const fvRes = useMemo(
    () => futureValueOfAnnuity(num(pv), num(pmt), r, y, freq),
    [pmt, pv, r, y, freq],
  )
  const tgtRes = useMemo(
    () => pmtForTarget(num(target), num(pv), r, y, freq),
    [target, pv, r, y, freq],
  )
  const rateRes = useMemo(
    () => annualRateForTarget(num(pv), num(pmt), num(target), y, freq),
    [pv, pmt, target, y, freq],
  )

  const series = useMemo(() => {
    if (mode === 'fv') return growthBreakdown(num(pv), num(pmt), r, y, freq)
    if (mode === 'target') {
      const p = (tgtRes.principal - num(pv)) / (y * freq || 1)
      return growthBreakdown(num(pv), p, r, y, freq)
    }
    return rateRes == null ? [] : growthBreakdown(num(pv), num(pmt), rateRes, y, freq)
  }, [mode, pmt, pv, r, y, freq, tgtRes, rateRes])

  return (
    <div className="app">
      <header className="hero">
        <div className="badge">COMPOUND INTEREST LAB</div>
        <h1 className="title">复利计算器</h1>
        <p className="subtitle">期限定投 · 目标金额 · 计算年化</p>
      </header>

      <nav className="tabs">
        <button className={mode === 'fv' ? 'tab active' : 'tab'} onClick={() => setMode('fv')}>期限定投</button>
        <button className={mode === 'target' ? 'tab active' : 'tab'} onClick={() => setMode('target')}>目标金额</button>
        <button className={mode === 'rate' ? 'tab active' : 'tab'} onClick={() => setMode('rate')}>计算年化</button>
      </nav>

      <div className="grid">
        <section className="card form">
          {mode === 'fv' && (
            <>
              <Field label="初始本金（可选）" unit="¥" value={pv} onChange={setPv} />
              <Field label="每期定投金额" unit="¥" value={pmt} onChange={setPmt} />
              <Field label="预期年化收益率" unit="%" value={rate} onChange={setRate} />
              <Field label="投资期限" unit="年" value={years} onChange={setYears} />
            </>
          )}
          {mode === 'target' && (
            <>
              <Field label="初始本金（可选）" unit="¥" value={pv} onChange={setPv} />
              <Field label="目标金额" unit="¥" value={target} onChange={setTarget} />
              <Field label="预期年化收益率" unit="%" value={rate} onChange={setRate} />
              <Field label="投资期限" unit="年" value={years} onChange={setYears} />
            </>
          )}
          {mode === 'rate' && (
            <>
              <Field label="初始本金（可选）" unit="¥" value={pv} onChange={setPv} />
              <Field label="每期定投金额" unit="¥" value={pmt} onChange={setPmt} />
              <Field label="最终金额" unit="¥" value={target} onChange={setTarget} />
              <Field label="投资期限" unit="年" value={years} onChange={setYears} />
            </>
          )}
          <div className="field">
            <label>复利频率</label>
            <div className="seg">
              {FREQS.map((f) => (
                <button
                  key={f.value}
                  className={freq === f.value ? 'seg-btn active' : 'seg-btn'}
                  onClick={() => setFreq(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card result">
          {mode === 'fv' && (
            <>
              <Stat label="到期总额" value={cny.format(fvRes.futureValue)} hint={formatCNYUnit(fvRes.futureValue)} accent />
              <Stat label="累计本金" value={cny.format(fvRes.principal)} hint={formatCNYUnit(fvRes.principal)} />
              <Stat label="累计收益" value={cny.format(fvRes.interest)} hint={formatCNYUnit(fvRes.interest)} />
            </>
          )}
          {mode === 'target' && (
            <>
              <Stat label="每期需定投" value={cny.format((tgtRes.principal - num(pv)) / (y * freq || 1))} hint={formatCNYUnit((tgtRes.principal - num(pv)) / (y * freq || 1))} accent />
              <Stat label="累计本金" value={cny.format(tgtRes.principal)} hint={formatCNYUnit(tgtRes.principal)} />
              <Stat label="累计收益" value={cny.format(tgtRes.interest)} hint={formatCNYUnit(tgtRes.interest)} />
            </>
          )}
          {mode === 'rate' && (
            rateRes == null
              ? <div className="warn">参数无法求解，请检查输入（目标金额过小或过大）。</div>
              : <>
                  <Stat label="所需年化收益率" value={toPct(rateRes)} accent={rateRes >= 0} />
                  {rateRes < 0 && (
                    <div className="warn">所需年化收益率为负，说明仅「初始本金 + 每期定投」之和已超过目标金额，目标设定偏低或投入偏多。</div>
                  )}
                  <Stat label="累计投入" value={cny.format(num(pv) + num(pmt) * y * freq)} hint={formatCNYUnit(num(pv) + num(pmt) * y * freq)} />
                  <Stat label="最终金额" value={cny.format(num(target))} hint={formatCNYUnit(num(target))} />
                </>
          )}
        </section>
      </div>

      <section className="card chart-row">
        <BarChart data={series} />
      </section>

      <footer className="foot">期末定投模型 · FV = PV·(1+r)ⁿ + PMT·[(1+r)ⁿ−1]/r · 计算年化采用二分法数值求解</footer>
    </div>
  )
}

function Field({ label, unit, value, onChange }: { label: string; unit: string; value: string; onChange: (v: string) => void }) {
  const hint = unit === '¥' ? formatCNYUnit(num(value)) : ''
  return (
    <div className="field">
      <label>{label}{hint && <span className="unit-hint"> · {hint}</span>}</label>
      <div className="input-wrap">
        <input type="number" value={value} onChange={(e) => onChange(e.target.value)} />
        <span className="unit">{unit}</span>
      </div>
    </div>
  )
}

function Stat({ label, value, accent, hint }: { label: string; value: string; accent?: boolean; hint?: string }) {
  return (
    <div className={accent ? 'stat accent' : 'stat'}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">≈ {hint}</span>}
    </div>
  )
}

/** 把数值向上取到「整 1/2/2.5/5/10 × 10^k」，便于 Y 轴刻度对齐 */
const niceMax = (v: number): number => {
  if (v <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const nrm = v / pow
  const step = nrm <= 1 ? 1 : nrm <= 2 ? 2 : nrm <= 2.5 ? 2.5 : nrm <= 5 ? 5 : 10
  return step * pow
}
/** Y 轴刻度文案：优先中文单位，负值带负号 */
const axisLabel = (v: number): string => {
  const s = formatCNYUnit(Math.abs(v))
  const sign = v < 0 ? '-' : ''
  return s ? sign + s : sign + String(Math.round(v))
}

function BarChart({ data }: { data: GrowthPoint[] }) {
  if (data.length < 2) return <div className="curve-empty">调整参数后可查看增长柱状图</div>
  const W = 680, H = 250, padL = 60, padR = 16, padTop = 18, padBottom = 30
  const plotH = H - padTop - padBottom
  const maxBal = Math.max(...data.map((d) => d.balance), 0)
  const minInt = Math.min(...data.map((d) => d.interest), 0)
  const maxY = niceMax(maxBal)
  const minY = minInt < 0 ? -niceMax(-minInt) : 0
  const span = maxY - minY || 1
  const yScale = (v: number) => padTop + ((maxY - v) / span) * plotH

  const n = data.length
  const band = (W - padL - padR) / n
  const barW = Math.min(band * 0.64, 44)
  const ticks = 4
  const colorPv = '#ef4444'   // 初始本金：红
  const colorInv = '#3b82f6'  // 投入本金：蓝
  const colorInt = '#a855f7'  // 盈利金额：紫
  const labelStep = Math.ceil(n / 12)

  const seg = (x: number, a: number, b: number, fill: string, title: string) => {
    if (Math.abs(b - a) < 1e-6) return null
    const yTop = yScale(Math.max(a, b))
    const yBot = yScale(Math.min(a, b))
    return (
      <rect key={title} x={x} y={yTop} width={barW} height={Math.max(0, yBot - yTop)} fill={fill}>
        <title>{title}</title>
      </rect>
    )
  }

  const bars = data.map((d, i) => {
    const cx = padL + band * i + band / 2
    const x = cx - barW / 2
    return (
      <g key={i}>
        {seg(x, 0, d.pv, colorPv, `${d.label}｜初始本金 ${cny.format(d.pv)}`)}
        {seg(x, d.pv, d.invested, colorInv, `${d.label}｜投入本金 ${cny.format(d.invested - d.pv)}`)}
        {seg(x, d.invested, d.balance, colorInt, `${d.label}｜盈利 ${cny.format(d.interest)}`)}
      </g>
    )
  })

  return (
    <div className="chart">
      <div className="chart-legend">
        <span className="legend-item"><i className="sw" style={{ background: colorPv }} />初始本金</span>
        <span className="legend-item"><i className="sw" style={{ background: colorInv }} />投入本金</span>
        <span className="legend-item"><i className="sw" style={{ background: colorInt }} />盈利金额</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="bar-chart" preserveAspectRatio="none">
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = minY + (span * i) / ticks
          const yy = yScale(v)
          return (
            <g key={i}>
              <line x1={padL} y1={yy} x2={W - padR} y2={yy} className="grid-line" />
              <text x={padL - 6} y={yy + 3} className="axis-text" textAnchor="end">{axisLabel(v)}</text>
            </g>
          )
        })}
        {bars}
        {data.map((d, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text key={i} x={padL + band * i + band / 2} y={H - padBottom + 15} className="axis-text" textAnchor="middle">
              {d.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  )
}
