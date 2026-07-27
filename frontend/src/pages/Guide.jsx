export default function Guide() {
  const sections = [
    {
      title: '1. Customers',
      icon: '👤',
      color: 'bg-orange-50 border-orange-200',
      headerColor: 'text-orange-700',
      useCases: [
        {
          title: 'Add a new customer',
          steps: [
            'Go to Contacts → Customers → click "+ New Customer"',
            'Enter name, email, phone, address, site location, and registration date',
            'Registration date records when the customer first engaged with Sun Aratinga',
            'Add any notes relevant to this customer and click Save',
          ],
        },
        {
          title: 'Edit or delete a customer',
          steps: [
            'Click "Edit" on any customer row to update their details',
            'Click "Delete" to remove a customer — this cannot be undone',
            'Customers linked to active leads, projects, or invoices should not be deleted',
          ],
        },
      ],
    },
    {
      title: '2. Vendors',
      icon: '🏪',
      color: 'bg-amber-50 border-amber-200',
      headerColor: 'text-amber-700',
      useCases: [
        {
          title: 'Manage vendors',
          steps: [
            'Go to Contacts → Vendors → click "+ New Vendor"',
            'Enter vendor name, email, phone, address, and category (e.g. panels, cables)',
            'Vendors are linked to purchase orders — add them before raising POs',
            'Use Edit or Delete on any vendor row to update or remove records',
          ],
        },
      ],
    },
    {
      title: '3. Employees',
      icon: '👥',
      color: 'bg-pink-50 border-pink-200',
      headerColor: 'text-pink-700',
      useCases: [
        {
          title: 'Manage employee records',
          steps: [
            'Go to Contacts → Employees → "+ Add Employee"',
            'Enter name, position, department, salary, and join date',
            'Toggle "Active" to deactivate employees without deleting their history',
            'Employee records are used for payroll generation and attendance tracking',
            'Use the Delete button to permanently remove an employee record',
          ],
        },
      ],
    },
    {
      title: '4. Lead Management',
      icon: '🎯',
      color: 'bg-yellow-50 border-yellow-200',
      headerColor: 'text-yellow-700',
      useCases: [
        {
          title: 'Capture a new enquiry',
          steps: [
            'Go to Operations → Leads → click "+ New Lead"',
            'Select the customer (or create one under Contacts → Customers first)',
            'Enter estimated system size (kW), lead value, and site address',
            'Save — the lead starts at NEW status',
          ],
        },
        {
          title: 'Move a lead through the pipeline',
          steps: [
            'Open the lead and click "Edit" to update status',
            'Status flow: NEW → CONTACTED → SITE_SURVEY → PROPOSAL → NEGOTIATION → CEO_APPROVED → CLIENT_APPROVED → CONVERTED',
            'CEO approval: change status to CEO_APPROVED after internal review',
            'Client acceptance: change to CLIENT_APPROVED once client signs off',
            'Convert to project: once CLIENT_APPROVED, click "Mark as Contracted → Create Project"',
          ],
        },
        {
          title: 'Reject or lose a lead',
          steps: [
            'Edit the lead and set status to LOST',
            'Add notes explaining the reason for future reference',
            'Use the Delete button on the leads table to remove a lead entirely',
          ],
        },
      ],
    },
    {
      title: '5. Projects',
      icon: '⚡',
      color: 'bg-blue-50 border-blue-200',
      headerColor: 'text-blue-700',
      useCases: [
        {
          title: 'Create and track a solar project',
          steps: [
            'Go to Operations → Projects → "+ New Project"',
            'Link to a customer, set system capacity (kW), budget, and target date',
            'Status stages: PLANNING → DESIGN → PROCUREMENT → EXECUTION → COMMISSIONING → COMPLETED',
            'Changing the status automatically updates the progress percentage',
            'You can also drag the progress slider to fine-tune the percentage manually',
          ],
        },
        {
          title: 'Manage milestones',
          steps: [
            'Click on any project card to open the detail view',
            'Milestones are shown with due dates — completed ones appear struck through',
            'Add milestones via the API or update them as work progresses',
          ],
        },
        {
          title: 'Track snag items',
          steps: [
            'In the project detail view, go to "Snag List" → click "+ Add"',
            'Enter the defect or issue description',
            'Click the status button on each snag to toggle between OPEN and RESOLVED',
            'Resolve all snags before moving the project to COMMISSIONING',
          ],
        },
        {
          title: 'Record commissioning tests',
          steps: [
            'In the project detail view, go to "Commissioning Tests" → click "+ Add"',
            'Enter the test name (e.g., Insulation Resistance Test, Grid Sync)',
            'Set results to PASS, FAIL, or PENDING for each test',
            'All critical tests must PASS before marking a project COMPLETED',
          ],
        },
        {
          title: 'Add a warranty to a project',
          steps: [
            'When creating or editing a project, scroll to the Warranty section',
            'Enter warranty start date, end date, and terms',
            'The warranty record is automatically linked to the project',
          ],
        },
      ],
    },
    {
      title: '6. Inventory & Purchases',
      icon: '🔧',
      color: 'bg-lime-50 border-lime-200',
      headerColor: 'text-lime-700',
      useCases: [
        {
          title: 'Add and manage materials',
          steps: [
            'Go to Inventory → Materials → "+ Add Material"',
            'Enter material name, category, unit, unit cost, and minimum stock level',
            'To add a new category not in the list, click "+ New" next to the category dropdown',
            'Stock quantity updates automatically when purchase orders are received',
            'Materials highlighted in red are below minimum stock (low stock alert)',
            'Use Edit or Delete on any row to update or remove a material',
          ],
        },
        {
          title: 'Raise a purchase order',
          steps: [
            'Go to Inventory → Purchases → "+ New PO"',
            'Select the vendor, choose the bank account to pay from, and add line items',
            'The PO is created with PENDING status',
            'When materials arrive, click "Receive" — stock quantities are updated automatically',
            'Receiving a PO deducts the total amount from the selected bank account and logs it as an expense',
          ],
        },
        {
          title: 'Allocate materials to a project',
          steps: [
            'Use the project detail view to see material allocations',
            'Allocations are tracked per project to calculate actual material costs',
          ],
        },
      ],
    },
    {
      title: '7. Sales & Finance',
      icon: '💼',
      color: 'bg-green-50 border-green-200',
      headerColor: 'text-green-700',
      useCases: [
        {
          title: 'Create a quotation',
          steps: [
            'Go to Finance → Quotations → "+ New Quotation"',
            'Select customer, enter system capacity, and add line items',
            'Tax is calculated separately and added to the subtotal',
            'Set a validity date — the quotation expires after this date',
            'Click "→ Invoice" to convert an accepted quotation into an invoice',
          ],
        },
        {
          title: 'Manage contracts',
          steps: [
            'Go to Finance → Contracts → link to a project, customer, and quotation',
            'Enter contract value, payment terms, and signed date',
            'Contract statuses: DRAFT → ACTIVE → COMPLETED → TERMINATED',
          ],
        },
        {
          title: 'Issue an invoice and record payment',
          steps: [
            'Go to Finance → Invoices → "+ New Invoice"',
            'Select the customer and add line items with quantities and unit prices',
            'The Paid and Balance columns update in real time as payments are recorded',
            'Click "Pay" on any PENDING or OVERDUE invoice to record a payment',
            'Select the bank account the payment was received into',
            'Once fully paid, the invoice status changes to PAID automatically',
          ],
        },
        {
          title: 'Record payments directly',
          steps: [
            'Go to Finance → Receipt Voucher → "+ Record Receipt Voucher"',
            'Select the customer — their unpaid invoices will appear in the dropdown',
            'Selecting an invoice auto-fills the remaining balance as the payment amount',
            'Choose payment method (Bank Transfer, Cash, Cheque, Card) and bank account',
            'Add a reference number and notes as needed',
          ],
        },
        {
          title: 'Track project expenses',
          steps: [
            'Go to Finance → Expenses → "+ Add Expense"',
            'Select category (operations, admin, HR, etc.) and link to a project if applicable',
            'Expenses appear in the Reports → P&L view as cost deductions',
          ],
        },
      ],
    },
    {
      title: '8. Banking',
      icon: '🏦',
      color: 'bg-teal-50 border-teal-200',
      headerColor: 'text-teal-700',
      useCases: [
        {
          title: 'Set up bank accounts',
          steps: [
            'Go to Banking → Bank Accounts → "+ Add Account"',
            'Enter account name, bank name, account number, and opening balance',
            'All payment transactions link to a bank account and update its balance',
          ],
        },
        {
          title: 'Transfer funds between accounts',
          steps: [
            'Go to Banking → Fund Transfers → "+ New Transfer"',
            'Select source and destination accounts, enter amount and reference',
            'Both account balances are updated instantly on save',
          ],
        },
      ],
    },
    {
      title: '9. Warranty & Maintenance',
      icon: '🛡️',
      color: 'bg-purple-50 border-purple-200',
      headerColor: 'text-purple-700',
      useCases: [
        {
          title: 'Register a warranty',
          steps: [
            'Go to After-Sales → Warranty → "+ Add Warranty"',
            'Select the completed project, enter start date, end date, and warranty terms',
            'Alternatively, add warranty details directly when creating or editing a project',
            'Warranties expiring within 30 days are highlighted in amber',
            'Expired warranties are automatically marked EXPIRED',
          ],
        },
        {
          title: 'Log a maintenance request',
          steps: [
            'Go to After-Sales → Maintenance → "+ New Request"',
            'Link to the warranty, describe the issue, and set priority (LOW/MEDIUM/HIGH/CRITICAL)',
            'Assign a technician and schedule the visit date',
            'Update status to IN_PROGRESS when work begins, then RESOLVED when complete',
            'Add resolution notes for future reference',
          ],
        },
      ],
    },
    {
      title: '10. HR & Payroll',
      icon: '💰',
      color: 'bg-rose-50 border-rose-200',
      headerColor: 'text-rose-700',
      useCases: [
        {
          title: 'Record daily attendance',
          steps: [
            'Go to HR & Payroll → Attendance → "+ Mark Attendance"',
            'Select employee and date, set status (PRESENT, ABSENT, HALF_DAY, LEAVE)',
            'Attendance data feeds into payroll calculations',
          ],
        },
        {
          title: 'Manage leave requests',
          steps: [
            'Go to HR & Payroll → Leave → "+ New Leave"',
            'Select employee, leave type, start and end dates',
            'Approve or reject requests — approved leaves reflect in attendance',
          ],
        },
        {
          title: 'Process monthly payroll',
          steps: [
            'Go to HR & Payroll → Payroll → select month and year',
            'Enter global allowances and deductions that apply to all employees',
            'Click "Generate" to create payslips for all active employees',
            'Individual payslips can be reviewed and adjusted before finalizing',
          ],
        },
      ],
    },
    {
      title: '11. Reports',
      icon: '📈',
      color: 'bg-gray-50 border-gray-200',
      headerColor: 'text-gray-700',
      useCases: [
        {
          title: 'Profit & Loss overview',
          steps: [
            'Go to Reports → P&L tab',
            'Shows a structured financial statement: Revenue → COGS → Gross Profit → Operating Expenses → Net Profit',
            'Purchase expenses are automatically separated as Cost of Goods Sold (COGS)',
            'Operating expenses are broken down by category (admin, HR, operations, etc.)',
            'Net profit is color-coded: green for positive, red for negative',
            'Summary cards at the top show Total Income, Total Expenses, and Net Profit at a glance',
          ],
        },
        {
          title: 'Project financial summary',
          steps: [
            'Go to Reports → Projects tab',
            'Each project shows contract value, total expenses, and margin',
            'Negative margins are highlighted in red — use to identify problem projects',
          ],
        },
        {
          title: 'Inventory valuation',
          steps: [
            'Go to Reports → Inventory tab',
            'Shows current stock, unit cost, and total value per material',
            'Low stock items are highlighted — use to plan purchase orders',
          ],
        },
        {
          title: 'Lead pipeline analysis',
          steps: [
            'Go to Reports → Leads tab',
            'Breakdown of leads by status and by source',
            'Use to evaluate which channels generate the most qualified leads',
          ],
        },
        {
          title: 'Warranty health check',
          steps: [
            'Go to Reports → Warranty tab',
            'Lists all warranties with status and number of maintenance requests',
            'Use to identify customers with frequent maintenance calls',
          ],
        },
      ],
    },
    {
      title: '12. User Permissions',
      icon: '🔐',
      color: 'bg-slate-50 border-slate-200',
      headerColor: 'text-slate-700',
      useCases: [
        {
          title: 'Configure access for a user',
          steps: [
            'Go to Admin → Permissions (visible to Admin and CEO only)',
            'Select a user from the left sidebar',
            'The permission matrix shows all modules grouped by section',
            'Toggle individual checkboxes: View, Create, Edit, Delete, and Special*',
            'Enabling any action automatically enables View; disabling View clears all other actions',
            'Click "Save Permissions" — changes take effect immediately on next page load',
          ],
        },
        {
          title: 'Grant or revoke access in bulk',
          steps: [
            'Click "Grant All" on a group header to enable all permissions for every module in that section',
            'Click "Revoke All" to remove all permissions for the group',
            'Use the per-row "Grant" / "Revoke" button to toggle all actions for a single module',
          ],
        },
        {
          title: 'Special* actions',
          steps: [
            'The Special column covers module-specific power actions',
            'Leads: Mark as Contracted — Projects: Add Snag / Test — Purchases: Receive Items',
            'Quotations: Convert to Invoice — Invoices: Record Payment — Payroll: Run Payroll',
            'Leave: Approve / Reject — Warranty: Create Warranty',
            'The Special checkbox is greyed out for modules that have no special action',
          ],
        },
        {
          title: 'Admin accounts',
          steps: [
            'Admin accounts always have full access and are not listed in the Permissions page',
            'Permissions are per individual user — changing one user does not affect others',
          ],
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Guide</h1>
        <p className="text-gray-500 mt-1 text-sm">Step-by-step use cases for all Sun Aratinga modules</p>
      </div>

      {/* Quick navigation */}
      <div className="flex flex-wrap gap-2">
        {sections.map(s => (
          <a key={s.title} href={`#section-${s.title.replace(/\s+/g,'-')}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors">
            <span>{s.icon}</span>{s.title.split('.')[1]?.trim()}
          </a>
        ))}
      </div>

      {sections.map(section => (
        <div key={section.title} id={`section-${section.title.replace(/\s+/g,'-')}`}
          className={`rounded-xl border p-6 ${section.color}`}>
          <h2 className={`text-lg font-bold mb-4 ${section.headerColor}`}>
            {section.icon} {section.title}
          </h2>
          <div className="space-y-5">
            {section.useCases.map(uc => (
              <div key={uc.title}>
                <h3 className="font-semibold text-gray-800 text-sm mb-2">{uc.title}</h3>
                <ol className="space-y-1">
                  {uc.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-500">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 text-sm text-gray-700">
        <p className="font-semibold text-orange-700 mb-2">Typical Workflow (End-to-End)</p>
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {['Lead Captured','Site Survey','Quotation Sent','Contract Signed','Design Approved',
            'PO Raised','Materials Received','Installation','Commissioning Tests','Project Completed',
            'Invoice Issued','Payment Received','Warranty Registered'].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-1">
              <span className="bg-white border border-orange-300 text-orange-700 px-2 py-0.5 rounded-full">{step}</span>
              {i < arr.length - 1 && <span className="text-orange-400">→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
