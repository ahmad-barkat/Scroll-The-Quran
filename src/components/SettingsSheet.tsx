import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, Keyboard, RotateCcw, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { RECITERS, THEMES } from '../lib/quran';
import { SHORTCUT_COUNTS } from '../lib/shortcuts';
import { useDialog } from '../lib/useDialog';
import type { ReciterId, ThemeId } from '../lib/types';

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="setting-toggle">
      <span className="setting-toggle-copy">
        <span className="setting-label">{label}</span>
        {description && <span className="setting-description">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-thumb" />
      </button>
    </label>
  );
}

export function SettingsSheet() {
  const {
    settings,
    updateSettings,
    resetReading,
    setSettingsOpen,
    setShortcutsOpen,
    settingsOpen,
    toast,
  } = useApp();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);

  const close = () => {
    setSettingsOpen(false);
    setConfirmReset(false);
  };
  const sheetRef = useDialog<HTMLElement>(settingsOpen, close);

  const chooseTheme = (theme: ThemeId) => updateSettings({ theme });
  const chooseReciter = (reciter: ReciterId) => updateSettings({ reciter });

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      window.setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    resetReading();
    setConfirmReset(false);
    toast('Reading data cleared.');
  };

  return (
    <AnimatePresence>
      {settingsOpen && (
        <motion.div
          className="overlay-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
        >
          <motion.aside
            className="settings-sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Reading settings"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="drawer-head">
              <div>
                <p className="eyebrow">Reading settings</p>
                <h2 className="drawer-title">Make it yours</h2>
              </div>
              <button type="button" className="icon-btn" onClick={close} aria-label="Close settings">
                <X size={18} />
              </button>
            </header>

            <div className="settings-scroll">
              <section className="settings-group">
                <div className="settings-group-head">
                  <Sparkles size={15} />
                  <h3>Atmosphere</h3>
                </div>
                <div className="theme-grid">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      className={`theme-card ${settings.theme === theme.id ? 'is-active' : ''}`}
                      onClick={() => chooseTheme(theme.id)}
                      aria-pressed={settings.theme === theme.id}
                    >
                      <span className={`theme-swatch swatch-${theme.id}`} />
                      <span className="theme-name">{theme.label}</span>
                      <span className="theme-hint">{theme.hint}</span>
                      {settings.theme === theme.id && <Check size={14} className="theme-check" />}
                    </button>
                  ))}
                </div>
              </section>

              <section className="settings-group">
                <div className="settings-group-head">
                  <span className="settings-glyph">ع</span>
                  <h3>Arabic text</h3>
                </div>
                <div className="setting-row">
                  <div className="setting-toggle-copy">
                    <span className="setting-label">Text size</span>
                    <span className="setting-description">Adjust the Uthmani script</span>
                  </div>
                  <div className="segmented segmented-small">
                    {[
                      { value: 0.88, label: 'Small' },
                      { value: 1, label: 'Default' },
                      { value: 1.14, label: 'Large' },
                    ].map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        className={settings.arabicScale === option.value ? 'is-active' : ''}
                        onClick={() => updateSettings({ arabicScale: option.value })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Toggle
                  checked={settings.showTranslation}
                  onChange={(value) => updateSettings({ showTranslation: value })}
                  label="Show translation"
                  description="Saheeh International · English"
                />
              </section>

              <section className="settings-group">
                <div className="settings-group-head">
                  <span className="settings-glyph">◉</span>
                  <h3>Recitation</h3>
                </div>
                <div className="reciter-list">
                  {RECITERS.map((reciter) => (
                    <button
                      key={reciter.id}
                      type="button"
                      className={`reciter-row ${settings.reciter === reciter.id ? 'is-active' : ''}`}
                      onClick={() => chooseReciter(reciter.id)}
                      aria-pressed={settings.reciter === reciter.id}
                    >
                      <span>
                        <span className="setting-label">{reciter.name}</span>
                        <span className="setting-description">{reciter.note}</span>
                      </span>
                      {settings.reciter === reciter.id ? <Check size={15} /> : <span className="reciter-dot" />}
                    </button>
                  ))}
                </div>
                <Toggle
                  checked={settings.autoAdvance}
                  onChange={(value) => updateSettings({ autoAdvance: value })}
                  label="Continue after recitation"
                  description="Move to the next ayah when audio ends"
                />
                <p className="setting-footnote">
                  Audio streams from EveryAyah and is cached after first play. An internet connection is
                  needed for new recitations.
                </p>
              </section>

              <section className="settings-group">
                <div className="settings-group-head">
                  <span className="settings-glyph">↓</span>
                  <h3>Hands-free</h3>
                </div>
                <Toggle
                  checked={settings.autoScroll}
                  onChange={(value) => updateSettings({ autoScroll: value })}
                  label="Auto-scroll"
                  description="Advance automatically while you read"
                />
                {settings.autoScroll && (
                  <label className="setting-row">
                    <span className="setting-toggle-copy">
                      <span className="setting-label">Pace</span>
                      <span className="setting-description">Seconds per ayah</span>
                    </span>
                    <select
                      className="select"
                      value={settings.autoScrollSeconds}
                      onChange={(event) => updateSettings({ autoScrollSeconds: Number(event.target.value) })}
                      aria-label="Auto-scroll speed"
                    >
                      <option value={15}>15 seconds</option>
                      <option value={25}>25 seconds</option>
                      <option value={40}>40 seconds</option>
                      <option value={60}>60 seconds</option>
                    </select>
                  </label>
                )}
              </section>

              <section className="settings-group">
                <div className="settings-group-head">
                  <RotateCcw size={15} />
                  <h3>Reading data</h3>
                </div>
                <p className="setting-footnote">
                  Bookmarks, reading progress, and your streak are stored only on this device.
                </p>
                <button type="button" className={`btn btn-ghost-danger ${confirmReset ? 'is-confirming' : ''}`} onClick={handleReset}>
                  <RotateCcw size={15} />
                  {confirmReset ? 'Tap again to erase progress' : 'Reset progress and bookmarks'}
                </button>
              </section>

              <button
                type="button"
                className="about-link"
                onClick={() => {
                  close();
                  setShortcutsOpen(true);
                }}
              >
                <Keyboard size={16} />
                <span>
                  <strong>Keyboard shortcuts</strong>
                  <small>
                    {SHORTCUT_COUNTS.commands} commands · press ? or Ctrl+/ any time
                  </small>
                </span>
                <span className="about-arrow">→</span>
              </button>

              <button
                type="button"
                className="about-link"
                onClick={() => {
                  close();
                  navigate('/about');
                }}
              >
                <Info size={16} />
                <span>
                  <strong>Text sources & verification</strong>
                  <small>Uthmani Arabic, Saheeh International, checksum</small>
                </span>
                <span className="about-arrow">→</span>
              </button>

              <p className="settings-version">Scroll the Quran · 1.0 · 6,236 ayahs</p>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
