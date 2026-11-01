import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../context/AppContext';

export function Toast() {
  const { toastMessage } = useApp();
  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          className="toast"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {toastMessage}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
