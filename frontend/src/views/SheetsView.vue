<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useSheetsStore } from '@/stores/sheets.js';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';

const router = useRouter();
const store = useSheetsStore();
const { sheets, loading, error } = storeToRefs(store);

onMounted(store.load);

const BACKGROUNDS = [
  { id: 'dots', label: 'Dots' },
  { id: 'grid', label: 'Grid' },
  { id: 'blank', label: 'Blank' },
];

/* ---- Create-sheet modal ---- */
const showCreate = ref(false);
const name = ref('');
const background = ref('dots');
const saving = ref(false);

function openCreate() {
  name.value = '';
  background.value = 'dots';
  showCreate.value = true;
}

async function create() {
  if (!name.value.trim() || saving.value) return;
  saving.value = true;
  const sheet = await store.create({ name: name.value.trim(), background: background.value });
  saving.value = false;
  if (sheet) {
    showCreate.value = false;
    router.push(`/sheet/${sheet.id}`); // jump straight into the new sheet
  }
}

function open(id) {
  router.push(`/sheet/${id}`);
}

function remove(id) {
  if (confirm('Delete this sheet and all its notes?')) store.remove(id);
}
</script>

<template>
  <div class="sheets">
    <div class="sheets__head">
      <div>
        <h1>Your sheets</h1>
        <span class="text-muted">{{ sheets.length }} sheet(s)</span>
      </div>
      <BaseButton @click="openCreate">+ Create blank sheet</BaseButton>
    </div>

    <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>

    <p v-if="!loading && !sheets.length" class="text-muted sheets__empty">
      No sheets yet — create your first one to start adding notes.
    </p>

    <div class="sheets__grid">
      <button
        v-for="s in sheets"
        :key="s.id"
        class="card"
        @click="open(s.id)"
      >
        <span class="card__preview" :class="`bg-${s.background}`" />
        <span class="card__body">
          <span class="card__name">{{ s.name }}</span>
          <span class="text-muted card__bg">{{ s.background }}</span>
        </span>
        <span
          class="card__del"
          title="Delete sheet"
          @click.stop="remove(s.id)"
        >×</span>
      </button>
    </div>

    <!-- Create modal -->
    <div v-if="showCreate" class="modal" @click.self="showCreate = false">
      <div class="modal__box">
        <h2>Create blank sheet</h2>

        <label class="field">
          <span>Name</span>
          <input
            v-model="name"
            class="field__input"
            placeholder="e.g. Sprint planning"
            maxlength="120"
            @keyup.enter="create"
          />
        </label>

        <span class="field__label">Background</span>
        <div class="bg-options">
          <button
            v-for="b in BACKGROUNDS"
            :key="b.id"
            class="bg-option"
            :class="{ 'bg-option--on': background === b.id }"
            @click="background = b.id"
          >
            <span class="bg-option__preview" :class="`bg-${b.id}`" />
            <span>{{ b.label }}</span>
          </button>
        </div>

        <div class="modal__actions">
          <BaseButton variant="ghost" @click="showCreate = false">Cancel</BaseButton>
          <BaseButton :disabled="!name.trim() || saving" @click="create">
            {{ saving ? 'Creating…' : 'Create' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sheets {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-5);
  height: 100%;
  overflow: auto;
}
.sheets__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-5);
}
.sheets__head h1 {
  margin: 0;
}
.sheets__empty {
  margin-top: var(--space-6);
  text-align: center;
}
.sheets__grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

/* Sheet card */
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  overflow: hidden;
  text-align: left;
  transition: box-shadow 0.15s ease, transform 0.1s ease;
}
.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.card__preview {
  height: 110px;
  background-color: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}
.card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3) var(--space-4);
}
.card__name {
  font-weight: 700;
  color: var(--color-text);
}
.card__bg {
  font-size: var(--font-size-sm);
  text-transform: capitalize;
}
.card__del {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 24px;
  height: 24px;
  line-height: 22px;
  text-align: center;
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 18px;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.card:hover .card__del {
  opacity: 1;
}
.card__del:hover {
  color: var(--color-danger);
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
}
.modal__box {
  width: min(440px, 92vw);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-md);
}
.modal__box h2 {
  margin: 0 0 var(--space-4);
}
.field {
  display: block;
  margin-bottom: var(--space-4);
}
.field > span,
.field__label {
  display: block;
  font-weight: 600;
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-2);
}
.field__input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font: inherit;
  background: var(--color-bg);
  color: var(--color-text);
}
.field__input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 0;
}
.bg-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}
.bg-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text);
}
.bg-option--on {
  border-color: var(--color-primary);
  outline: 2px solid var(--color-primary);
}
.bg-option__preview {
  width: 100%;
  height: 56px;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
}
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
