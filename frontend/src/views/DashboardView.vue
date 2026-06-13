<script setup>
import { ref, computed, onMounted } from 'vue';
import * as api from '@/api/admin.js';
import BaseAlert from '@/components/ui/BaseAlert.vue';

const stats = ref(null);
const loading = ref(false);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    stats.value = await api.fetchStats();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const cards = computed(() => {
  const c = stats.value?.counts ?? {};
  return [
    { label: 'Users', value: c.users ?? 0, sub: `${c.admins ?? 0} admin` },
    { label: 'Sheets', value: c.sheets ?? 0 },
    { label: 'Notes', value: c.notes ?? 0 },
    { label: 'Connections', value: c.connections ?? 0 },
    { label: 'Strokes', value: c.strokes ?? 0 },
  ];
});

const topSheets = computed(() => stats.value?.notesPerSheet ?? []);
const maxSheet = computed(() => Math.max(1, ...topSheets.value.map((s) => s.count)));

/* ---- Activity line chart (hand-rolled SVG) ---- */
const CW = 600;
const CH = 150;
const activity = computed(() => stats.value?.activity ?? []);
const maxAct = computed(() => Math.max(1, ...activity.value.map((a) => a.count)));

function pointX(i, n) {
  return n <= 1 ? CW / 2 : (i / (n - 1)) * CW;
}
function pointY(count) {
  return CH - (count / maxAct.value) * (CH - 8) - 4;
}
const linePath = computed(() => {
  const a = activity.value;
  return a.map((p, i) => `${i ? 'L' : 'M'} ${pointX(i, a.length).toFixed(1)},${pointY(p.count).toFixed(1)}`).join(' ');
});
const areaPath = computed(() => (linePath.value ? `${linePath.value} L ${CW},${CH} L 0,${CH} Z` : ''));
const dayLabel = (d) => d.slice(5); // MM-DD
</script>

<template>
  <div class="page">
    <header class="page__head">
      <h1>📊 Dashboard</h1>
      <span class="text-muted">Overview of all activity</span>
    </header>

    <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>
    <p v-else-if="loading" class="text-muted">Loading…</p>

    <template v-if="stats">
      <!-- KPI cards -->
      <div class="kpis">
        <div v-for="k in cards" :key="k.label" class="kpi">
          <span class="kpi__value">{{ k.value }}</span>
          <span class="kpi__label">{{ k.label }}</span>
          <span v-if="k.sub" class="kpi__sub text-muted">{{ k.sub }}</span>
        </div>
      </div>

      <div class="grid">
        <!-- Activity chart -->
        <section class="panel">
          <h2 class="panel__title">Notes created · last 14 days</h2>
          <svg class="chart" :viewBox="`0 0 ${CW} ${CH}`" preserveAspectRatio="none">
            <defs>
              <linearGradient id="actFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.28" />
                <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path :d="areaPath" fill="url(#actFill)" />
            <path :d="linePath" fill="none" stroke="var(--color-primary)" stroke-width="2" />
          </svg>
          <div class="chart__axis text-muted">
            <span>{{ activity.length ? dayLabel(activity[0].date) : '' }}</span>
            <span>peak {{ maxAct }}</span>
            <span>{{ activity.length ? dayLabel(activity[activity.length - 1].date) : '' }}</span>
          </div>
        </section>

        <!-- Top sheets -->
        <section class="panel">
          <h2 class="panel__title">Top sheets by notes</h2>
          <p v-if="!topSheets.length" class="text-muted">No notes yet.</p>
          <div v-for="s in topSheets" :key="s.name" class="bar">
            <span class="bar__name">{{ s.name }}</span>
            <span class="bar__track">
              <span class="bar__fill" :style="{ width: `${(s.count / maxSheet) * 100}%` }" />
            </span>
            <span class="bar__count">{{ s.count }}</span>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  padding: 80px var(--space-5) var(--space-6);
  max-width: 980px;
  height: 100%;
  overflow: auto;
}
.page__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}
.page__head h1 {
  margin: 0;
}
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}
.kpi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.kpi__value {
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1;
  background: var(--gradient-brand);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.kpi__label {
  font-weight: 600;
}
.kpi__sub {
  font-size: var(--font-size-sm);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-4);
}
.panel {
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.panel__title {
  margin: 0 0 var(--space-4);
  font-size: var(--font-size-base);
}
.chart {
  width: 100%;
  height: 150px;
  display: block;
}
.chart__axis {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  margin-top: var(--space-2);
}
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.bar__name {
  width: 120px;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.bar__track {
  flex: 1;
  height: 12px;
  border-radius: 999px;
  background: var(--color-bg);
  overflow: hidden;
}
.bar__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--gradient-brand);
}
.bar__count {
  width: 32px;
  flex-shrink: 0;
  text-align: right;
  font-weight: 700;
  font-size: var(--font-size-sm);
}
</style>
