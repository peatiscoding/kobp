import { Migration } from '@mikro-orm/migrations'

export class Migration20240321054045 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "books" add column "number_of_pages" integer null;')
  }

  async down(): Promise<void> {
    this.addSql('alter table "books" drop column "number_of_pages";')
  }
}
