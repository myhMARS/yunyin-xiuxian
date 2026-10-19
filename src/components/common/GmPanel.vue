<template>
  <!-- 悬浮球:贴在外壳右下,避开底部导航 -->
  <button
    v-if="!open"
    class="absolute right-3 z-30 grid h-11 w-11 place-items-center rounded-full border border-cinnabar/35 bg-paper-deep/95 font-kai text-[15px] text-cinnabar shadow-lg backdrop-blur active:scale-95"
    style="bottom: calc(4.5rem + env(safe-area-inset-bottom))"
    aria-label="打开数值悬浮窗"
    @click="openPanel"
  >
    改
  </button>

  <div v-else class="absolute inset-0 z-40 flex flex-col justify-end bg-ink/35" @click.self="open = false">
    <section
      class="flex max-h-[82%] flex-col rounded-t-2xl border-t border-ink/15 bg-paper shadow-[0_-8px_30px_rgba(0,0,0,0.25)]"
      role="dialog"
      aria-label="数值悬浮窗"
    >
      <header class="flex items-center justify-between border-b border-ink/10 px-4 py-2.5">
        <div>
          <p class="font-kai text-[14px] tracking-[0.25em] text-ink">手改数值</p>
          <p class="mt-0.5 text-[10px] text-ink-faint">{{ realmHint }} · 写入后立即生效并存档</p>
        </div>
        <button
          class="grid h-8 w-8 place-items-center rounded-full border border-ink/15 text-[15px] text-ink-soft active:scale-95"
          aria-label="关闭"
          @click="open = false"
        >
          ×
        </button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p class="section-label">资源</p>
        <div class="mt-1.5 grid grid-cols-2 gap-2">
          <label class="field col-span-2">
            <span>灵石(支持 1.2e9 / 3万)</span>
            <input v-model="draft.stone" inputmode="decimal" class="field-input" />
          </label>
          <label class="field">
            <span>灵气(上限 {{ formatGN(player.qiBankCapValue) }})</span>
            <input v-model="draft.qi" inputmode="decimal" class="field-input" />
          </label>
          <label class="field">
            <span>悟道点</span>
            <input v-model="draft.wudao" inputmode="numeric" class="field-input" />
          </label>
          <label class="field">
            <span>灵草</span>
            <input v-model="draft.herb" inputmode="numeric" class="field-input" />
          </label>
          <label class="field">
            <span>矿石</span>
            <input v-model="draft.ore" inputmode="numeric" class="field-input" />
          </label>
          <label class="field">
            <span>残页</span>
            <input v-model="draft.page" inputmode="numeric" class="field-input" />
          </label>
          <label class="field">
            <span>灵尘</span>
            <input v-model="draft.dust" inputmode="numeric" class="field-input" />
          </label>
        </div>

        <p class="section-label mt-4">修为与寿元</p>
        <div class="mt-1.5 grid grid-cols-2 gap-2">
          <label class="field col-span-2">
            <span>修为(当前需 {{ formatGN(player.expReq) }})</span>
            <input v-model="draft.exp" inputmode="decimal" class="field-input" />
          </label>
          <label class="field">
            <span>大境界(0 ~ {{ MAX_MAJOR }})</span>
            <input v-model="draft.major" inputmode="numeric" class="field-input" />
          </label>
          <label class="field">
            <span>层数(0 ~ {{ SUB_LEVELS - 1 }})</span>
            <input v-model="draft.sub" inputmode="numeric" class="field-input" />
          </label>
          <label class="field">
            <span>年龄</span>
            <input v-model="draft.age" inputmode="numeric" class="field-input" />
          </label>
          <label class="field">
            <span>寿元加成(年)</span>
            <input v-model="draft.lifespanBonus" inputmode="numeric" class="field-input" />
          </label>
        </div>

        <p class="section-label mt-4">轮回</p>
        <div class="mt-1.5 grid grid-cols-2 gap-2">
          <label class="field">
            <span>道果</span>
            <input v-model="draft.daoFruit" inputmode="numeric" class="field-input" />
          </label>
          <label class="field">
            <span>宿慧</span>
            <input v-model="draft.insight" inputmode="numeric" class="field-input" />
          </label>
        </div>
      </div>

      <footer class="flex gap-2 border-t border-ink/10 px-4 py-3">
        <button class="btn-ghost flex-1" @click="open = false">不改了</button>
        <button class="btn-seal flex-1" @click="apply">写入存档</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
  /**
   * 数值悬浮窗 —— 自测/调试用。
   *
   * 只做「读现值 → 改数 → 写回 store」这一件事:不绕开任何结算逻辑,
   * 也不提供删档/跳关,写入的仍是通过校验的普通状态。
   * 灵石与修为走 GNum 解析(支持 1e400 这类超出 Number 的值),
   * 其余计数按非负有限数处理。
   */
  import { computed, reactive, ref } from 'vue'
  import { MAX_MAJOR, SUB_NAMES } from '@/data/realms'
  import { SUB_LEVELS } from '@/data/constants'
  import { usePlayerStore } from '@/stores/player'
  import { useResourcesStore } from '@/stores/resources'
  import { useUiStore } from '@/stores/ui'
  import { formatGN } from '@/utils/format'
  import { formatGNumInput, parseCount, parseGNum } from '@/utils/gnumInput'

  const player = usePlayerStore()
  const resources = useResourcesStore()
  const ui = useUiStore()

  const open = ref(false)

  const draft = reactive({
    stone: '',
    qi: '',
    wudao: '',
    herb: '',
    ore: '',
    page: '',
    dust: '',
    exp: '',
    major: '',
    sub: '',
    age: '',
    lifespanBonus: '',
    daoFruit: '',
    insight: ''
  })

  const realmHint = computed(() => `当前 ${player.realmName}(${SUB_NAMES[Math.min(player.sub, SUB_NAMES.length - 1)]})`)

  /** 打开时从 store 回填,让玩家看到的是「现在的数」而不是上次改到一半的草稿 */
  function openPanel(): void {
    draft.stone = formatGNumInput(resources.spiritStone)
    draft.qi = String(Math.floor(resources.qi))
    draft.wudao = String(resources.wudao)
    draft.herb = String(resources.herb)
    draft.ore = String(resources.ore)
    draft.page = String(resources.page)
    draft.dust = String(resources.dust)
    draft.exp = formatGNumInput(player.exp)
    draft.major = String(player.major)
    draft.sub = String(player.sub)
    draft.age = String(player.age)
    draft.lifespanBonus = String(player.lifespanBonusYears)
    draft.daoFruit = String(player.reincarnation.daoFruit)
    draft.insight = String(player.reincarnation.insight)
    open.value = true
  }

  function apply(): void {
    // 先全部解析,有任何一个看不懂就整单不写 —— 半套生效比不改更难排查
    const stone = parseGNum(draft.stone)
    const exp = parseGNum(draft.exp)
    const counts = {
      qi: parseCount(draft.qi),
      wudao: parseCount(draft.wudao),
      herb: parseCount(draft.herb),
      ore: parseCount(draft.ore),
      page: parseCount(draft.page),
      dust: parseCount(draft.dust),
      major: parseCount(draft.major),
      sub: parseCount(draft.sub),
      age: parseCount(draft.age),
      lifespanBonus: parseCount(draft.lifespanBonus),
      daoFruit: parseCount(draft.daoFruit),
      insight: parseCount(draft.insight)
    }
    const labels: Record<keyof typeof counts, string> = {
      qi: '灵气',
      wudao: '悟道点',
      herb: '灵草',
      ore: '矿石',
      page: '残页',
      dust: '灵尘',
      major: '大境界',
      sub: '层数',
      age: '年龄',
      lifespanBonus: '寿元加成',
      daoFruit: '道果',
      insight: '宿慧'
    }
    const bad: string[] = []
    if (!stone) bad.push('灵石')
    if (!exp) bad.push('修为')
    for (const key of Object.keys(counts) as (keyof typeof counts)[]) {
      if (counts[key] === null) bad.push(labels[key])
    }
    if (bad.length > 0 || !stone || !exp) {
      ui.toast(`这些数值没看懂:${bad.join('、')}`, 'warn')
      return
    }

    resources.spiritStone = stone
    // 走 setQi 而不是直接写:灵气有「积余上限」,越界值在这里被夹回
    resources.setQi(counts.qi!, player.qiCapValue)
    resources.wudao = Math.floor(counts.wudao!)
    resources.herb = Math.floor(counts.herb!)
    resources.ore = Math.floor(counts.ore!)
    resources.page = Math.floor(counts.page!)
    resources.dust = Math.floor(counts.dust!)

    player.exp = exp
    player.major = Math.min(MAX_MAJOR, Math.floor(counts.major!))
    player.sub = Math.min(SUB_LEVELS - 1, Math.floor(counts.sub!))
    player.age = Math.floor(counts.age!)
    player.lifespanBonusYears = Math.floor(counts.lifespanBonus!)
    player.reincarnation = {
      ...player.reincarnation,
      daoFruit: Math.floor(counts.daoFruit!),
      insight: Math.floor(counts.insight!)
    }

    ui.toast('数值已写入存档', 'success')
    open.value = false
  }
</script>

<style scoped>
  .section-label {
    font-family: var(--font-kai);
    font-size: 11px;
    letter-spacing: 0.3em;
    color: var(--color-ink-faint);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 10px;
    color: var(--color-ink-faint);
  }

  .field-input {
    width: 100%;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, var(--color-ink) 20%, transparent);
    background: color-mix(in srgb, var(--color-paper-deep) 60%, transparent);
    padding: 5px 8px;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink);
    outline: none;
  }

  .field-input:focus {
    border-color: color-mix(in srgb, var(--color-cinnabar) 50%, transparent);
  }
</style>
