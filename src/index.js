/* Environment variables */
const botToken         = process.env.BOT_TOKEN         || ''
    , mnemonic         = process.env.MNEMONIC          || ''
    , mnemonicPassword = process.env.MNEMONIC_PASSWORD || ''
    , dbFile           = process.env.DATABASE_FILE     || 'bot.db';

/* Imports */
const Database   = require('./db')
    , Telegraf   = require('telegraf')
    , BITBOXCli  = require('bitbox-cli/lib/bitbox-cli').default
    , BITBOX     = new BITBOXCli()
    , context    = require('./context')
    , middleware = require('./middleware')
    , handlers   = require('./handlers');

/* Variables */
const db  = new Database(dbFile)
    , bot = new Telegraf(botToken);

const seedBuf = BITBOX.Mnemonic.toSeed(mnemonic, mnemonicPassword)
    , hdNode  = BITBOX.HDNode.fromSeed(seedBuf);

/* Global Middleware */
/* Skip        */ bot.use(middleware.skipNonTextualMessage);
/* Catch Error */ bot.use(middleware.errorHandler);
/* Group Only  */ bot.use(middleware.groupOnly);


/* Context Binding */
/* Account  */  context.account(bot, hdNode, `m/44'/145'/%d'/0/0`);
/* List     */  context.addresses(bot, db);
/* Settings */  context.settings(bot, db);
/* Scheduler */ context.scheduler(bot);

/* Handlers */
bot.hears(/^\/admin/i,    middleware.adminOnly, handlers.cmdAdmin);
bot.hears(/^\/airdrop/i,  middleware.adminOnlyConditional, handlers.cmdAirdrop);
bot.hears(/^\/amount/i,   middleware.adminOnly, handlers.cmdAmount);
bot.hears(/^\/list/i,     handlers.cmdList);
bot.hears(/^\/clear/i,    middleware.adminOnly, handlers.cmdClear);
bot.hears(/^\/info/i,     handlers.cmdInfo);
bot.hears(/^\/party/i,    handlers.cmdParty);
bot.hears(/^\/register/i, handlers.cmdRegister);
bot.hears(/^\/token/i,    middleware.adminOnly, handlers.cmdToken);
bot.hears(/^\/withdraw/i, middleware.adminOnly, handlers.cmdWithdraw);

// Open database and start bot
db.open()
    .then(() => bot.startPolling())
    .catch(console.error);
