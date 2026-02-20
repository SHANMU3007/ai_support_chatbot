"""
Telegram Bot Manager – runs Telegram bots for chatbots using polling.
No webhooks, no HTTPS, no tunnels needed. Works purely over localhost.
Each chatbot with a telegramToken gets its own polling bot instance.
"""
import asyncio
import logging
from typing import Dict

import httpx
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

logger = logging.getLogger(__name__)

# Store running bot applications by chatbot_id
_running_bots: Dict[str, Application] = {}


async def _handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle the /start command."""
    bot_name = context.bot_data.get("business_name", "our business")
    await update.message.reply_text(
        f"👋 Hello! I'm the AI assistant for {bot_name}.\n\n"
        f"Ask me anything about our services and I'll be happy to help!"
    )


async def _handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming text messages — send to RAG backend and reply."""
    if not update.message or not update.message.text:
        return

    user_message = update.message.text
    chatbot_id = context.bot_data.get("chatbot_id", "")
    chat_id = update.message.chat_id
    user_id = update.message.from_user.id if update.message.from_user else 0
    backend_url = context.bot_data.get("backend_url", "http://localhost:8000")

    # Send "typing" indicator
    await update.message.chat.send_action("typing")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{backend_url}/chat/telegram",
                json={
                    "chatbot_id": chatbot_id,
                    "session_id": f"tg_{chat_id}",
                    "message": user_message,
                    "visitor_id": f"telegram_{user_id}",
                    "history": [],
                },
            )

            if response.status_code == 200:
                data = response.json()
                reply = data.get("reply", "Sorry, I couldn't generate a response.")
            else:
                logger.error("Backend returned %s: %s", response.status_code, response.text)
                reply = "😞 I'm having trouble connecting right now. Please try again later."

    except Exception as exc:
        logger.exception("Error calling backend for Telegram bot")
        reply = "😞 Something went wrong. Please try again in a moment."

    # Telegram has a 4096 char limit per message
    if len(reply) > 4000:
        for i in range(0, len(reply), 4000):
            await update.message.reply_text(reply[i : i + 4000])
    else:
        await update.message.reply_text(reply)


async def start_bot(chatbot_id: str, token: str, business_name: str, backend_url: str = "http://localhost:8000"):
    """Start a Telegram bot for a specific chatbot using polling."""
    if chatbot_id in _running_bots:
        logger.info("Bot for chatbot %s is already running, restarting...", chatbot_id)
        await stop_bot(chatbot_id)

    # Retry up to 3 times (Telegram API can be slow from certain regions)
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            # Increase timeouts to handle slow connections to api.telegram.org
            app = (
                Application.builder()
                .token(token)
                .connect_timeout(30.0)
                .read_timeout(30.0)
                .write_timeout(30.0)
                .pool_timeout(30.0)
                .build()
            )

            # Store metadata in bot_data so handlers can access it
            app.bot_data["chatbot_id"] = chatbot_id
            app.bot_data["business_name"] = business_name
            app.bot_data["backend_url"] = backend_url

            # Register handlers
            app.add_handler(CommandHandler("start", _handle_start))
            app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, _handle_message))

            # Initialize and start polling
            logger.info("Connecting to Telegram API (attempt %d/%d)...", attempt, max_retries)
            await app.initialize()
            await app.start()
            await app.updater.start_polling(drop_pending_updates=True)

            _running_bots[chatbot_id] = app
            logger.info("✅ Telegram bot started for chatbot %s (%s)", chatbot_id, business_name)
            return True

        except Exception as exc:
            logger.warning(
                "Attempt %d/%d failed for chatbot %s: %s",
                attempt, max_retries, chatbot_id, exc,
            )
            if attempt < max_retries:
                await asyncio.sleep(5)  # wait before retrying
            else:
                logger.exception("Failed to start Telegram bot for chatbot %s after %d attempts", chatbot_id, max_retries)
                return False


async def stop_bot(chatbot_id: str):
    """Stop a running Telegram bot."""
    app = _running_bots.pop(chatbot_id, None)
    if app:
        try:
            await app.updater.stop()
            await app.stop()
            await app.shutdown()
            logger.info("⏹ Telegram bot stopped for chatbot %s", chatbot_id)
        except Exception:
            logger.exception("Error stopping Telegram bot for chatbot %s", chatbot_id)


def get_running_bots() -> list:
    """Return list of chatbot_ids with active Telegram bots."""
    return list(_running_bots.keys())
