const durationPattern = /^\d+(s|m|h|d)$/;

export const validateEnvironment = (config: Record<string, unknown>) => {
  const port = Number(config.PORT);
  const jwtSecret = config.JWT_SECRET;
  const jwtExpiresIn = config.JWT_EXPIRES_IN;
  const jwtRefreshSecret = config.JWT_REFRESH_SECRET;
  const jwtRefreshExpiresIn = config.JWT_REFRESH_EXPIRES_IN;
  const rateLimitTtl = Number(config.RATE_LIMIT_TTL);
  const rateLimitLimit = Number(config.RATE_LIMIT_LIMIT);
  const redisCacheTtl = Number(config.REDIS_CACHE_TTL ?? 60);
  const dbHost = config.DB_HOST;
  const dbPort = Number(config.DB_PORT);
  const dbUsername = config.DB_USERNAME;
  const dbPassword = config.DB_PASSWORD;
  const dbName = config.DB_NAME;

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  if (typeof jwtSecret !== "string" || jwtSecret.trim().length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long.");
  }

  if (typeof jwtExpiresIn !== "string" || !durationPattern.test(jwtExpiresIn)) {
    throw new Error(
      "JWT_EXPIRES_IN must use a duration such as 30s, 15m, 1h, or 1d.",
    );
  }

  if (
    typeof jwtRefreshSecret !== "string" ||
    jwtRefreshSecret.trim().length < 32
  ) {
    throw new Error("JWT_REFRESH_SECRET must be at least 32 characters long.");
  }

  if (
    typeof jwtRefreshExpiresIn !== "string" ||
    !durationPattern.test(jwtRefreshExpiresIn)
  ) {
    throw new Error(
      "JWT_REFRESH_EXPIRES_IN must use a duration such as 7d or 30d.",
    );
  }

  if (!Number.isInteger(rateLimitTtl) || rateLimitTtl < 1) {
    throw new Error(
      "RATE_LIMIT_TTL must be a positive integer in milliseconds.",
    );
  }

  if (!Number.isInteger(rateLimitLimit) || rateLimitLimit < 1) {
    throw new Error("RATE_LIMIT_LIMIT must be a positive integer.");
  }

  if (!Number.isInteger(redisCacheTtl) || redisCacheTtl < 1) {
    throw new Error("REDIS_CACHE_TTL must be a positive integer in seconds.");
  }

  if (typeof dbHost !== "string" || dbHost.trim().length === 0) {
    throw new Error("DB_HOST must not be empty.");
  }

  if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
    throw new Error("DB_PORT must be an integer between 1 and 65535.");
  }

  if (typeof dbUsername !== "string" || dbUsername.trim().length === 0) {
    throw new Error("DB_USERNAME must not be empty.");
  }

  if (typeof dbPassword !== "string" || dbPassword.length === 0) {
    throw new Error("DB_PASSWORD must not be empty.");
  }

  if (typeof dbName !== "string" || dbName.trim().length === 0) {
    throw new Error("DB_NAME must not be empty.");
  }

  return {
    ...config,
    PORT: port,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_REFRESH_EXPIRES_IN: jwtRefreshExpiresIn,
    RATE_LIMIT_TTL: rateLimitTtl,
    RATE_LIMIT_LIMIT: rateLimitLimit,
    REDIS_CACHE_TTL: redisCacheTtl,
    DB_HOST: dbHost,
    DB_PORT: dbPort,
    DB_USERNAME: dbUsername,
    DB_PASSWORD: dbPassword,
    DB_NAME: dbName,
  };
};
