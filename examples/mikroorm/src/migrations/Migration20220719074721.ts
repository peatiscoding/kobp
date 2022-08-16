import { Migration } from '@mikro-orm/migrations';

export class Migration20220719074721 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "library" ("slug" VARCHAR(250) not null, "title" VARCHAR(250) not null, "updated_at" timestamp not null);');
    this.addSql('alter table "library" add constraint "library_pkey" primary key ("slug");');

    this.addSql('create table "library_shelf" ("library_slug" VARCHAR(250) not null, "slug" VARCHAR(250) not null, "updated_at" timestamp not null);');
    this.addSql('alter table "library_shelf" add constraint "library_shelf_pkey" primary key ("library_slug", "slug");');

    this.addSql('create table "book_tag" ("slug" VARCHAR(250) not null, "updated_at" timestamp not null);');
    this.addSql('alter table "book_tag" add constraint "book_tag_pkey" primary key ("slug");');

    this.addSql('create table "books" ("isbn" VARCHAR(120) not null, "title" VARCHAR(250) not null, "updated_at" timestamp not null);');
    this.addSql('alter table "books" add constraint "books_pkey" primary key ("isbn");');

    this.addSql('create table "books_tags" ("book_entity_isbn" VARCHAR(120) not null, "book_tag_entity_slug" VARCHAR(250) not null);');
    this.addSql('alter table "books_tags" add constraint "books_tags_pkey" primary key ("book_entity_isbn", "book_tag_entity_slug");');

    this.addSql('create table "library_shelf_books" ("library_shelf_entity_library_slug" VARCHAR(250) not null, "library_shelf_entity_slug" VARCHAR(250) not null, "book_entity_isbn" VARCHAR(120) not null);');
    this.addSql('alter table "library_shelf_books" add constraint "library_shelf_books_pkey" primary key ("library_shelf_entity_library_slug", "library_shelf_entity_slug", "book_entity_isbn");');

    this.addSql('alter table "library_shelf" add constraint "library_shelf_library_slug_foreign" foreign key ("library_slug") references "library" ("slug") on update cascade on delete cascade;');

    this.addSql('alter table "books_tags" add constraint "books_tags_book_entity_isbn_foreign" foreign key ("book_entity_isbn") references "books" ("isbn") on update cascade on delete cascade;');
    this.addSql('alter table "books_tags" add constraint "books_tags_book_tag_entity_slug_foreign" foreign key ("book_tag_entity_slug") references "book_tag" ("slug") on update cascade on delete cascade;');

    this.addSql('alter table "library_shelf_books" add constraint "library_shelf_books_library_shelf_entity_library__f7245_foreign" foreign key ("library_shelf_entity_library_slug", "library_shelf_entity_slug") references "library_shelf" ("library_slug", "slug") on update cascade on delete cascade;');
    this.addSql('alter table "library_shelf_books" add constraint "library_shelf_books_book_entity_isbn_foreign" foreign key ("book_entity_isbn") references "books" ("isbn") on update cascade on delete cascade;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "library_shelf" drop constraint "library_shelf_library_slug_foreign";');

    this.addSql('alter table "library_shelf_books" drop constraint "library_shelf_books_library_shelf_entity_library__f7245_foreign";');

    this.addSql('alter table "books_tags" drop constraint "books_tags_book_tag_entity_slug_foreign";');

    this.addSql('alter table "books_tags" drop constraint "books_tags_book_entity_isbn_foreign";');

    this.addSql('alter table "library_shelf_books" drop constraint "library_shelf_books_book_entity_isbn_foreign";');

    this.addSql('drop table if exists "library" cascade;');

    this.addSql('drop table if exists "library_shelf" cascade;');

    this.addSql('drop table if exists "book_tag" cascade;');

    this.addSql('drop table if exists "books" cascade;');

    this.addSql('drop table if exists "books_tags" cascade;');

    this.addSql('drop table if exists "library_shelf_books" cascade;');
  }

}
