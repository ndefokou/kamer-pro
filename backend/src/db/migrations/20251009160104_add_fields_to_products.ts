import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.table('products', (table) => {
        table.string('category');
        table.string('location');
        table.string('contact_phone');
        table.string('contact_email');
        table.string('image_url');
        table.string('status').defaultTo('active');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.table('products', (table) => {
        table.dropColumn('category');
        table.dropColumn('location');
        table.dropColumn('contact_phone');
        table.dropColumn('contact_email');
        table.dropColumn('image_url');
        table.dropColumn('status');
    });
}