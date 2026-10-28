import { MigrationInterface, QueryRunner } from "typeorm";

export class NormalizeTaskRoles1710000002000 implements MigrationInterface {
  name = "NormalizeTaskRoles1710000002000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users"
      SET "role" = 'MANAGER', "name" = 'Demo Manager'
      WHERE "email" = 'boss@gmail.com'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users"
      SET "role" = 'EMPLOYEE', "name" = 'Demo Employee'
      WHERE "email" = 'boss@gmail.com'
    `);
  }
}
