import { Knex } from 'knex';
import pg from 'knex';
import { getEnv } from '../loadEnv';
import { FastifyInstance, FastifyRequest } from 'fastify';

const DATABASE_NAME = getEnv('DATABASE_NAME');

// Defaults to postgres
const dbClient = getEnv('DATABASE_CLIENT') ?? 'pg';

export const connectToDB = async (server: FastifyInstance | FastifyRequest) : Promise<Knex> => {

    // Creating KNEX Config
    let connection: Knex.ConnectionConfig = {
        host: getEnv('POSTGRES_HOST'),
        user: getEnv('POSTGRES_USER'),
        password: getEnv('POSTGRES_PASSWORD'),
        database: ''
    };

    let knexConfig: Knex.Config = {
        client: dbClient,
        connection,
    };

    // Set the appropriate databse client package
    let dbClientPackage: any;
    switch (dbClient) {
        case 'pg':
            dbClientPackage = pg;
            break;
        default:
            throw new Error(`Unsupported database client: ${dbClient}`);
    }

    let knex = dbClientPackage(knexConfig);

    // Check if Database Exists & create if it doesn't
    let hasDatabase: any;
    switch (dbClient) {
        case 'pg':
            hasDatabase = await knex.raw(`SELECT 1 from pg_database WHERE datname = '${DATABASE_NAME}'`)
            server.log.info(`CHECKING for Database ${DATABASE_NAME}...`);
            if (!hasDatabase.rows.length) {
                await knex.raw(`CREATE DATABASE ${DATABASE_NAME}`);
            } else {
                server.log.info(`Database ${DATABASE_NAME} already exists`);
            }
            break;
        default:
            throw new Error(`Unsupported database client: ${dbClient}. Cannot create database ${DATABASE_NAME}`);
    }

    // Updated the DATABASE name on connection object
    connection.database = DATABASE_NAME;

    // Updating knex Config
    knexConfig = {
        client: dbClient,
        connection,
    };

    // re-instantiate connection with new config
    knex = dbClientPackage(knexConfig);

    return knex;
}


export const connectWithDatabase = async (server: FastifyInstance | FastifyRequest) : Promise<Knex> => {

    // Creating KNEX Config
    let connection: Knex.ConnectionConfig = {
        host: getEnv('POSTGRES_HOST'),
        user: getEnv('POSTGRES_USER'),
        password: getEnv('POSTGRES_PASSWORD'),
        database: DATABASE_NAME
    };

    let knexConfig: Knex.Config = {
        client: dbClient,
        connection,
    };

    // Set the appropriate databse client package
    let dbClientPackage: any;
    switch (dbClient) {
        case 'pg':
            dbClientPackage = pg;
            break;
        default:
            throw new Error(`Unsupported database client: ${dbClient}`);
    }

    // instantiate connection with new config
    const knex = dbClientPackage(knexConfig);

    return knex;
}