import { Router, Request, Response } from 'express';
import { getInstalledLibraries, installLibrary } from '../services/arduinoService';

const router = Router();

router.get('/installed', async (req: Request, res: Response) => {
    try {
        const data = await getInstalledLibraries();
        return res.json({ success: true, data: data });
    } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/install', async (req: Request, res: Response) => {
    const { libName } = req.body;
    if (!libName) return res.status(400).json({ success: false, error: "請提供 libName 參數" });
    
    try {
        const message = await installLibrary(libName);
        return res.json({ success: true, message });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
