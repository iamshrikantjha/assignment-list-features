/**
 * @file index.ts
 * @description Root router composing feature-specific routers.
 */

import { Router } from 'express';

import { myListRouter } from './myListRoutes';

const router = Router();

router.use('/users/:userId/my-list', myListRouter);

export const apiRouter = router;

