import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTaskEvidences1710000005000 implements MigrationInterface {
  name = "CreateTaskEvidences1710000005000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "task_evidences" (
        "id" SERIAL NOT NULL,
        "original_name" character varying NOT NULL,
        "mime_type" character varying NOT NULL,
        "size" integer NOT NULL,
        "content" bytea NOT NULL,
        "progress" integer NOT NULL,
        "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "task_id" integer NOT NULL,
        "submitted_by_id" integer NOT NULL,
        CONSTRAINT "PK_task_evidences_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_task_evidences_task"
          FOREIGN KEY ("task_id") REFERENCES "tasks"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_task_evidences_submitted_by"
          FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id")
          ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "task_evidences"`);
  }
}
