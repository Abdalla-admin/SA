require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Patch Express 4 to auto-catch async route errors (express-async-errors equivalent)
const Layer = require('express/lib/router/layer');
const origHandle = Layer.prototype.handle_request;
Layer.prototype.handle_request = function(req, res, next) {
  if (this.handle.length > 3) return origHandle.call(this, req, res, next);
  const rv = origHandle.call(this, req, res, next);
  if (rv && typeof rv.then === 'function') rv.then(null, next);
  return rv;
};

const app = express();

app.use(cors());
app.use(express.json());

// Convert date-only strings (YYYY-MM-DD) to full ISO-8601 strings so Prisma DateTime fields work.
// Uses JSON round-trip to handle nested objects/arrays without mutation risks.
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    const fixed = JSON.stringify(req.body)
      .replace(/"(\d{4}-\d{2}-\d{2})"/g, '"$1T00:00:00.000Z"');
    req.body = JSON.parse(fixed);
  }
  next();
});

// Global error handler — prevents unhandled Prisma throws from crashing nodemon
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err?.message || err);
});

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/leads',         require('./routes/leads'));
app.use('/api/customers',     require('./routes/customers'));
app.use('/api/vendors',       require('./routes/vendors'));
app.use('/api/employees',     require('./routes/employees'));
app.use('/api/projects',      require('./routes/projects'));
app.use('/api/materials',     require('./routes/materials'));
app.use('/api/purchases',     require('./routes/purchases'));
app.use('/api/quotations',    require('./routes/quotations'));
app.use('/api/contracts',     require('./routes/contracts'));
app.use('/api/invoices',      require('./routes/invoices'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/expenses',      require('./routes/expenses'));
app.use('/api/bank-accounts', require('./routes/bankAccounts'));
app.use('/api/fund-transfers',require('./routes/fundTransfers'));
app.use('/api/warranty',      require('./routes/warranty'));
app.use('/api/maintenance',   require('./routes/maintenance'));
app.use('/api/payroll',       require('./routes/payroll'));
app.use('/api/attendance',    require('./routes/attendance'));
app.use('/api/leave',         require('./routes/leave'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/roles',         require('./routes/roles'));
app.use('/api/permissions',       require('./routes/permissions'));
app.use('/api/company-settings',  require('./routes/companySettings'));

app.get('/health', (_, res) => res.json({ status: 'ok', app: 'Sun Aratinga API' }));

// Global error handler — returns JSON for all thrown/async errors
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Sun Aratinga API running on port ${PORT}`));
