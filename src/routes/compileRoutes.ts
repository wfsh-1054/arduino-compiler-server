import { Router, Request, Response } from 'express';
import { compileCode } from '../services/arduinoService';

const router = Router();

interface CompileRequestBody {
    code: string;
    boardType: string;
}

router.post('/compile', async (req: Request<{}, {}, CompileRequestBody>, res: Response) => {
    const { code, boardType } = req.body;
    const result = await compileCode(code, boardType);
    
    if (result.success && result.fileBuffer) {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=firmware.${result.ext}`);
        return res.send(result.fileBuffer);
    } else {
        return res.status(500).json({ success: false, error: result.error });
    }
});

export default router;
