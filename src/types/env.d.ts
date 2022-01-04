declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string;
    ORIGIN: string;
    DATABASE_URL: string;
    SESSION_SECRET: string;
    NM_USER: string;
    NM_PASS: string;
    REDIS_URL: string;
    REDIS_PASSWORD: string;
  }
}