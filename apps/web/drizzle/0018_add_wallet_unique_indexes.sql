CREATE UNIQUE INDEX IF NOT EXISTS "User_solanaWallet_unique" ON "User"("solanaWallet") WHERE "solanaWallet" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "User_privyWallet_unique" ON "User"("privyWallet") WHERE "privyWallet" IS NOT NULL;
