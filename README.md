# Sun Aratinga — Solar Company Management System

Full-stack solar company ERP — Leads → Design → Projects → Warranty.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS (orange theme) |
| Backend | Node.js + Express |
| Database | PostgreSQL 15 |
| ORM | Prisma |
| Auth | JWT + Role-based |
| Docker | Docker Compose |

## Quick Start

```bash
docker-compose up --build
```

Then in a new terminal:

```bash
docker-compose exec api npx prisma migrate dev --name init
docker-compose exec api npx prisma db seed
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3003 |
| API | http://localhost:3002 |

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sunaratinga.com | admin123 |
| CEO | ceo@sunaratinga.com | ceo123 |
| Finance Manager | finance@sunaratinga.com | finance123 |
| Engineering Manager | eng@sunaratinga.com | eng123 |
| Project Coordinator | coord@sunaratinga.com | coord123 |
| Technician | tech@sunaratinga.com | tech123 |

## Modules

### New Solar-Specific
- **Leads** — Pipeline from survey to contract with CEO & client approval flows
- **Projects** — Parent entity with milestones, snag list, commissioning tests, progress tracking
- **Designs** — Engineering design workflow with approval chain
- **Warranty** — Per-project warranty tracking with expiry alerts
- **Maintenance** — Warranty-linked maintenance requests

### Carried from HBS (Customized)
- Customers, Vendors, Employees
- Quotations → Invoices → Payments
- Contracts (with Finance Manager approval)
- Materials (solar: panels, inverters, cables, mounts)
- Purchase Orders (with receive flow)
- Bank Accounts, Fund Transfers, Expenses
- Payroll, Attendance, Leave
- Reports (P&L, Projects, Inventory, Leads, Warranty)
- Dashboard with solar KPIs

## Roles
ADMIN | CEO | FINANCE_MANAGER | ENGINEERING_MANAGER | PROJECT_COORDINATOR | ACCOUNTANT | TECHNICIAN
