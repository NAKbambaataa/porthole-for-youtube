import {
  DEFAULT_SETTINGS,
  formatHotkey,
  hotkeyFromEvent,
  loadSettings,
  saveSettings,
  type Settings,
} from '../shared/settings';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};

const isMac = /Mac|iPhone|iPad/.test(navigator.platform) || /Mac OS/.test(navigator.userAgent);

let settings: Settings = DEFAULT_SETTINGS;
let statusTimer = 0;

const showButton = $<HTMLInputElement>('showButton');
const captions = $<HTMLInputElement>('captions');
const autoHide = $<HTMLInputElement>('autoHideControls');
const autoPop = $<HTMLInputElement>('autoPopOnTabSwitch');
const seekStep = $<HTMLSelectElement>('seekStep');
const width = $<HTMLInputElement>('width');
const widthOut = $<HTMLOutputElement>('width-out');
const hotkeyBtn = $<HTMLButtonElement>('hotkey');
const hotkeyHint = $<HTMLElement>('hotkey-hint');
const status = $<HTMLElement>('status');

function render(): void {
  showButton.checked = settings.showButton;
  captions.checked = settings.captions;
  autoHide.checked = settings.autoHideControls;
  autoPop.checked = settings.autoPopOnTabSwitch;
  seekStep.value = String(settings.seekStep);
  width.value = String(settings.width);
  widthOut.textContent = `${settings.width}px`;
  hotkeyBtn.textContent = formatHotkey(settings.hotkey, isMac);
}

async function save(patch: Partial<Settings>): Promise<void> {
  settings = { ...settings, ...patch };
  render();
  try {
    await saveSettings(settings);
    status.textContent = 'Saved';
  } catch {
    status.textContent = "Couldn't save";
  }
  status.classList.add('show');
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => status.classList.remove('show'), 1500);
}

// ---- hotkey recorder ----
let recording = false;

function stopRecording(): void {
  recording = false;
  hotkeyBtn.classList.remove('recording');
  render();
}

hotkeyBtn.addEventListener('click', () => {
  recording = true;
  hotkeyBtn.classList.add('recording');
  hotkeyBtn.textContent = 'Press keys…';
  hotkeyHint.textContent = 'Include Alt, Ctrl or ⌘. Press Esc to cancel.';
});

hotkeyBtn.addEventListener('blur', () => {
  if (recording) {
    hotkeyHint.textContent = '';
    stopRecording();
  }
});

hotkeyBtn.addEventListener('keydown', (e) => {
  if (!recording) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.code === 'Escape') {
    hotkeyHint.textContent = '';
    stopRecording();
    return;
  }
  const hk = hotkeyFromEvent(e);
  if (!hk) {
    if (!/^(Alt|Control|Shift|Meta|OS)/.test(e.code)) hotkeyHint.textContent = 'Add Alt, Ctrl or ⌘ to the shortcut.';
    return;
  }
  hotkeyHint.textContent = '';
  stopRecording();
  void save({ hotkey: hk });
});

$('hotkey-reset').addEventListener('click', () => {
  hotkeyHint.textContent = '';
  void save({ hotkey: DEFAULT_SETTINGS.hotkey });
});

// ---- simple controls ----
showButton.addEventListener('change', () => void save({ showButton: showButton.checked }));
captions.addEventListener('change', () => void save({ captions: captions.checked }));
autoHide.addEventListener('change', () => void save({ autoHideControls: autoHide.checked }));
autoPop.addEventListener('change', () => void save({ autoPopOnTabSwitch: autoPop.checked }));
seekStep.addEventListener('change', () => void save({ seekStep: Number(seekStep.value) }));
width.addEventListener('input', () => {
  widthOut.textContent = `${width.value}px`;
});
width.addEventListener('change', () => void save({ width: Number(width.value) }));

$('reset').addEventListener('click', () => void save({ ...DEFAULT_SETTINGS, hotkey: { ...DEFAULT_SETTINGS.hotkey } }));

// ---- init ----
$<HTMLImageElement>('logo').src = chrome.runtime.getURL('icons/icon-48.png');
$('version').textContent = `v${chrome.runtime.getManifest().version}`;
void loadSettings().then((s) => {
  settings = s;
  render();
});
