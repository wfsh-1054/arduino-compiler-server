import { Router, Request, Response } from 'express';
import { getInstalledBoards, installBoard } from '../services/arduinoService';

const router = Router();

router.get('/installed', async (req: Request, res: Response) => {
    try {
        const data = await getInstalledBoards();
        return res.json({ success: true, data: data });
    } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/install', async (req: Request, res: Response) => {
    const { core } = req.body;
    if (!core) return res.status(400).json({ success: false, error: "請提供 core 參數 (例: esp32:esp32)" });
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
        await installBoard(core, (msg) => res.write(`data: ${msg}\n\n`));
        res.write(`data: [DONE]\n\n`);
    } catch (err: any) {
        res.write(`data: [ERR] ${err.message}\n\n`);
        res.write(`data: [DONE]\n\n`);
    }
    res.end();
});

export default router;
