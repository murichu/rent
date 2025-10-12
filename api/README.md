# API

Environment variables (copy to `api/.env`):

```
DATABASE_URL=mongodb://127.0.0.1:27017/rental_saas
JWT_SECRET=dev-secret
PORT=4000
```

Commands:
- `npm run dev` - start API in watch mode
- `npm run prisma:generate` - generate Prisma Client
- `npm run prisma:push` - push schema to Mongo
- `npm run seed` - seed database
