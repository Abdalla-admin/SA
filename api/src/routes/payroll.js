const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json(await prisma.payslip.findMany({
    include: { employee: { select: { id: true, name: true, position: true } } },
    orderBy: { createdAt: 'desc' },
  }));
});

router.post('/run', auth, async (req, res) => {
  const { month, year, allowances = 0, deductions = 0 } = req.body;
  const employees = await prisma.employee.findMany({ where: { active: true } });
  const payslips = await prisma.$transaction(
    employees.map(emp =>
      prisma.payslip.create({
        data: {
          employeeId: emp.id,
          month,
          year,
          basicSalary: emp.salary,
          allowances,
          deductions,
          netPay: emp.salary + allowances - deductions,
        },
      })
    )
  );
  res.status(201).json(payslips);
});

module.exports = router;
