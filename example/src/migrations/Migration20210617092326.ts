import { Migration } from '@mikro-orm/migrations';

export class Migration20210617092326 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "shelves" ("slug" VARCHAR(250) not null, "updated_at" timestamp not null);');
    this.addSql('alter table "shelves" add constraint "shelves_pkey" primary key ("slug");');

    this.addSql('create table "books" ("shelf_slug" VARCHAR(250) not null, "isbn" VARCHAR(120) not null, "title" VARCHAR(250) not null, "updated_at" timestamp not null);');
    this.addSql('alter table "books" add constraint "books_pkey" primary key ("shelf_slug", "isbn");');

    this.addSql('alter table "books" add constraint "books_shelf_slug_foreign" foreign key ("shelf_slug") references "shelves" ("slug") on update cascade on delete cascade;');
  }

  async down(): Promise<void> {
    this.addSql('drop table "books" cascade;')
    this.addSql('drop table "shelves" cascade;')
  }
}
