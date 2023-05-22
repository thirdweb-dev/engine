import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { getEnv } from "../loadEnv";
import { connectToDB } from "./dbConnect";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const checkTablesExistence = async () : Promise<void> => {
    try {
        // Connect to the DB
        const knex = await connectToDB();

        // Check if the tables Exists
        const tablesList: string[] = getEnv('DB_TABLES_LIST').split(",").map(function(item) {
            return item.trim();
        });

        if (!tablesList) {
            throw new Error(`DB_TABLES_LIST ENV variable is empty`);
        }

        for (const tableName of tablesList) {
            const tableExists: boolean = await knex.schema.hasTable(tableName);

            if (!tableExists) {
                const schemaSQL = await fs.readFile(`${__dirname}/../../../sql-schemas/${tableName}.sql`, 'utf-8');

                // Create Table using schema
                await knex.schema.raw(schemaSQL);

                console.log(`Table ${tableName} created on startup successfully`);
            } else {
                console.log(`Table ${tableName} already exists`);
            }
        }

        // Disconnect from DB
        await knex.destroy();
    } catch (error) {
        console.error('An error occurred while checking the tables:', error);
    }
};