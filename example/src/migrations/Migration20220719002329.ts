import { Migration } from '@mikro-orm/migrations';

export class Migration20220719002329 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "tags" ("slug" VARCHAR(250) not null, "updated_at" timestamp not null);');
    this.addSql('alter table "tags" add constraint "tags_pkey" primary key ("slug");');

    this.addSql('create table "books_tags" ("book_entity_shelf_slug" VARCHAR(250) not null, "book_entity_isbn" VARCHAR(120) not null, "tag_entity_slug" VARCHAR(250) not null);');
    this.addSql('alter table "books_tags" add constraint "books_tags_pkey" primary key ("book_entity_shelf_slug", "book_entity_isbn", "tag_entity_slug");');

    this.addSql('alter table "books_tags" add constraint "books_tags_book_entity_shelf_slug_book_entity_isbn_foreign" foreign key ("book_entity_shelf_slug", "book_entity_isbn") references "books" ("shelf_slug", "isbn") on update cascade on delete cascade;');
    this.addSql('alter table "books_tags" add constraint "books_tags_tag_entity_slug_foreign" foreign key ("tag_entity_slug") references "tags" ("slug") on update cascade on delete cascade;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "books_tags" drop constraint "books_tags_tag_entity_slug_foreign";');

    this.addSql('drop table if exists "tags" cascade;');

    this.addSql('drop table if exists "books_tags" cascade;');
  }

}
