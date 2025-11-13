/**
 * @file myListRoutes.ts
 * @description Express route definitions for the My List feature set.
 */

import { Router } from 'express';

import {
  handleAddToMyList,
  handleListMyItems,
  handleRemoveFromMyList
} from '../controllers/myListController';

const router = Router({ mergeParams: true });

router.post('/', handleAddToMyList);
router.delete('/:itemId', handleRemoveFromMyList);
router.get('/', handleListMyItems);

export const myListRouter = router;

