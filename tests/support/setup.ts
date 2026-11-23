import "dotenv/config";

// Tests always talk to the throw-away database, never the development one.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.APP_ENV = "test";
process.env.SMS_PROVIDER = "console";
