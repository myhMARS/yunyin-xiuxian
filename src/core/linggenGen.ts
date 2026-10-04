/**
 * 灵根生成 —— 创角与转世时随机灵根
 */
import type { ElementId, LinggenProfile, SpiritRoot } from '@/types'
import type { RandomService } from '@/utils/random'
import { BASIC_ELEMENTS, ELEMENTS, SPECIAL_ELEMENTS } from '@/data/linggen'

const COUNT_WEIGHTS: { count: number; weight: number }[] = [
  { count: 1, weight: 12 },
  { count: 2, weight: 30 },
  { count: 3, weight: 34 },
  { count: 4, weight: 16 },
  { count: 5, weight: 8 }
]

const COUNT_FACTOR: Record<number, number> = { 1: 1.6, 2: 1.35, 3: 1.15, 4: 1.0, 5: 0.9 }

/** 特殊灵根替换概率 */
const SPECIAL_CHANCE = 0.1
const CHAOS_CHANCE = 0.008

// ============ 本地私改:开局灵根恒为顶配 ============
/**
 * 开:建号与转世掷出的灵根恒为「混沌 · 单根 · 资质 100」——
 *     修行倍率 4.0(即 linggenRole.spec 里列的最高档),牌面三维同时拉满:
 *     功法/机缘同源权重 3.0 / 3.2(全元素最高)、天劫通吃五种劫型与五条解法通道
 *     (见 data/linggenAffinity.ts)。重掷多少次、转世多少世都一样。
 * 关:恢复原随机(根数按 COUNT_WEIGHTS 加权,资质 40~100 再叠转世地板)。
 *
 * 刻意不动 rollLinggen 本身:灵根分布的统计口径是审计的输入 ——
 * linggenRole.spec 的「聚灵阵能覆盖多数灵根」「资质地板第 12 世顶满」
 * 采样的都是原分布,改了它那两条审计就变成自欺。私改只作用在「开一世」的入口上。
 */
const APEX_LINGGEN = true

/** 顶配灵根画像:与 rollLinggen 的混沌分支同口径,只把资质钉死在 100 */
export function apexLinggen(): LinggenProfile {
  const aptitude = 100
  return {
    roots: [{ element: 'chaos', aptitude }],
    gradeName: '混沌灵根',
    growthMult: round2(1.6 * (aptitude / 60) * 1.5)
  }
}

/** 开一世的灵根:建号(CreateView)与转世(reincarnation)都走这里 */
export function rollLinggenForNewLife(rng: RandomService, aptitudeFloor = 0): LinggenProfile {
  return APEX_LINGGEN ? apexLinggen() : rollLinggen(rng, aptitudeFloor)
}

export function rollLinggen(rng: RandomService, aptitudeFloor = 0): LinggenProfile {
  // 混沌灵根:极小概率单根成圣
  if (rng.chance(CHAOS_CHANCE)) {
    const aptitude = Math.min(100, rng.int(85, 100) + aptitudeFloor)
    return {
      roots: [{ element: 'chaos', aptitude }],
      gradeName: '混沌灵根',
      growthMult: round2(1.6 * (aptitude / 60) * 1.5)
    }
  }

  const { count } = rng.weighted(COUNT_WEIGHTS, x => x.weight)
  const elements = pickElements(rng, count)
  const roots: SpiritRoot[] = elements.map(element => ({
    element,
    aptitude: Math.min(100, rng.int(40, 100) + aptitudeFloor)
  }))

  const hasSpecial = roots.some(r => ELEMENTS[r.element].special)
  const avgAptitude = roots.reduce((s, r) => s + r.aptitude, 0) / roots.length
  const growthMult = round2((avgAptitude / 60) * (COUNT_FACTOR[count] ?? 1) * (hasSpecial ? 1.2 : 1))

  return { roots, gradeName: gradeName(count, hasSpecial, avgAptitude), growthMult }
}

function pickElements(rng: RandomService, count: number): ElementId[] {
  const pool = [...BASIC_ELEMENTS]
  const out: ElementId[] = []
  for (let i = 0; i < count; i += 1) {
    const idx = rng.int(0, pool.length - 1)
    out.push(pool.splice(idx, 1)[0]!)
  }
  // 一定概率将其中一根替换为特殊灵根
  if (rng.chance(SPECIAL_CHANCE)) {
    const special = rng.weighted(SPECIAL_ELEMENTS, el => (el === 'light' || el === 'dark' ? 2 : 3))
    out[rng.int(0, out.length - 1)] = special
  }
  return out
}

function gradeName(count: number, hasSpecial: boolean, avgAptitude: number): string {
  if (hasSpecial) return '变异灵根'
  if (count === 1) return avgAptitude >= 80 ? '天灵根' : '异灵根'
  if (count === 2) return '真灵根'
  if (count === 3) return avgAptitude >= 70 ? '上灵根' : '伪灵根'
  return '杂灵根'
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}
