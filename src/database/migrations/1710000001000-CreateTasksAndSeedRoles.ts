import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTasksAndSeedRoles1710000001000
  implements MigrationInterface
{
  name = "CreateTasksAndSeedRoles1710000001000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "role" character varying NOT NULL DEFAULT 'EMPLOYEE'
    `);

    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" SERIAL NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "status" character varying NOT NULL DEFAULT 'TODO',
        "progress" integer NOT NULL DEFAULT 0,
        "assignee_id" integer NOT NULL,
        "created_by_id" integer NOT NULL,
        CONSTRAINT "PK_tasks_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tasks_assignee"
          FOREIGN KEY ("assignee_id") REFERENCES "users"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_tasks_created_by"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
          ON DELETE CASCADE
      )
    `);

    const passwordHash =
      "$2b$12$aGnYrGWNPPERAsdwDL1dyOESbW1epbIQL7VDIM2mxqd1GWaOkKyEi";

    await queryRunner.query(
      `
        INSERT INTO "users" ("name", "email", "password", "role")
        VALUES
          ('Demo Manager', 'boss@gmail.com', $1, 'MANAGER'),
          ('Demo Employee', 'staff@gmail.com', $1, 'EMPLOYEE')
        ON CONFLICT ("email") DO UPDATE SET "role" = EXCLUDED."role"
      `,
      [passwordHash],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }
}
