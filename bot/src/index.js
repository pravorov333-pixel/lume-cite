import { Telegraf, Scenes, session } from "telegraf";
import { config } from "./config.js";
import { registerStart } from "./handlers/start.js";
import { registerSupport } from "./handlers/support.js";
import { registerFreeSub } from "./handlers/freeSub.js";
import { registerSubmitProof, collectProofScene } from "./handlers/submitProof.js";
import { registerBuyKey, collectTxHashScene } from "./handlers/buyKey.js";
import { registerAdmin } from "./handlers/admin.js";

const bot = new Telegraf(config.botToken);

const stage = new Scenes.Stage([collectProofScene, collectTxHashScene]);

bot.use(session());
bot.use(stage.middleware());

registerStart(bot);
registerSupport(bot);
registerFreeSub(bot);
registerSubmitProof(bot);
registerBuyKey(bot);
registerAdmin(bot);

bot.catch((err, ctx) => {
  console.error(`Error while handling update ${ctx.update.update_id}:`, err);
});

bot.launch().then(() => {
  console.log("LumeVisuals bot is running.");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
