import { Migration } from '@mikro-orm/migrations';

export class Migration20220815041905 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "library_shelf" add column "title" VARCHAR(250) not null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "library_shelf" drop column "title";');
  }

}
