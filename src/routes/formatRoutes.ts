import { Router } from 'express';
import { formatCodeService } from '../services/formatService';

const router = Router();

router.post('/', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    res.status(400).json({ error: 'Code is required for formatting' });
    return;
  }

  try {
    const formattedCode = await formatCodeService(code);
    res.json({ success: true, formattedCode });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
