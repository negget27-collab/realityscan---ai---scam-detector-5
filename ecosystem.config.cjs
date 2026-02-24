/**
 * PM2 Ecosystem - cluster mode para escalar o RealityScan
 * Uso: pm2 start ecosystem.config.cjs
 * Comandos: pm2 status | pm2 logs | pm2 restart all
 *
 * Opcional: PM2_INSTANCES=4 pm2 start ecosystem.config.cjs (fixar 4 workers)
 * Crie a pasta logs/ antes: mkdir -p logs
 */
module.exports = {
  apps: [
    {
      name: "realityscan",
      script: "./server.js",
      instances: process.env.PM2_INSTANCES || "max", // max = todos os cores da CPU
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "600M",
      env: { NODE_ENV: "production" },
      env_production: { NODE_ENV: "production" },
      // Logs
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};
