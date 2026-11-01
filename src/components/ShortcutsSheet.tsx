import { AnimatePresence, motion } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { POINTER_NOTE, RECITATION_LOCK_NOTE, SHORTCUT_COUNTS, SHORTCUT_GROUPS } from '../lib/shortcuts';
import { useDialog } from '../lib/useDialog';

export function ShortcutsSheet() {
  const { shortcutsOpen, setShortcutsOpen, reciting } = useApp();
  const close = () => setShortcutsOpen(false);
  const sheetRef = useDialog<HTMLElement>(shortcutsOpen, close);

  return (
    <AnimatePresence>
      {shortcutsOpen && (
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
            aria-label="Keyboard shortcuts"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="drawer-head">
              <div>
                <p className="eyebrow">Keyboard</p>
                <h2 className="drawer-title">Shortcuts</h2>
              </div>
              <button type="button" className="icon-btn" onClick={close} aria-label="Close shortcuts">
                <X size={18} />
              </button>
            </header>

            <div className="settings-scroll">
              {SHORTCUT_GROUPS.map((group) => (
                <section className="settings-group" key={group.title}>
                  <div className="settings-group-head">
                    <Keyboard size={15} />
                    <h3>{group.title}</h3>
                  </div>
                  <ul className="shortcut-list">
                    {group.items.map((item) => {
                      const locked = reciting && !item.worksWhileReciting;
                      return (
                        <li className={`shortcut-row ${locked ? 'is-locked' : ''}`} key={item.command}>
                          <span className="shortcut-command">{item.command}</span>
                          <span className="shortcut-keys">
                            {item.keys.map((key) => (
                              <kbd className="kbd" key={key}>
                                {key}
                              </kbd>
                            ))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}

              {reciting && <p className="setting-footnote">{RECITATION_LOCK_NOTE}</p>}

              <p className="setting-footnote">{POINTER_NOTE}</p>

              <p className="settings-version">
                {SHORTCUT_COUNTS.commands} commands · {SHORTCUT_COUNTS.bindings} keys
              </p>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
