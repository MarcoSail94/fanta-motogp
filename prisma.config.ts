import { defineConfig } from '@prisma/config'

export default defineConfig({
  seed: 'ts-node backend/prisma/seed.ts'
})