<script setup>
import { ref, computed, onMounted } from 'vue';
import * as api from '@/modules/admin/api/admin.js';
import BaseAlert from '@/components/BaseAlert.vue';

const stats = ref(null);
const perf = ref(null);
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
  // Performance is best-effort — a failure here must not hide the core stats.
  try {
    perf.value = await api.fetchPerformance();
  } catch {
    /* leave the performance section hidden */
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

/* ---- Helmet violations ---- */
const vio = computed(() => stats.value?.violations ?? null);
const vioCards = computed(() => {
  const v = vio.value;
  if (!v) return [];
  return [
    { label: 'Today', value: v.today },
    { label: 'Last 7 days', value: v.last7 },
    { label: 'Unreviewed', value: v.unreviewed, danger: v.unreviewed > 0 },
    { label: 'Total', value: v.total },
  ];
});
const vioTrend = computed(() => vio.value?.trend ?? []);
const maxVio = computed(() => Math.max(1, ...vioTrend.value.map((t) => t.count)));
const topCameras = computed(() => vio.value?.topCameras ?? []);
const maxVioCam = computed(() => Math.max(1, ...topCameras.value.map((c) => c.count)));

/* ---- Performance (from api.request logs) ---- */
const perfCards = computed(() => {
  const p = perf.value;
  if (!p) return [];
  return [
    { label: `Requests · ${p.windowHours}h`, value: p.requests },
    { label: 'Error rate', value: `${p.errorRate}%`, danger: p.errorRate >= 5 },
    { label: 'Latency p95', value: `${p.latency.p95} ms` },
    { label: 'Rate-limit blocks', value: p.rateLimitBlocks, danger: p.rateLimitBlocks > 0 },
  ];
});
const throughput = computed(() => perf.value?.throughput ?? []);
const maxTp = computed(() => Math.max(1, ...throughput.value.map((t) => t.count)));
const STATUS_COLORS = {
  '2xx': 'var(--color-success)',
  '3xx': 'var(--color-info)',
  '4xx': 'var(--color-warning)',
  '5xx': 'var(--color-danger)',
};
const maxEndpoint = computed(() => Math.max(1, ...(perf.value?.topEndpoints ?? []).map((e) => e.count)));

function fmtUptime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}
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

      <!-- Helmet violations -->
      <template v-if="vio">
        <h2 class="section-title">🪖 Helmet violations</h2>
        <div class="kpis">
          <div v-for="k in vioCards" :key="k.label" class="kpi">
            <span class="kpi__value" :class="{ 'kpi__value--danger': k.danger }">{{ k.value }}</span>
            <span class="kpi__label">{{ k.label }}</span>
          </div>
        </div>

        <div class="grid">
          <!-- Trend -->
          <section class="panel">
            <h2 class="panel__title">Violations · last 14 days</h2>
            <div class="tp">
              <span
                v-for="(t, i) in vioTrend"
                :key="i"
                class="tp__bar"
                :style="{ height: `${(t.count / maxVio) * 100}%` }"
                :title="`${t.date} · ${t.count}`"
              />
            </div>
            <div class="chart__axis text-muted">
              <span>{{ vioTrend.length ? dayLabel(vioTrend[0].date) : '' }}</span>
              <span>peak {{ maxVio }}</span>
              <span>{{ vioTrend.length ? dayLabel(vioTrend[vioTrend.length - 1].date) : '' }}</span>
            </div>
          </section>

          <!-- Top cameras -->
          <section class="panel">
            <h2 class="panel__title">Top cameras by violations</h2>
            <p v-if="!topCameras.length" class="text-muted">No violations yet.</p>
            <div v-for="c in topCameras" :key="c.name" class="bar">
              <span class="bar__name">{{ c.name }}</span>
              <span class="bar__track"><span class="bar__fill" :style="{ width: `${(c.count / maxVioCam) * 100}%` }" /></span>
              <span class="bar__count">{{ c.count }}</span>
            </div>
          </section>
        </div>
      </template>

      <!-- Performance (derived from api.request logs) -->
      <template v-if="perf">
        <h2 class="section-title">⚡ Performance · last {{ perf.windowHours }}h</h2>
        <div class="kpis">
          <div v-for="k in perfCards" :key="k.label" class="kpi">
            <span class="kpi__value" :class="{ 'kpi__value--danger': k.danger }">{{ k.value }}</span>
            <span class="kpi__label">{{ k.label }}</span>
          </div>
        </div>

        <div class="grid">
          <!-- Throughput -->
          <section class="panel">
            <h2 class="panel__title">Requests / hour</h2>
            <div class="tp">
              <span
                v-for="(t, i) in throughput"
                :key="i"
                class="tp__bar"
                :style="{ height: `${(t.count / maxTp) * 100}%` }"
                :title="`${t.hour} · ${t.count}`"
              />
            </div>
            <div class="chart__axis text-muted">
              <span>{{ throughput[0]?.hour }}</span>
              <span>peak {{ maxTp }}</span>
              <span>{{ throughput[throughput.length - 1]?.hour }}</span>
            </div>
          </section>

          <!-- Latency + status -->
          <section class="panel">
            <h2 class="panel__title">Latency (ms) &amp; status mix</h2>
            <div class="lat">
              <div v-for="k in ['avg', 'p50', 'p95', 'p99', 'max']" :key="k" class="lat__item">
                <span class="lat__v">{{ perf.latency[k] }}</span>
                <span class="lat__k text-muted">{{ k }}</span>
              </div>
            </div>
            <div class="status">
              <span
                v-for="s in perf.statusBreakdown"
                :key="s.klass"
                class="status__seg"
                :style="{ flex: s.count, background: STATUS_COLORS[s.klass] }"
                :title="`${s.klass}: ${s.count}`"
              />
            </div>
            <div class="status__legend text-muted">
              <span v-for="s in perf.statusBreakdown" :key="s.klass">
                <i :style="{ background: STATUS_COLORS[s.klass] }" />{{ s.klass }} {{ s.count }}
              </span>
            </div>
          </section>

          <!-- Top endpoints -->
          <section class="panel">
            <h2 class="panel__title">Top endpoints</h2>
            <p v-if="!perf.topEndpoints.length" class="text-muted">No traffic yet.</p>
            <div v-for="e in perf.topEndpoints" :key="`${e.method}${e.path}`" class="bar">
              <span class="bar__name" :title="`${e.method} ${e.path}`"><code>{{ e.method }}</code> {{ e.path }}</span>
              <span class="bar__track"><span class="bar__fill" :style="{ width: `${(e.count / maxEndpoint) * 100}%` }" /></span>
              <span class="bar__count">{{ e.count }}</span>
            </div>
          </section>

          <!-- Slowest -->
          <section class="panel">
            <h2 class="panel__title">Slowest endpoints (avg ms)</h2>
            <p v-if="!perf.slowest.length" class="text-muted">Not enough data.</p>
            <div v-for="e in perf.slowest" :key="`${e.method}${e.path}`" class="ep-row">
              <span class="bar__name" :title="`${e.method} ${e.path}`"><code>{{ e.method }}</code> {{ e.path }}</span>
              <span class="ep-row__ms">{{ e.avgMs }} ms</span>
            </div>
          </section>
        </div>

        <!-- Process self-metrics (this backend container) -->
        <div class="proc text-muted">
          <span>⏱ uptime {{ fmtUptime(perf.process.uptimeSec) }}</span>
          <span>🧠 heap {{ perf.process.heapUsedMb }} / rss {{ perf.process.rssMb }} MB</span>
          <span>🗄 mongo {{ perf.process.mongo }}</span>
          <span>⬢ node {{ perf.process.nodeVersion }}</span>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.page {
  padding: 80px var(--space-5) var(--space-6);
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

/* ---- Performance section ---- */
.section-title {
  margin: var(--space-6) 0 var(--space-4);
  font-size: var(--font-size-lg);
}
.kpi__value--danger {
  background: none;
  -webkit-text-fill-color: var(--color-danger);
  color: var(--color-danger);
}
.tp {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 120px;
}
.tp__bar {
  flex: 1;
  min-height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--gradient-brand);
  opacity: 0.85;
}
.tp__bar:hover {
  opacity: 1;
}
.lat {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.lat__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-2);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}
.lat__v {
  font-weight: 800;
  font-size: 1.05rem;
}
.lat__k {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.status {
  display: flex;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--color-bg);
}
.status__seg {
  min-width: 2px;
}
.status__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
}
.status__legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.status__legend i {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}
.ep-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}
.ep-row__ms {
  flex-shrink: 0;
  font-weight: 700;
  font-size: var(--font-size-sm);
  color: var(--color-warning);
}
.proc {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-top: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}
</style>
