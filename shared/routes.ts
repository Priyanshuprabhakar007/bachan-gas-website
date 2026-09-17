
import { z } from 'zod';
import { insertUserSchema, insertProductSchema, insertOrderSchema, insertStoreSchema, insertInventorySchema, insertGatePassSchema, insertServiceTicketSchema, insertRoleSchema, insertPermissionSchema, insertStockMovementSchema, insertCategorySchema, users, products, orders, stores, inventory, gatePasses, serviceTickets, roles, permissions, categories } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories' as const,
      responses: { 200: z.array(z.custom<typeof categories.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/categories/:id' as const,
      responses: { 200: z.custom<typeof categories.$inferSelect>(), 404: errorSchemas.notFound },
    },
    create: {
      method: 'POST' as const,
      path: '/api/categories' as const,
      input: insertCategorySchema,
      responses: { 201: z.custom<typeof categories.$inferSelect>() },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/categories/:id' as const,
      input: insertCategorySchema.partial(),
      responses: { 200: z.custom<typeof categories.$inferSelect>() },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/categories/:id' as const,
      responses: { 204: z.void() },
    },
    reorder: {
      method: 'PUT' as const,
      path: '/api/categories/reorder' as const,
      input: z.object({ orderedIds: z.array(z.number()) }),
      responses: { 200: z.any() },
    },
  },
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: { 200: z.custom<typeof users.$inferSelect>(), 401: errorSchemas.unauthorized },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout' as const,
      responses: { 200: z.void() },
    },
    register: {
      method: 'POST' as const,
      path: '/api/register' as const,
      input: insertUserSchema,
      responses: { 201: z.custom<typeof users.$inferSelect>(), 400: errorSchemas.validation },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user' as const,
      responses: { 200: z.custom<typeof users.$inferSelect>(), 401: errorSchemas.unauthorized },
    },
  },
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats' as const,
      responses: { 200: z.any() },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      responses: { 200: z.array(z.custom<typeof products.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id' as const,
      responses: { 200: z.custom<typeof products.$inferSelect>(), 404: errorSchemas.notFound },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: insertProductSchema,
      responses: { 201: z.custom<typeof products.$inferSelect>() },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id' as const,
      input: insertProductSchema.partial(),
      responses: { 200: z.custom<typeof products.$inferSelect>() },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
      responses: { 204: z.void() },
    },
  },
  customers: {
    list: {
      method: 'GET' as const,
      path: '/api/customers' as const,
      responses: { 200: z.array(z.custom<typeof users.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/customers/:id' as const,
      responses: { 200: z.custom<typeof users.$inferSelect>(), 404: errorSchemas.notFound },
    },
    create: {
      method: 'POST' as const,
      path: '/api/customers' as const,
      input: insertUserSchema,
      responses: { 201: z.custom<typeof users.$inferSelect>() },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/customers/:id' as const,
      input: insertUserSchema.partial(),
      responses: { 200: z.custom<typeof users.$inferSelect>() },
    },
  },
  orders: {
    list: {
      method: 'GET' as const,
      path: '/api/orders' as const,
      responses: { 200: z.array(z.custom<typeof orders.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/orders/:id' as const,
      responses: { 200: z.custom<typeof orders.$inferSelect>(), 404: errorSchemas.notFound },
    },
    create: {
      method: 'POST' as const,
      path: '/api/orders' as const,
      input: insertOrderSchema.extend({ items: z.array(z.object({ productId: z.number(), quantity: z.number() })) }),
      responses: { 201: z.custom<typeof orders.$inferSelect>() },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/orders/:id/status' as const,
      input: z.object({ status: z.string() }),
      responses: { 200: z.custom<typeof orders.$inferSelect>() },
    },
    assignDelivery: {
      method: 'PATCH' as const,
      path: '/api/orders/:id/assign' as const,
      input: z.object({ deliveryManId: z.number() }),
      responses: { 200: z.custom<typeof orders.$inferSelect>() },
    },
    byDeliveryMan: {
      method: 'GET' as const,
      path: '/api/orders/delivery/:deliveryManId' as const,
      responses: { 200: z.array(z.custom<typeof orders.$inferSelect>()) },
    },
  },
  inventory: {
    list: {
      method: 'GET' as const,
      path: '/api/inventory' as const,
      responses: { 200: z.array(z.custom<typeof inventory.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/inventory' as const,
      input: insertInventorySchema,
      responses: { 201: z.custom<typeof inventory.$inferSelect>() },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/inventory/:id' as const,
      input: insertInventorySchema.partial(),
      responses: { 200: z.custom<typeof inventory.$inferSelect>() },
    },
  },
  stores: {
    list: {
      method: 'GET' as const,
      path: '/api/stores' as const,
      responses: { 200: z.array(z.custom<typeof stores.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/stores' as const,
      input: insertStoreSchema,
      responses: { 201: z.custom<typeof stores.$inferSelect>() },
    },
  },
  gatePasses: {
    list: {
      method: 'GET' as const,
      path: '/api/gate-passes' as const,
      responses: { 200: z.array(z.custom<typeof gatePasses.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/gate-passes/:id' as const,
      responses: { 200: z.custom<typeof gatePasses.$inferSelect>(), 404: errorSchemas.notFound },
    },
    create: {
      method: 'POST' as const,
      path: '/api/gate-passes' as const,
      input: insertGatePassSchema,
      responses: { 201: z.custom<typeof gatePasses.$inferSelect>() },
    },
  },
  tickets: {
    list: {
      method: 'GET' as const,
      path: '/api/tickets' as const,
      responses: { 200: z.array(z.custom<typeof serviceTickets.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tickets' as const,
      input: insertServiceTicketSchema,
      responses: { 201: z.custom<typeof serviceTickets.$inferSelect>() },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/tickets/:id/status' as const,
      input: z.object({ status: z.string() }),
      responses: { 200: z.custom<typeof serviceTickets.$inferSelect>() },
    },
  },
  staff: {
    list: {
      method: 'GET' as const,
      path: '/api/staff' as const,
      responses: { 200: z.array(z.custom<typeof users.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/staff' as const,
      input: insertUserSchema,
      responses: { 201: z.custom<typeof users.$inferSelect>() },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/staff/:id' as const,
      input: insertUserSchema.partial(),
      responses: { 200: z.custom<typeof users.$inferSelect>() },
    },
    byRole: {
      method: 'GET' as const,
      path: '/api/staff/role/:roleSlug' as const,
      responses: { 200: z.array(z.custom<typeof users.$inferSelect>()) },
    },
    deliveryMen: {
      method: 'GET' as const,
      path: '/api/staff/delivery-men' as const,
      responses: { 200: z.array(z.custom<typeof users.$inferSelect>()) },
    },
  },
  roles: {
    list: {
      method: 'GET' as const,
      path: '/api/roles' as const,
      responses: { 200: z.array(z.custom<typeof roles.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/roles/:id' as const,
      responses: { 200: z.custom<typeof roles.$inferSelect>(), 404: errorSchemas.notFound },
    },
    create: {
      method: 'POST' as const,
      path: '/api/roles' as const,
      input: insertRoleSchema,
      responses: { 201: z.custom<typeof roles.$inferSelect>() },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/roles/:id' as const,
      input: insertRoleSchema.partial(),
      responses: { 200: z.custom<typeof roles.$inferSelect>() },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/roles/:id' as const,
      responses: { 204: z.void() },
    },
    permissions: {
      method: 'GET' as const,
      path: '/api/roles/:id/permissions' as const,
      responses: { 200: z.any() },
    },
    setPermissions: {
      method: 'PUT' as const,
      path: '/api/roles/:id/permissions' as const,
      input: z.object({ permissionIds: z.array(z.number()) }),
      responses: { 200: z.any() },
    },
  },
  permissions: {
    list: {
      method: 'GET' as const,
      path: '/api/permissions' as const,
      responses: { 200: z.array(z.custom<typeof permissions.$inferSelect>()) },
    },
  },
  userPermissions: {
    me: {
      method: 'GET' as const,
      path: '/api/user/permissions' as const,
      responses: { 200: z.array(z.string()) },
    },
  },
  stockMovements: {
    list: {
      method: 'GET' as const,
      path: '/api/stock-movements' as const,
      responses: { 200: z.any() },
    },
    create: {
      method: 'POST' as const,
      path: '/api/stock-movements' as const,
      input: insertStockMovementSchema,
      responses: { 201: z.any() },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
