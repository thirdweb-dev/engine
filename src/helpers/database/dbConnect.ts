import { Knex } from 'knex';
import { getEnv } from '../loadEnv';

// Defaults to postgres
const dbClient = getEnv('DATABASE_CLIENT') ?? 'pg';

export const connectToDB = async () : Promise<Knex> => {

    // Creating KNEX Config
    const knexConfig: Knex.Config = {
        client: dbClient,
        connection: {
            host: getEnv('DATABASE_HOST'),
            user: getEnv('DATABASE_USER'),
            password: getEnv('DATABASE_PASSWORD'),
            database: getEnv('DATABASE_NAME'),
        }
    };

    // Set the appropriate databse client package
    let dbClientPackage: any;
    switch (dbClient) {
        case 'pg':
            dbClientPackage = (await import('pg')).default;
            break;
        default:
            throw new Error(`Unsupported database client: ${dbClient}`);
    }

    const knex: Knex = dbClientPackage(knexConfig);
    
    return knex;
}