import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1751500000000 implements MigrationInterface {
  name = 'CreateInitialSchema1751500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "customer_status_enum" AS ENUM('ACTIVE', 'BLOCKED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "merchant_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "reward_status_enum" AS ENUM('ACTIVE', 'PAUSED', 'EXPIRED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "ledger_type_enum" AS ENUM('CREDIT', 'DEBIT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "claim_status_enum" AS ENUM('ISSUED', 'CANCELLED')`,
    );

    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id"        uuid                    NOT NULL DEFAULT gen_random_uuid(),
        "slug"      character varying       NOT NULL,
        "name"      character varying       NOT NULL,
        "status"    "customer_status_enum"  NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP               NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_customers_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_customers" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "merchants" (
        "id"        uuid                    NOT NULL DEFAULT gen_random_uuid(),
        "slug"      character varying       NOT NULL,
        "name"      character varying       NOT NULL,
        "status"    "merchant_status_enum"  NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP               NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_merchants_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_merchants" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rewards" (
        "id"         uuid                  NOT NULL DEFAULT gen_random_uuid(),
        "slug"       character varying     NOT NULL,
        "name"       character varying     NOT NULL,
        "merchantId" uuid                  NOT NULL,
        "pointCost"  integer               NOT NULL,
        "stock"      integer               NOT NULL DEFAULT 0,
        "status"     "reward_status_enum"  NOT NULL DEFAULT 'ACTIVE',
        "createdAt"  TIMESTAMP             NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rewards_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_rewards" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rewards_merchant" FOREIGN KEY ("merchantId")
          REFERENCES "merchants"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "reward_claims" (
        "id"               uuid                  NOT NULL DEFAULT gen_random_uuid(),
        "customerId"       uuid                  NOT NULL,
        "rewardId"         uuid                  NOT NULL,
        "promoCode"        character varying     NOT NULL,
        "pointsDebited"    integer               NOT NULL,
        "idempotencyKey"   character varying     NOT NULL,
        "status"           "claim_status_enum"   NOT NULL DEFAULT 'ISSUED',
        "createdAt"        TIMESTAMP             NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_reward_claims_promoCode"       UNIQUE ("promoCode"),
        CONSTRAINT "UQ_reward_claims_idempotencyKey"  UNIQUE ("idempotencyKey"),
        CONSTRAINT "PK_reward_claims" PRIMARY KEY ("id"),
        CONSTRAINT "FK_reward_claims_customer" FOREIGN KEY ("customerId")
          REFERENCES "customers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_reward_claims_reward" FOREIGN KEY ("rewardId")
          REFERENCES "rewards"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_reward_claims_idempotencyKey" ON "reward_claims" ("idempotencyKey")`,
    );

    await queryRunner.query(`
      CREATE TABLE "wallet_ledger" (
        "id"          uuid                NOT NULL DEFAULT gen_random_uuid(),
        "customerId"  uuid                NOT NULL,
        "type"        "ledger_type_enum"  NOT NULL,
        "points"      integer             NOT NULL,
        "description" character varying,
        "claimId"     uuid,
        "createdAt"   TIMESTAMP           NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_ledger" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wallet_ledger_customer" FOREIGN KEY ("customerId")
          REFERENCES "customers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_wallet_ledger_claim" FOREIGN KEY ("claimId")
          REFERENCES "reward_claims"("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "wallet_ledger"`);
    await queryRunner.query(
      `DROP INDEX "IDX_reward_claims_idempotencyKey"`,
    );
    await queryRunner.query(`DROP TABLE "reward_claims"`);
    await queryRunner.query(`DROP TABLE "rewards"`);
    await queryRunner.query(`DROP TABLE "merchants"`);
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP TYPE "claim_status_enum"`);
    await queryRunner.query(`DROP TYPE "ledger_type_enum"`);
    await queryRunner.query(`DROP TYPE "reward_status_enum"`);
    await queryRunner.query(`DROP TYPE "merchant_status_enum"`);
    await queryRunner.query(`DROP TYPE "customer_status_enum"`);
  }
}
