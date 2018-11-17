module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [

    // First application
    {
      name      : 'chatbot-backend',
      script    : 'bot.js',
      env: {
        COMMON_VARIABLE: 'true'
      },
      env_production : {
        NODE_ENV: 'production'
      }
    },
  ],

  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   */
  deploy : {
    production : {
      user : 'rakesh',
      host : 'portal.hirehumanly.com',
      ref  : 'origin/master',
      repo : 'git@chatbot-backend:HireHumanly/chatbotBackend.git',
      path : '/home/rakesh/chatbotBackend',
      'post-deploy' : 'yarn install && pm2 startOrRestart ecosystem.config.js --env production'
    },
    dev : {
      user : 'rakesh',
      host : 'portal.hirehumanly.com',
      ref  : 'origin/master',
      repo : 'git@chatbot-backend:HireHumanly/chatbotBackend.git',
      path : '/home/rakesh/recruiter-app',
      'post-deploy' : 'yarn install && pm2 startOrRestart ecosystem.config.js --env dev',
      env  : {
        NODE_ENV: 'dev'
      }
    }
  }
};
