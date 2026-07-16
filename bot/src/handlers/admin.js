import { config } from "../config.js";
import { supabase, grantAccess } from "../supabase.js";
import { CATEGORY_DAYS, CATEGORY_LABEL } from "./submitProof.js";
import { mainMenu } from "../keyboards.js";

export function registerAdmin(bot) {
  bot.action(/^admin_(approve|reject)_(free|order)_(.+)$/, async (ctx) => {
    if (ctx.from.id !== config.adminChatId) {
      await ctx.answerCbQuery("Только для админа.");
      return;
    }

    const [, decision, kind, id] = ctx.match;
    await ctx.answerCbQuery();

    if (kind === "free") {
      await handleFreeDecision(ctx, decision, id);
    } else {
      await handleOrderDecision(ctx, decision, id);
    }
  });
}

async function handleFreeDecision(ctx, decision, submissionId) {
  const { data: submission } = await supabase
    .from("free_task_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (!submission || submission.status !== "pending") {
    await ctx.reply("Заявка уже обработана.");
    return;
  }

  if (decision === "reject") {
    await supabase
      .from("free_task_submissions")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", submissionId);
    await ctx.reply(`❌ Заявка ${submissionId} отклонена.`);
    await ctx.telegram.sendMessage(
      submission.telegram_id,
      `К сожалению, твоя заявка на «${CATEGORY_LABEL[submission.category]}» отклонена. Напиши в поддержку (${config.supportUsername}), если что-то непонятно.`
    );
    return;
  }

  const days = CATEGORY_DAYS[submission.category];
  await supabase
    .from("free_task_submissions")
    .update({ status: "approved", granted_days: days, reviewed_at: new Date().toISOString() })
    .eq("id", submissionId);

  const patch = await grantAccess(submission.telegram_id, { kind: "free", days });

  await ctx.reply(`✅ Заявка ${submissionId} одобрена, выдано ${days} дней.`);
  await ctx.telegram.sendMessage(
    submission.telegram_id,
    `Заявка одобрена! 🎉\n\nТвой ключ: \`${patch.license_key}\`\nБесплатная подписка продлена на ${days} дней.`,
    { parse_mode: "Markdown", ...mainMenu }
  );
}

async function handleOrderDecision(ctx, decision, orderId) {
  const { data: order } = await supabase.from("bot_orders").select("*").eq("id", orderId).single();

  if (!order || order.status === "confirmed" || order.status === "rejected") {
    await ctx.reply("Заказ уже обработан.");
    return;
  }

  if (decision === "reject") {
    await supabase.from("bot_orders").update({ status: "rejected" }).eq("id", orderId);
    await ctx.reply(`❌ Заказ ${orderId} отклонён.`);
    await ctx.telegram.sendMessage(
      order.telegram_id,
      `Оплата по заказу не подтверждена. Напиши в поддержку (${config.supportUsername}), если считаешь, что это ошибка.`
    );
    return;
  }

  await supabase
    .from("bot_orders")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", orderId);

  const patch = await grantAccess(order.telegram_id, {
    kind: "paid",
    lifetime: order.duration === "lifetime",
    days: order.duration === "30d" ? 30 : order.duration === "90d" ? 90 : undefined,
  });

  await ctx.reply(`✅ Заказ ${orderId} подтверждён.`);
  await ctx.telegram.sendMessage(
    order.telegram_id,
    `Оплата подтверждена! ✅\n\nТвой ключ: \`${patch.license_key}\`\n` +
      (order.duration === "lifetime" ? "Действует навсегда." : `Действует ${config.keyLabels[order.duration]}.`),
    { parse_mode: "Markdown", ...mainMenu }
  );
}
