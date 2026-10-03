import type { Request, Response } from 'express';

import type { IdParam } from '../../lib/validation';
import { validatedQuery } from '../../middleware/validate';
import type { ListOptions } from '../../models/repository';
import { masterdataService, type MasterdataResourceKey } from './masterdata.service';

/**
 * Generic masterdata controller.
 *
 * Validation happens in the route layer (`validate(schema)`), so handlers only
 * ever see typed, already sanitised data:
 *  - body    -> `req.body`
 *  - query   -> `res.locals.query` (Express 5 makes `req.query` read only)
 *  - params  -> `req.params`
 */
export function bindResource(resource: MasterdataResourceKey) {
  return {
    list: async (_req: Request, res: Response): Promise<void> => {
      const query = validatedQuery(res) as ListOptions;
      const result = await masterdataService.list(resource, query);
      res.status(200).json({ success: true, data: result.items, meta: result.meta });
    },

    get: async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as unknown as IdParam;
      const entity = await masterdataService.get(resource, id);
      res.status(200).json({ success: true, data: entity });
    },

    create: async (req: Request, res: Response): Promise<void> => {
      const created = await masterdataService.create(resource, req.body as Record<string, unknown>);
      res.status(201).json({ success: true, data: created });
    },

    update: async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as unknown as IdParam;
      const updated = await masterdataService.update(resource, id, req.body as Record<string, unknown>);
      res.status(200).json({ success: true, data: updated });
    },

    remove: async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as unknown as IdParam;
      await masterdataService.remove(resource, id);
      res.status(204).send();
    },
  };
}