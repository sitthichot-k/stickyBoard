<script setup>
import { ref, onMounted } from 'vue';
import * as api from '@/modules/settings/api/settings.js';
import { useSettingsStore } from '@/modules/settings/stores/settings.js';
import BaseButton from '@/components/BaseButton.vue';
import BaseAlert from '@/components/BaseAlert.vue';

const store = useSettingsStore();
const ann = ref({ enabled: false, message: '', level: 'info' });
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const done = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const all = await api.fetchAllSettings();
    if (all.announcement) ann.value = { ...ann.value, ...all.announcement };
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
onMounted(load);

async function save() {
  saving.value = true;
  error.value = '';
  done.value = '';
  try {
    store.announcement = await api.updateSetting('announcement', ann.value); // live update banner
    done.value = 'Settings saved.';
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="page">
    <header class="page__head">
      <h1>⚙️ Settings</h1>
      <span class="text-muted">Configure the app without changing code</span>
    </header>

    <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>
    <BaseAlert v-if="done" variant="success">{{ done }}</BaseAlert>

    <section class="card">
      <div class="card__title">
        <h2>Announcement banner</h2>
        <label class="switch">
          <input v-model="ann.enabled" type="checkbox" />
          <span>{{ ann.enabled ? 'On' : 'Off' }}</span>
        </label>
      </div>

      <label class="field">
        <span>Message</span>
        <textarea
          v-model="ann.message"
          class="field__input"
          rows="2"
          maxlength="500"
          placeholder="e.g. Scheduled maintenance tonight at 22:00"
        />
      </label>

      <label class="field">
        <span>Level</span>
        <select v-model="ann.level" class="field__input field__input--select">
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="danger">danger</option>
        </select>
      </label>

      <div class="card__actions">
        <BaseButton :disabled="saving || loading" @click="save">
          {{ saving ? 'Saving…' : 'Save' }}
        </BaseButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding: 80px var(--space-5) var(--space-6);
  max-width: 640px;
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
.card {
  padding: var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.card__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card__title h2 {
  margin: 0;
  font-size: var(--font-size-base);
}
.switch {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.field > span {
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.field__input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font: inherit;
  background: var(--color-bg);
  color: var(--color-text);
  resize: vertical;
}
.field__input--select {
  resize: none;
}
.field__input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 0;
}
.card__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
