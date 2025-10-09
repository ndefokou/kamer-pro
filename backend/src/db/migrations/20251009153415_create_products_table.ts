import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('products', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.decimal('price').notNullable();
        table.string('condition');
        table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
        table.timestamps(true, true);
    });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('products');
}
