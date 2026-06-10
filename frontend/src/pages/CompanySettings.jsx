import { useEffect, useState } from 'react';
import client from '../api/client';

const empty = {
  bank1Label: 'BANK DETAILS',
  bank1Details: '',
  bank2Label: 'ALTERNATIVE BANK DETAILS',
  bank2Details: '',
  bank3Label: 'MPESA DETAILS',
  bank3Details: '',
  termsAndConditions: '',
};

export default function CompanySettings() {
  const [form, setForm] = useState(empty);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    client.get('/company-settings').then(r => {
      setForm({ ...empty, ...r.data });
    });
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async e => {
    e.preventDefault();
    await client.put('/company-settings', form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
          <p className="text-sm text-gray-500 mt-1">These payment details and terms appear on every printed Invoice and Quotation.</p>
        </div>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Saved</span>}
      </div>

      <form onSubmit={save} className="space-y-6">

        {/* Payment columns */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">PAY TO — Payment Columns</h2>
          <p className="text-xs text-gray-400 -mt-4">Each column appears side-by-side on the printed document. Enter one detail per line.</p>

          <div className="grid grid-cols-3 gap-6">
            {[
              ['bank1Label','bank1Details','Column 1 (Primary Bank)'],
              ['bank2Label','bank2Details','Column 2 (Alternative Bank)'],
              ['bank3Label','bank3Details','Column 3 (Mobile Money / Other)'],
            ].map(([labelKey, detailsKey, placeholder]) => (
              <div key={labelKey} className="space-y-2">
                <input
                  type="text"
                  placeholder="Column Header (e.g. BANK DETAILS)"
                  value={form[labelKey] || ''}
                  onChange={set(labelKey)}
                  className="w-full border rounded-lg px-3 py-2 text-xs font-semibold text-orange-600 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <textarea
                  rows={7}
                  placeholder={`${placeholder}\n\nOne detail per line:\nA/C Name: ...\nKES A/C No.: ...\nBank: ...\nBranch: ...\nSwift Code: ...`}
                  value={form[detailsKey] || ''}
                  onChange={set(detailsKey)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Terms &amp; Conditions</h2>
          <p className="text-xs text-gray-400">Appears at the bottom of every printed Invoice and Quotation. One condition per line.</p>
          <textarea
            rows={5}
            placeholder="Availability: Goods available ex-stock subject to confirmation at time of order&#10;Payment Terms: 100% on order&#10;Warranty: Manufacturer's period and terms of warranty applicable"
            value={form.termsAndConditions || ''}
            onChange={set('termsAndConditions')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Preview */}
        {(form.bank1Details || form.bank2Details || form.bank3Details) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Preview</h2>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
              <thead>
                <tr><th colSpan={3} style={{background:'#f3f4f6',padding:'8px',textAlign:'center',border:'1px solid #e5e7eb',fontWeight:'bold'}}>PAY TO</th></tr>
                <tr>
                  {[form.bank1Label, form.bank2Label, form.bank3Label].map((l,i) => (
                    <th key={i} style={{background:'#f9fafb',padding:'6px 8px',border:'1px solid #e5e7eb',textAlign:'left',fontSize:'11px',fontWeight:'600'}}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {[form.bank1Details, form.bank2Details, form.bank3Details].map((d,i) => (
                    <td key={i} style={{padding:'8px',border:'1px solid #e5e7eb',verticalAlign:'top',lineHeight:'1.6'}}>
                      {(d||'').split('\n').map((line,j) => <div key={j}>{line}</div>)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            {form.termsAndConditions && (
              <div style={{marginTop:'12px'}}>
                <div style={{fontWeight:'bold',fontSize:'12px',marginBottom:'4px'}}>Terms &amp; Conditions</div>
                {form.termsAndConditions.split('\n').map((l,i)=><div key={i} style={{fontSize:'12px',color:'#374151'}}>{l}</div>)}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
