import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('product_images', (table) => {
        table.increments('id').primary();
        table.string('image_url').notNullable();
        table.integer('product_id').unsigned().references('id').inTable('products').onDelete('CASCADE');
        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('product_images');
}
