"""
Telegram Bot Manager – runs Telegram bots for chatbots using polling.
No webhooks, no HTTPS, no tunnels needed. Works purely over localhost.
Each chatbot with a telegramToken gets its own polling bot instance.

NOTE: _handle_message calls RagService directly (no HTTP round-trip),
so this works identically in local dev and any deployed environment.
"""
import asyncio
import logging
from typing import Dict, Optional

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

from app.services.rag_service import RagService
from telegram.error import Conflict, NetworkError, TelegramError

logger = logging.getLogger(__name__)

# Store running bot applications by chatbot_id
_running_bots: Dict[str, Application] = {}

# Single shared RAG service instance (thread-safe / async-safe)
_rag_service = RagService()


async def _error_handler(update: object, context: ContextTypes.DEFAULT_TYPE):
    """Handle uncaught errors in the Telegram application / updater loop."""
    if isinstance(context.error, Conflict):
        cb_id = context.bot_data.get("chatbot_id", "unknown")
        logger.warning(
            "Telegram bot conflict for chatbot %s: Another instance is polling with this token. "
            "Will automatically resolve once the previous container / instance shuts down.",
            cb_id,
        )
        await asyncio.sleep(5)
    elif isinstance(context.error, NetworkError):
        logger.warning("Telegram bot network error: %s", context.error)
    else:
        logger.error("Telegram bot error: %s", context.error, exc_info=context.error)


async def _handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle the /start command."""
    if not update.message:
        return
    bot_name = context.bot_data.get("business_name", "our business")
    try:
        await update.message.reply_text(
            f"\U0001f44b Hello! I'm the AI assistant for {bot_name}.\n\n"
            f"Ask me anything about our services and I'll be happy to help!"
        )
    except Exception:
        logger.exception("Failed to send /start reply")


async def _handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming text messages — call RagService directly and reply."""
    if not update.message or not update.message.text:
        return

    user_message = update.message.text
    chatbot_id = context.bot_data.get("chatbot_id", "")
    chat_id = update.message.chat_id
    user_id = update.message.from_user.id if update.message.from_user else 0
    language = context.bot_data.get("language", "en")
    system_prompt = context.bot_data.get("system_prompt")

    logger.info(
        "Telegram message from user=%s chat=%s chatbot=%s: %s (lang: %s)",
        user_id, chat_id, chatbot_id, user_message[:100], language,
    )

    # Send "typing" indicator while we process.
    # Telegram's typing indicator expires after ~5s, so we refresh it
    # periodically with a background task during long RAG responses.
    typing_active = True

    async def _keep_typing():
        """Refresh typing indicator every 4 seconds until cancelled."""
        while typing_active:
            try:
                await update.message.chat.send_action("typing")
            except Exception:
                break
            await asyncio.sleep(4)

    typing_task = asyncio.create_task(_keep_typing())

    reply = ""
    try:
        # Call RagService directly — no HTTP round-trip, works in all envs
        async for chunk in _rag_service.stream_response(
            chatbot_id=chatbot_id,
            session_id=f"tg_{chat_id}",
            message=user_message,
            history=[],
            visitor_id=f"telegram_{user_id}",
            language=language,
            system_prompt=system_prompt,
        ):
            reply += chunk

        logger.info("Reply generated: %d chars for chatbot %s", len(reply), chatbot_id)

    except Exception:
        logger.exception(
            "Error generating RAG response for Telegram bot (chatbot %s)", chatbot_id
        )
        reply = "\U0001f61e Something went wrong. Please try again in a moment."
    finally:
        # Stop the typing indicator
        typing_active = False
        typing_task.cancel()
        try:
            await typing_task
        except asyncio.CancelledError:
            pass

    # Ensure reply is not empty
    if not reply or not reply.strip():
        reply = "I'm sorry, I couldn't generate a response. Please try again."

    # Telegram has a 4096 char limit per message — send in chunks if needed
    try:
        if len(reply) > 4000:
            for i in range(0, len(reply), 4000):
                await update.message.reply_text(reply[i : i + 4000])
        else:
            await update.message.reply_text(reply)
    except Exception:
        logger.exception("Failed to send reply to Telegram chat %s", chat_id)


async def start_bot(
    chatbot_id: str,
    token: str,
    business_name: str,
    language: str = "en",
    system_prompt: Optional[str] = None,
) -> bool:
    """Start a Telegram bot for a specific chatbot using polling."""
    # Clean the token: strip spaces, newlines, carriage returns (common in copy-pastes)
    token = token.strip().replace(" ", "").replace("\n", "").replace("\r", "")

    if not token:
        logger.error("Empty Telegram token for chatbot %s", chatbot_id)
        return False

    if chatbot_id in _running_bots:
        logger.info("Bot for chatbot %s is already running, restarting...", chatbot_id)
        await stop_bot(chatbot_id)

    # Fast retry attempt with clean error logging
    max_retries = 2
    for attempt in range(1, max_retries + 1):
        app: Application | None = None
        try:
            app = (
                Application.builder()
                .token(token)
                .connect_timeout(8.0)
                .read_timeout(10.0)
                .write_timeout(10.0)
                .pool_timeout(8.0)
                .build()
            )

            # Store metadata in bot_data so handlers can access it
            app.bot_data["chatbot_id"] = chatbot_id
            app.bot_data["business_name"] = business_name
            app.bot_data["language"] = language
            app.bot_data["system_prompt"] = system_prompt

            # Register handlers
            app.add_handler(CommandHandler("start", _handle_start))
            app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, _handle_message))
            app.add_error_handler(_error_handler)

            # Initialize and start polling
            logger.info("Connecting to Telegram API (attempt %d/%d)...", attempt, max_retries)
            await app.initialize()
            await app.start()
            try:
                await app.bot.delete_webhook(drop_pending_updates=True)
            except Exception as w_err:
                logger.warning("Could not delete webhook for chatbot %s: %s", chatbot_id, w_err)

            await app.updater.start_polling(drop_pending_updates=True, bootstrap_retries=-1)

            _running_bots[chatbot_id] = app
            logger.info("Telegram bot started for chatbot %s (%s)", chatbot_id, business_name)
            return True

        except Exception as exc:
            # Clean up partially initialized Application
            if app is not None:
                try:
                    await app.shutdown()
                except Exception:
                    pass

            if attempt < max_retries:
                logger.warning("Telegram connect attempt %d failed for %s: %s — retrying in 2s", attempt, chatbot_id, exc)
                await asyncio.sleep(2)
            else:
                logger.warning(
                    "Telegram bot for %s could not connect to api.telegram.org (Network/ISP restriction or invalid token). Skipping Telegram polling.",
                    chatbot_id
                )

    return False


async def stop_bot(chatbot_id: str):
    """Stop a running Telegram bot."""
    app = _running_bots.pop(chatbot_id, None)
    if app:
        try:
            if app.updater and app.updater.running:
                await app.updater.stop()
            if app.running:
                await app.stop()
        except Exception:
            logger.exception("Error stopping Telegram bot for chatbot %s", chatbot_id)
        finally:
            # Always call shutdown to release resources, even if stop() failed
            try:
                await app.shutdown()
            except Exception:
                pass
        logger.info("Telegram bot stopped for chatbot %s", chatbot_id)


async def stop_all_bots():
    """Stop all running Telegram bots. Called during application shutdown."""
    bot_ids = list(_running_bots.keys())
    for chatbot_id in bot_ids:
        await stop_bot(chatbot_id)
    if bot_ids:
        logger.info("Stopped %d Telegram bot(s) during shutdown", len(bot_ids))


def get_running_bots() -> list:
    """Return list of chatbot_ids with active Telegram bots."""
    return list(_running_bots.keys())
