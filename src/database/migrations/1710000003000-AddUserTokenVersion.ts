import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserTokenVersion1710000003000 implements MigrationInterface {
  name = "AddUserTokenVersion1710000003000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "tokenVersion" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "tokenVersion"
    `);
  }
}
