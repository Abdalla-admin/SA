import { createContext, useContext, useState, useCallback, useRef } from 'react';

const Ctx = createContext(null);

function DialogModal({ dialog, onConfirm, onCancel }) {
  const [value, setValue] = useState(dialog.defaultValue || '');

  const handleKey = e => {
    if (e.key === 'Enter') onConfirm(dialog.type === 'prompt' ? value : true);
    if (e.key === 'Escape' && dialog.type !== 'alert') onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
        {dialog.title && <h3 className="font-semibold text-gray-900 mb-2">{dialog.title}</h3>}
        <p className="text-gray-700 text-sm mb-4 leading-relaxed">{dialog.message}</p>
        {dialog.type === 'prompt' && (
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={dialog.placeholder || ''}
            onKeyDown={handleKey}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
          />
        )}
        <div className="flex justify-end gap-3">
          {dialog.type !== 'alert' && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            autoFocus={dialog.type !== 'prompt'}
            onClick={() => onConfirm(dialog.type === 'prompt' ? value : true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {dialog.confirmLabel || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const open = useCallback((opts) => new Promise(resolve => {
    resolveRef.current = resolve;
    setDialog(opts);
  }), []);

  const confirm = useCallback((message, opts = {}) => open({ type: 'confirm', message, ...opts }), [open]);
  const prompt  = useCallback((message, opts = {}) => open({ type: 'prompt',  message, ...opts }), [open]);
  const alert   = useCallback((message, opts = {}) => open({ type: 'alert',   message, ...opts }), [open]);

  const handleConfirm = (value) => {
    resolveRef.current?.(value);
    setDialog(null);
  };

  const handleCancel = () => {
    resolveRef.current?.(dialog?.type === 'confirm' ? false : null);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ confirm, prompt, alert }}>
      {children}
      {dialog && <DialogModal dialog={dialog} onConfirm={handleConfirm} onCancel={handleCancel} />}
    </Ctx.Provider>
  );
}

export const useDialog = () => useContext(Ctx);
