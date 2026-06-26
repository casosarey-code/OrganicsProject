import { Router } from 'express';
import { authJwt } from '../middleware/authJwt';
import { validateRole } from '../middleware/validateRole';

const router = Router();

export default router;
