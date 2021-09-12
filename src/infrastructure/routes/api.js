import { createController } from 'awilix-koa'
const { authMiddleware } = require('@/infrastructure/lib/support')

export const apiController = createController(({ apiController }) => ({
  healthcheck: async (ctx) =>
    ctx.ok(await apiController.get('healthcheck', ctx.query)),
  ping: async (ctx) => ctx.ok(await apiController.get('ping', ctx.query)),
  get: async (ctx) =>
    ctx.ok(await apiController.get(ctx.params.case, ctx.query)),
  post: async (ctx) =>
    ctx.ok(await apiController.post(ctx.params.case, ctx.request.body)),
  delete: async (ctx) =>
    ctx.ok(await apiController.delete(ctx.params.case, ctx.query))
}))
  .get('/healthcheck', 'healthcheck')
  .get('/ping', 'ping')
  .get('/:case', 'get', { before: [authMiddleware] })
  .post('/:case', 'post', { before: [authMiddleware] })
  .delete('/:case', 'delete', { before: [authMiddleware] })
