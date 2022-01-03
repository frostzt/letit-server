declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string;
    ORIGIN: string;
    DB_NAME: string;
    DB_TYPE: string;
    DB_USER: string;
    DB_PASS: string;
    SESSION_SECRET: string;
    NM_USER: string;
    NM_PASS: string;
    REDIS_URL: string;
  }
}