# API

Environment variables (copy to `api/.env`):

```
DATABASE_URL=mongodb://127.0.0.1:27017/rental_saas
JWT_SECRET=dev-secret
PORT=4000
```

Commands:
- `yarn dev` - start API in watch mode
- `yarn prisma:generate` - generate Prisma Client
- `yarn prisma:push` - push schema to Mongo
- `yarn seed` - seed database
