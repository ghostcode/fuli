import { useMemo, useState } from 'react'
import {
  futureValueOfAnnuity,
  pmtForTarget,
  annualRateForTarget,
  growthSeries,
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
    if (mode === 'fv') return growthSeries(num(pv), num(pmt), r, y, freq)
    if (mode === 'target') {
      const p = (tgtRes.principal - num(pv)) / (y * freq || 1)
      return growthSeries(num(pv), p, r, y, freq)
    }
    return rateRes == null ? [] : growthSeries(num(pv), num(pmt), rateRes, y, freq)
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
          <Curve data={series} />
        </section>
      </div>

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

function Curve({ data }: { data: number[] }) {
  if (data.length < 2) return <div className="curve-empty">调整参数后可查看增长曲线</div>
  const W = 680, H = 200, pad = 12
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const yy = H - pad - ((v - min) / ((max - min) || 1)) * (H - pad * 2)
    return [x, yy] as const
  })
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="curve" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(34,211,238,0.35)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0)" />
        </linearGradient>
        <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#fill)" />
      <path d={line} fill="none" stroke="url(#stroke)" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,.6))' }} />
    </svg>
  )
}
