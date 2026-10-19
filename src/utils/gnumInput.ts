/**
 * 悬浮窗手改数值 —— 把玩家输入解析成游戏里的数
 *
 * 大数(GNum)不走 Number:1e400 会被 parseInt 直接算成 Infinity,
 * 故拆成「尾数 + 指数」再交给 gn() 归一化。
 */
import type { GNum } from '@/types'
import { gn } from './gnum'

/** 中文数量级后缀 → 指数(与 format.ts 的 UNITS 前几档对齐) */
const UNIT_EXP: Record<string, number> = { 万: 4, 亿: 8, 兆: 12, 京: 16, 垓: 20 }

const GNUM_RE = /^([+-]?)(\d+(?:\.\d+)?|\.\d+)(?:[eE]([+-]?\d+))?(万|亿|兆|京|垓)?$/

/** 允许 1.2e9 / 1.2×10^9 / 3万 / 1,000 这类写法;认不出返回 null */
export function parseGNum(text: string): GNum | null {
  const s = text
    .trim()
    .replace(/[,，\s]/g, '')
    .replace(/[×xX*]10\^/g, 'e')
  if (!s) return null
  const m = GNUM_RE.exec(s)
  if (!m) return null
  const mantissa = Number(m[2])
  const exp = (m[3] ? Number(m[3]) : 0) + (m[4] ? UNIT_EXP[m[4]]! : 0)
  if (!Number.isFinite(mantissa) || !Number.isFinite(exp)) return null
  return gn({ m: m[1] === '-' ? -mantissa : mantissa, e: exp })
}

/** 回填输入框:保留精确值,便于再次解析(如 1.5e12 而不是 1.5万亿) */
export function formatGNumInput(g: GNum): string {
  if (g.e === 0) return String(Number(g.m.toPrecision(10)))
  // 尾数只留 10 位有效数字:游戏内的数每拍都在长,16 位小数回填进输入框既难读也没意义
  return `${Number(g.m.toPrecision(10))}e${g.e}`
}

/** 普通计数(灵气/年龄/层数等):非负有限数,认不出返回 null */
export function parseCount(text: string): number | null {
  const s = text.trim().replace(/[,，\s]/g, '')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : null
}
