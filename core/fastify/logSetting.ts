export const logSettings: any = {
  local: {
    redact: ["headers.authorization"],
    level: "debug",
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname,reqId",
        singleLine: true,
      },
    },
  },
  production: {
    redact: ["headers.authorization",],
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname,reqId',
        singleLine: true,
      },
    },
  },
  development: {
    redact: ["headers.authorization",],
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname,reqId',
        singleLine: true,
      },
    },
  },
};