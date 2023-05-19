import { createLogger, transports, format} from 'winston';
import { getEnv } from '../helpers/loadEnv';

let log_level = 'info';
if (getEnv('NODE_ENV') !== 'production') {
    log_level = 'silly';
}

export const logger = createLogger({
    level: log_level,
    levels: {
        debug: 0,
        info: 1,
        silly: 2, 
        warn: 3,
        error: 4,
    },
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.errors({stack: true}),
        format.splat(),
        format.json()
    ),
    // timestamp: true,
    // expressFormat: true,
    defaultMeta: { service: 'web3-api'},
    // transport: {},
    // handleExceptions: true,
    // humanReadableUnhandledException: true,
    // exitOnError: false
});

if (getEnv('NODE_ENV') !== 'production'){
    logger.add(
        new transports.Console({
            level: log_level || 'silly',
            format: format.combine(
                format.colorize(),
                format.prettyPrint(),
                format.splat(),
                format.printf((info: any) => {
                    if ('stack' in info) {
                        return `[${info.level}] : ${info.timestamp} : ${info.stack}`;
                    }
                    if (typeof info.message === 'object') {
                        info.message = JSON.stringify(info.message, null, 4);
                    }
                    return `[${info.level}] : ${info.timestamp} : ${info.message}`;
                }),
            ),
        }),
    );
} else {
    logger.add(
        new transports.Console({
            level: log_level,
            format: format.combine(
                format.splat(),
                format.printf((info: any) => {
                    if ('stack' in info) {
                        return `[${info.level}] : ${info.timestamp} : ${info.stack}`;
                    }
                    if (typeof info.message === 'object') {
                        info.message = JSON.stringify(info.message, null, 4);
                    }
                    return `[${info.level}] : ${info.timestamp} : ${info.message}`;
                }),
            ),
        }),
    );
}

logger.exceptions.handle(new transports.Console());
process.on('unhandledRejection', (ex) => {
    logger.error('Unhandled Rejection Error');
    logger.error(ex);
});

process.on('uncaughtException', (ex) => {
    logger.error('uncaught Exception Error');
    logger.error(ex);
});
