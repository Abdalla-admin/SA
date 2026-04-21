const router = require('express').Router();
const prisma = require('../middleware/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json(await prisma.notification.findMany({
    where: { OR: [{ userId: req.user.id }, { userId: null }] },
    orderBy: { createdAt: 'desc' },
    take: 50,
  }));
});

router.post('/:id/read', auth, async (req, res) => {
  res.json(await prisma.notification.update({ where: { id: +req.params.id }, data: { read: true } }));
});

router.post('/read-all', auth, async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
  res.json({ success: true });
});

module.exports = router;
