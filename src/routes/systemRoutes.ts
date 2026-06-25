import { Router, Request, Response } from 'express';
import { initSystem } from '../services/arduinoService';

const router = Router();

router.get('/init', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
        await initSystem((msg) => res.write(`data: ${msg}\n\n`));
        res.write(`data: [DONE]\n\n`);
    } catch (err: any) {
        res.write(`data: [ERR] ${err.message}\n\n`);
        res.write(`data: [DONE]\n\n`);
    }
    res.end();
});

export default router;
