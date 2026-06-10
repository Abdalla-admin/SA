const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const s = await prisma.companySettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  res.json(s);
});

router.put('/', auth, async (req, res) => {
  const { id, updatedAt, ...data } = req.body;
  const s = await prisma.companySettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  res.json(s);
});

module.exports = router;
