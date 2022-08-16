import { Migration } from '@mikro-orm/migrations';

export class Migration20220816043005 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "criteria_level_entity" ("id" serial primary key, "title" varchar(255) not null);');

    this.addSql('create table "employee_entity" ("employee_id" varchar(40) not null, "status" text check ("status" in (\'online\', \'offline\')) not null, "start" timestamp not null, "resigned" timestamp null, "nameth" varchar(150) not null, "nickname" varchar(150) not null, "email" varchar(150) not null, "direct_report_employee_id" varchar(40) null, "created_at" timestamp not null, "updated_at" timestamp null);');
    this.addSql('alter table "employee_entity" add constraint "employee_entity_pkey" primary key ("employee_id");');

    this.addSql('create table "evaluation_record_entity" ("id" serial primary key, "evaluate_to_employee_id" varchar(40) not null, "evaluated_by_employee_id" varchar(40) not null, "status" text check ("status" in (\'waiting_for_approver\', \'approver\', \'new\')) not null, "approver_by_employee_id" varchar(40) null, "approved_at" timestamp null, "created_at" timestamp not null, "updated_at" timestamp null, "prev_id" int null);');
    this.addSql('alter table "evaluation_record_entity" add constraint "evaluation_record_entity_prev_id_unique" unique ("prev_id");');

    this.addSql('create table "evaluation_detail_entity" ("id" serial primary key, "evaluation_id" int not null, "criteria_level_id" int not null, "created_at" timestamp not null, "updated_at" timestamp null);');

    this.addSql('alter table "employee_entity" add constraint "employee_entity_direct_report_employee_id_foreign" foreign key ("direct_report_employee_id") references "employee_entity" ("employee_id") on update cascade on delete set null;');

    this.addSql('alter table "evaluation_record_entity" add constraint "evaluation_record_entity_evaluate_to_employee_id_foreign" foreign key ("evaluate_to_employee_id") references "employee_entity" ("employee_id") on update cascade;');
    this.addSql('alter table "evaluation_record_entity" add constraint "evaluation_record_entity_evaluated_by_employee_id_foreign" foreign key ("evaluated_by_employee_id") references "employee_entity" ("employee_id") on update cascade;');
    this.addSql('alter table "evaluation_record_entity" add constraint "evaluation_record_entity_approver_by_employee_id_foreign" foreign key ("approver_by_employee_id") references "employee_entity" ("employee_id") on update cascade on delete set null;');
    this.addSql('alter table "evaluation_record_entity" add constraint "evaluation_record_entity_prev_id_foreign" foreign key ("prev_id") references "evaluation_record_entity" ("id") on update cascade on delete set null;');

    this.addSql('alter table "evaluation_detail_entity" add constraint "evaluation_detail_entity_evaluation_id_foreign" foreign key ("evaluation_id") references "evaluation_record_entity" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "evaluation_detail_entity" add constraint "evaluation_detail_entity_criteria_level_id_foreign" foreign key ("criteria_level_id") references "criteria_level_entity" ("id") on update cascade;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "evaluation_detail_entity" drop constraint "evaluation_detail_entity_criteria_level_id_foreign";');

    this.addSql('alter table "employee_entity" drop constraint "employee_entity_direct_report_employee_id_foreign";');

    this.addSql('alter table "evaluation_record_entity" drop constraint "evaluation_record_entity_evaluate_to_employee_id_foreign";');

    this.addSql('alter table "evaluation_record_entity" drop constraint "evaluation_record_entity_evaluated_by_employee_id_foreign";');

    this.addSql('alter table "evaluation_record_entity" drop constraint "evaluation_record_entity_approver_by_employee_id_foreign";');

    this.addSql('alter table "evaluation_record_entity" drop constraint "evaluation_record_entity_prev_id_foreign";');

    this.addSql('alter table "evaluation_detail_entity" drop constraint "evaluation_detail_entity_evaluation_id_foreign";');

    this.addSql('drop table if exists "criteria_level_entity" cascade;');

    this.addSql('drop table if exists "employee_entity" cascade;');

    this.addSql('drop table if exists "evaluation_record_entity" cascade;');

    this.addSql('drop table if exists "evaluation_detail_entity" cascade;');
  }

}
