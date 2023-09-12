export const logger = {
  info(message: string) {
    console.log(`\n[INFO] ${message}\n`);
  },
  error(message: string) {
    console.log(`\n[ERROR] ${message}\n`);
  },
};
