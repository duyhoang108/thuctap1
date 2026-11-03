import { MigrationInterface, QueryRunner } from "typeorm";

export class ResetDemoUserPasswords1710000004000 implements MigrationInterface {
  name = "ResetDemoUserPasswords1710000004000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const passwordHash =
      "$2b$12$IGh5pX4OFktkd5E3T/dCHeBboj2UkVck4T9oMdlQlBcXJzfGsiP3S";

    await queryRunner.query(
      `
        UPDATE "users"
        SET "password" = $1, "tokenVersion" = "tokenVersion" + 1
        WHERE "email" IN ('boss@gmail.com', 'staff@gmail.com')
      `,
      [passwordHash],
    );
  }

  public async down(): Promise<void> {
    // Demo passwords are intentionally not restored.
  }
}
