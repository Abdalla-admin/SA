const pad = (n, len = 3) => String(n).padStart(len, '0');

const ymd = date => {
  const d = new Date(date);
  return d.getFullYear().toString() +
    pad(d.getMonth() + 1, 2) +
    pad(d.getDate(), 2);
};

export const docCode = (type, id, date) =>
  `SA-${type}-${ymd(date || new Date())}-${pad(id)}`;

// Convenience helpers
export const invCode  = (id, date) => docCode('INV',  id, date);
export const boqCode  = (id, date) => docCode('BOQ',  id, date);
export const payCode  = (id, date) => docCode('PAY',  id, date);
export const purCode  = (id, date) => docCode('PUR',  id, date);
export const expCode  = (id, date) => docCode('EXP',  id, date);
export const prjCode  = (id, date) => docCode('PRJ',  id, date);
export const sitCode  = (id, date) => docCode('SIT',  id, date);
export const mntCode  = (id, date) => docCode('MNT',  id, date);
export const warCode  = (id, date) => docCode('WAR',  id, date);
export const supCode  = (id, date) => docCode('SUP',  id, date);
export const cusCode  = (id, date) => docCode('CUS',  id, date);
export const empCode  = (id, date) => docCode('EMP',  id, date);
export const dsgCode  = (id, date) => docCode('DSG',  id, date);
export const invyCode = (id, date) => docCode('INVY', id, date);
