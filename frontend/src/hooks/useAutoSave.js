import { useEffect, useRef, useCallback } from 'react';
import showToast from '../utils/toast';

/**
 * Auto-save hook for forms
 * Automatically saves form data at specified intervals
 */
export const useAutoSave = (data, saveFn, options = {}) => {
  const {
    interval = 30000, // 30 seconds default
    enabled = true,
    onSave = null,
    onError = null,
  } = options;

  const dataRef = useRef(data);
  const saveTimeoutRef = useRef(null);
  const isSavingRef = useRef(false);

  // Update ref when data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const save = useCallback(async () => {
    if (isSavingRef.current || !enabled) return;

    isSavingRef.current = true;
    
    try {
      await saveFn(dataRef.current);
      if (onSave) onSave();
      showToast.success('Draft saved', { duration: 2000 });
    } catch (error) {
      console.error('Auto-save failed:', error);
      if (onError) onError(error);
    } finally {
      isSavingRef.current = false;
    }
  }, [saveFn, enabled, onSave, onError]);

  useEffect(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(save, interval);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, interval, enabled, save]);

  return { save };
};

export default useAutoSave;
