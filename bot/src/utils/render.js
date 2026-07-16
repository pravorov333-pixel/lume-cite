/** Edits the current message in place; falls back to a fresh reply if editing isn't possible. */
export async function render(ctx, text, extra = {}) {
  try {
    await ctx.editMessageText(text, { parse_mode: "Markdown", ...extra });
  } catch {
    await ctx.reply(text, { parse_mode: "Markdown", ...extra });
  }
}
