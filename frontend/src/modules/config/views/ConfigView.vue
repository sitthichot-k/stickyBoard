<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as api from '@/modules/config/api/config.js';
import * as noti from '@/modules/notification/api/notification.js';
import { useAuthStore } from '@/modules/auth/stores/auth.js';
import BaseAlert from '@/components/BaseAlert.vue';
import BaseButton from '@/components/BaseButton.vue';

const auth = useAuthStore();

const rt = ref(null);
const blocked = ref([]);
const retentionDraft = ref(30);
const loading = ref(true);
const error = ref('');
const saving = ref('');
let timer = null;

async function load() {
  try {
    rt.value = await api.fetchRuntime();
    retentionDraft.value = rt.value.logRetentionDays;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function loadBlocked() {
  try {
    blocked.value = await api.fetchBlocked();
  } catch {
    /* ignore — monitor is best-effort */
  }
}

async function patch(field, value) {
  saving.value = field;
  error.value = '';
  try {
    rt.value = await api.updateRuntime({ [field]: value });
    retentionDraft.value = rt.value.logRetentionDays;
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = '';
  }
}

const toggle = (field) => patch(field, !rt.value[field]);

function saveRetention() {
  const days = Number(retentionDraft.value);
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    error.value = 'Retention must be 1–365 days';
    return;
  }
  patch('logRetentionDays', Math.floor(days));
}

async function lift(key) {
  await api.unblock(key);
  loadBlocked();
}

const fmtRemaining = (ms) => {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m ? `${m}m ${s}s` : `${s}s`;
};

// ---- SMTP (password is write-only — never returned) ----
const mail = ref(null);
const mailDraft = ref({ host: '', port: 587, secure: false, user: '', from: '', pass: '' });
const mailSaving = ref(false);
const testing = ref(false);
const mailMsg = ref('');
const mailErr = ref('');

async function loadMail() {
  try {
    mail.value = await api.fetchMail();
    mailDraft.value = {
      host: mail.value.host || '',
      port: mail.value.port || 587,
      secure: !!mail.value.secure,
      user: mail.value.user || '',
      from: mail.value.from || '',
      pass: '',
    };
  } catch (e) {
    mailErr.value = e.message;
  }
}

async function saveMail() {
  if (mailSaving.value) return;
  mailSaving.value = true;
  mailMsg.value = '';
  mailErr.value = '';
  try {
    const patch = {
      host: mailDraft.value.host,
      port: Number(mailDraft.value.port) || 587,
      secure: mailDraft.value.secure,
      user: mailDraft.value.user,
      from: mailDraft.value.from,
    };
    if (mailDraft.value.pass) patch.pass = mailDraft.value.pass; // only send when typed
    mail.value = await api.updateMail(patch);
    mailDraft.value.pass = '';
    mailMsg.value = 'SMTP settings saved.';
  } catch (e) {
    mailErr.value = e.message;
  } finally {
    mailSaving.value = false;
  }
}

// Test-email dialog: choose recipient + custom message, or auto-fill from a template.
const showTest = ref(false);
const testForm = ref({ to: '', subject: '', text: '', templateKey: '' });

function openTest() {
  mailMsg.value = '';
  mailErr.value = '';
  testForm.value = {
    to: auth.user?.email || '',
    subject: 'Sticky Board — test email',
    text: 'This is a test email. ✅',
    templateKey: '',
  };
  showTest.value = true;
}

function autofillTest() {
  const tpl = notiTemplates.value.find((t) => t.key === testForm.value.templateKey);
  if (tpl) {
    testForm.value.subject = tpl.subject || testForm.value.subject;
    testForm.value.text = tpl.body || testForm.value.text;
  }
}

async function sendTest() {
  if (testing.value) return;
  testing.value = true;
  mailMsg.value = '';
  mailErr.value = '';
  try {
    const r = await api.testMail({
      to: testForm.value.to,
      subject: testForm.value.subject,
      text: testForm.value.text,
    });
    mailMsg.value = `Test email sent to ${r.sentTo}.`;
    showTest.value = false;
  } catch (e) {
    mailErr.value = e.message;
  } finally {
    testing.value = false;
  }
}

// ---- System emails (always-on notifications: verify / reset) ----
const sysEvents = ref([]);
const notiTemplates = ref([]);
const sysTemplateExists = (key) => notiTemplates.value.some((t) => t.key === key);

async function loadSystemEmails() {
  try {
    const [m, t] = await Promise.all([noti.fetchMatrix(), noti.fetchTemplates()]);
    sysEvents.value = m.filter((r) => r.system);
    notiTemplates.value = t;
  } catch {
    /* best-effort — hide the section if notifications aren't accessible */
  }
}
async function changeSysTemplate(ev, templateKey) {
  try {
    Object.assign(ev, await noti.setRule({ eventKey: ev.eventKey, templateKey }));
  } catch (e) {
    error.value = e.message;
    loadSystemEmails();
  }
}

onMounted(() => {
  load();
  loadMail();
  loadSystemEmails();
  loadBlocked();
  timer = setInterval(loadBlocked, 10000); // refresh the monitor
});
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="page">
    <header class="page__head">
      <h1>🛠️ Config</h1>
      <span class="text-muted">Runtime controls — applied live, no redeploy</span>
    </header>

    <BaseAlert v-if="error" variant="danger">{{ error }}</BaseAlert>
    <p v-if="loading" class="text-muted">Loading…</p>

    <div v-if="rt" class="cfg">
      <section class="panel">
        <h2 class="panel__title">Runtime toggles</h2>

        <div class="row">
          <div class="row__text">
            <strong>Rate limiting</strong>
            <span class="text-muted">Global flood + login brute-force guard.</span>
          </div>
          <button
            class="switch"
            :class="{ on: rt.rateLimitEnabled }"
            :disabled="saving === 'rateLimitEnabled'"
            role="switch"
            :aria-checked="rt.rateLimitEnabled"
            @click="toggle('rateLimitEnabled')"
          />
        </div>

        <div class="row">
          <div class="row__text">
            <strong>API traffic logging</strong>
            <span class="text-muted">Persist a log for every API request.</span>
          </div>
          <button
            class="switch"
            :class="{ on: rt.logApiTraffic }"
            :disabled="saving === 'logApiTraffic'"
            role="switch"
            :aria-checked="rt.logApiTraffic"
            @click="toggle('logApiTraffic')"
          />
        </div>

        <div class="row">
          <div class="row__text">
            <strong>Allow registration</strong>
            <span class="text-muted">Let visitors create their own account.</span>
          </div>
          <button
            class="switch"
            :class="{ on: rt.allowRegistration }"
            :disabled="saving === 'allowRegistration'"
            role="switch"
            :aria-checked="rt.allowRegistration"
            @click="toggle('allowRegistration')"
          />
        </div>

        <div class="row">
          <div class="row__text">
            <strong>Require email verification</strong>
            <span class="text-muted">Block sign-in until the email is verified (admins exempt).</span>
          </div>
          <button
            class="switch"
            :class="{ on: rt.requireEmailVerified }"
            :disabled="saving === 'requireEmailVerified'"
            role="switch"
            :aria-checked="rt.requireEmailVerified"
            @click="toggle('requireEmailVerified')"
          />
        </div>

        <div class="row">
          <div class="row__text">
            <strong>Log retention</strong>
            <span class="text-muted">Auto-delete logs older than this (1–365 days).</span>
          </div>
          <div class="retention">
            <input v-model.number="retentionDraft" type="number" min="1" max="365" class="control" />
            <span class="text-muted">days</span>
            <BaseButton
              variant="ghost"
              :disabled="saving === 'logRetentionDays' || Number(retentionDraft) === rt.logRetentionDays"
              @click="saveRetention"
            >
              Save
            </BaseButton>
          </div>
        </div>
      </section>

      <section v-if="mail" class="panel">
        <h2 class="panel__title">Email (SMTP)</h2>
        <p class="text-muted note">
          Leave the host empty to log emails to the server console (dev). The
          password is write-only and stored encrypted.
        </p>

        <BaseAlert v-if="mailErr" variant="danger">{{ mailErr }}</BaseAlert>
        <BaseAlert v-else-if="mailMsg" variant="success">{{ mailMsg }}</BaseAlert>

        <div class="mail-grid">
          <label class="mfield mfield--wide">
            <span>Host</span>
            <input v-model="mailDraft.host" class="control control--full" placeholder="smtp.example.com" />
          </label>
          <label class="mfield">
            <span>Port</span>
            <input v-model.number="mailDraft.port" type="number" class="control control--full" />
          </label>
          <label class="mfield mfield--check">
            <input v-model="mailDraft.secure" type="checkbox" />
            <span>TLS (secure)</span>
          </label>
          <label class="mfield">
            <span>Username</span>
            <input v-model="mailDraft.user" class="control control--full" autocomplete="off" />
          </label>
          <label class="mfield">
            <span>Password</span>
            <input
              v-model="mailDraft.pass"
              type="password"
              class="control control--full"
              autocomplete="new-password"
              :placeholder="mail.hasPassword ? '•••••• (set — leave blank to keep)' : 'not set'"
            />
          </label>
          <label class="mfield mfield--wide">
            <span>From</span>
            <input v-model="mailDraft.from" class="control control--full" placeholder="Name <no-reply@example.com>" />
          </label>
        </div>

        <div class="mail-actions">
          <BaseButton :disabled="mailSaving" @click="saveMail">
            {{ mailSaving ? 'Saving…' : 'Save SMTP' }}
          </BaseButton>
          <BaseButton variant="ghost" @click="openTest">Send test email…</BaseButton>
        </div>
      </section>

      <section v-if="sysEvents.length" class="panel cfg__full">
        <h2 class="panel__title">System emails</h2>
        <p class="text-muted note">
          Critical emails that always send — pick the template (manage wording in
          Notification Templates).
        </p>
        <div v-for="ev in sysEvents" :key="ev.eventKey" class="row">
          <div class="row__text">
            <strong>{{ ev.label }}</strong>
            <span class="text-muted">→ {{ ev.recipient }}</span>
          </div>
          <select
            class="control sys-select"
            :value="ev.templateKey"
            @change="changeSysTemplate(ev, $event.target.value)"
          >
            <option v-for="t in notiTemplates" :key="t.key" :value="t.key">{{ t.name }}</option>
            <option v-if="!sysTemplateExists(ev.templateKey)" :value="ev.templateKey">
              {{ ev.templateKey }} (built-in)
            </option>
          </select>
        </div>
      </section>

      <section class="panel cfg__full">
        <div class="panel__head">
          <h2 class="panel__title">Blocked callers ({{ blocked.length }})</h2>
          <BaseButton variant="ghost" @click="loadBlocked">Refresh</BaseButton>
        </div>
        <p v-if="!blocked.length" class="text-muted">No one is rate-limited right now.</p>
        <div v-else class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Limiter</th>
                <th>Caller (IP / user)</th>
                <th>Unblocks in</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in blocked" :key="`${b.limiter}-${b.key}`">
                <td><code>{{ b.limiter }}</code></td>
                <td class="nowrap">{{ b.key }}</td>
                <td class="nowrap text-muted">{{ fmtRemaining(b.remainingMs) }}</td>
                <td class="right">
                  <button class="unblock" @click="lift(b.key)">Unblock</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- Test email dialog -->
    <div v-if="showTest" class="modal" @click.self="showTest = false">
      <div class="modal__box">
        <h2>Send test email</h2>
        <BaseAlert v-if="mailErr" variant="danger">{{ mailErr }}</BaseAlert>
        <label class="tfield">
          <span>To</span>
          <input v-model="testForm.to" type="email" class="control control--full" />
        </label>
        <label class="tfield">
          <span>Auto-fill from template</span>
          <select v-model="testForm.templateKey" class="control control--full" @change="autofillTest">
            <option value="">— none —</option>
            <option v-for="t in notiTemplates" :key="t.key" :value="t.key">{{ t.name }}</option>
          </select>
        </label>
        <label class="tfield">
          <span>Subject</span>
          <input v-model="testForm.subject" class="control control--full" />
        </label>
        <label class="tfield">
          <span>Message</span>
          <textarea v-model="testForm.text" rows="6" class="control control--full" />
        </label>
        <div class="modal__actions">
          <BaseButton variant="ghost" @click="showTest = false">Cancel</BaseButton>
          <BaseButton :disabled="testing || !testForm.to" @click="sendTest">
            {{ testing ? 'Sending…' : 'Send' }}
          </BaseButton>
        </div>
      </div>
    </div>
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
.cfg {
  max-width: 1180px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-4);
  align-items: start;
}
.cfg__full {
  grid-column: 1 / -1;
}
@media (max-width: 880px) {
  .cfg {
    grid-template-columns: 1fr;
  }
}
.panel {
  padding: var(--space-4) var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel__title {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-base);
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-border);
}
.row:first-of-type {
  border-top: none;
}
.row__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.row__text span {
  font-size: var(--font-size-sm);
}
.retention {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.control {
  width: 80px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font: inherit;
  background: var(--color-bg);
  color: var(--color-text);
}
.control:focus {
  outline: 2px solid var(--color-primary);
}
.control--full {
  width: 100%;
}
.sys-select {
  width: auto;
  min-width: 220px;
  max-width: 320px;
}
.note {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-sm);
}
.mail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}
.mfield {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mfield > span {
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.mfield--wide {
  grid-column: 1 / -1;
}
.mfield--check {
  flex-direction: row;
  align-items: center;
  gap: var(--space-2);
  align-self: end;
  padding-bottom: var(--space-2);
}
.mail-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
@media (max-width: 560px) {
  .mail-grid {
    grid-template-columns: 1fr;
  }
}
/* Test-email modal */
.modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  padding: var(--space-4);
}
.modal__box {
  width: min(520px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.modal__box h2 {
  margin: 0;
}
.tfield {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tfield > span {
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-2);
}
/* toggle switch */
.switch {
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 24px;
  border-radius: 999px;
  border: none;
  background: var(--color-border);
  cursor: pointer;
  transition: background 0.15s ease;
}
.switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease;
}
.switch.on {
  background: var(--color-primary);
}
.switch.on::after {
  transform: translateX(20px);
}
.switch:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.table-wrap {
  overflow-x: auto;
  margin-top: var(--space-2);
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.table th,
.table td {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}
.table th {
  color: var(--color-text-muted);
}
.right {
  text-align: right;
}
.nowrap {
  white-space: nowrap;
}
.unblock {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-3);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  color: var(--color-text-muted);
}
.unblock:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
</style>
