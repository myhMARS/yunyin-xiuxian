import { describe, expect, it } from 'vitest'
import { formatGNumInput, parseCount, parseGNum } from './gnumInput'

describe('parseGNum', () => {
  it('解析普通整数与小数', () => {
    expect(parseGNum('123')).toEqual({ m: 1.23, e: 2 })
    expect(parseGNum('1.5')).toEqual({ m: 1.5, e: 0 })
  })

  it('解析千分位与空白', () => {
    expect(parseGNum(' 1,234 ')).toEqual({ m: 1.234, e: 3 })
  })

  it('解析科学计数法与中文后缀', () => {
    expect(parseGNum('2.5e6')).toEqual({ m: 2.5, e: 6 })
    expect(parseGNum('1.2×10^9')).toEqual({ m: 1.2, e: 9 })
    expect(parseGNum('3万')).toEqual({ m: 3, e: 4 })
    expect(parseGNum('1.2亿')).toEqual({ m: 1.2, e: 8 })
  })

  it('保留远超 Number 范围的数值', () => {
    expect(parseGNum('1.5e400')).toEqual({ m: 1.5, e: 400 })
  })

  it('零与负数', () => {
    expect(parseGNum('0')).toEqual({ m: 0, e: 0 })
    expect(parseGNum('-42')).toEqual({ m: -4.2, e: 1 })
  })

  it('认不出的输入返回 null', () => {
    expect(parseGNum('')).toBeNull()
    expect(parseGNum('abc')).toBeNull()
    expect(parseGNum('1e')).toBeNull()
    expect(parseGNum('1.2.3')).toBeNull()
  })
})

describe('formatGNumInput', () => {
  it('回填后能再次解析出同一数值', () => {
    expect(formatGNumInput({ m: 7, e: 0 })).toBe('7')
    expect(formatGNumInput({ m: 2.5, e: 6 })).toBe('2.5e6')
    // 引擎每拍都在长,尾数只留 10 位有效数字,免得输入框里出现 16 位小数
    expect(formatGNumInput({ m: 1.0002214820319921, e: 5 })).toBe('1.000221482e5')
    expect(parseGNum(formatGNumInput({ m: 2.5, e: 6 }))).toEqual({ m: 2.5, e: 6 })
  })
})

describe('parseCount', () => {
  it('接受非负整数/小数', () => {
    expect(parseCount('42')).toBe(42)
    expect(parseCount('1,000')).toBe(1000)
    expect(parseCount('0')).toBe(0)
  })

  it('拒绝负数、非数与空串', () => {
    expect(parseCount('-1')).toBeNull()
    expect(parseCount('NaN')).toBeNull()
    expect(parseCount('')).toBeNull()
  })
})
