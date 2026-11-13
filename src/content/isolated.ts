// Runs in the extension's isolated world (has chrome.* APIs). Relays settings to main.ts,
// which runs in the page world and can't touch chrome.storage.
import { loadSettings, SETTINGS_KEY } from '../shared/settings';

async function push(): Promise<void> {
  try {
    const settings = await loadSettings();
    window.dispatchEvent(new CustomEvent('porthole:settings', { detail: JSON.stringify(settings) }));
  } catch {
    /* extension context invalidated (e.g. the extension was reloaded) */
  }
}

window.addEventListener('porthole:hello', () => void push());

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[SETTINGS_KEY]) void push();
  });
} catch {
  /* context invalidated */
}

void push();
