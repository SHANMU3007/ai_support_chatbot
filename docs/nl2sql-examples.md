# NL2SQL Examples

The analytics dashboard includes a natural-language query box powered by Groq (llama-3.3-70b-versatile) + SQL.
These are example questions you can ask, along with the SQL that gets generated.

---

## Basic Counts

**Q: How many chatbots do I have?**
```sql
SELECT COUNT(*) AS chatbot_count
FROM chatbots
WHERE user_id = 'your-user-id'
  AND is_active = true;
```

**Q: How many messages were sent this month?**
```sql
SELECT COUNT(*) AS message_count
FROM messages m
JOIN chat_sessions cs ON m.session_id = cs.id
JOIN chatbots c ON cs.chatbot_id = c.id
WHERE c.user_id = 'your-user-id'
  AND m.created_at >= date_trunc('month', now());
```

---

## Time-Based Analysis

**Q: What were the busiest days last week?**
```sql
SELECT
  DATE(m.created_at) AS day,
  COUNT(*) AS messages
FROM messages m
JOIN chat_sessions cs ON m.session_id = cs.id
JOIN chatbots c ON cs.chatbot_id = c.id
WHERE c.user_id = 'your-user-id'
  AND m.created_at >= now() - interval '7 days'
GROUP BY day
ORDER BY day;
```

**Q: Which hours of the day have the most conversations?**
```sql
SELECT
  EXTRACT(HOUR FROM cs.started_at) AS hour,
  COUNT(*) AS sessions
FROM chat_sessions cs
JOIN chatbots c ON cs.chatbot_id = c.id
WHERE c.user_id = 'your-user-id'
GROUP BY hour
ORDER BY sessions DESC;
```

---

## Chatbot Performance

**Q: Which chatbot has the most conversations?**
```sql
SELECT
  c.name,
  COUNT(cs.id) AS session_count
FROM chatbots c
LEFT JOIN chat_sessions cs ON cs.chatbot_id = c.id
WHERE c.user_id = 'your-user-id'
GROUP BY c.id, c.name
ORDER BY session_count DESC
LIMIT 5;
```

**Q: Average messages per session per chatbot?**
```sql
SELECT
  c.name,
  ROUND(AVG(msg_count), 1) AS avg_messages_per_session
FROM chatbots c
JOIN (
  SELECT cs.chatbot_id, COUNT(m.id) AS msg_count
  FROM chat_sessions cs
  JOIN messages m ON m.session_id = cs.id
  GROUP BY cs.id, cs.chatbot_id
) sub ON sub.chatbot_id = c.id
WHERE c.user_id = 'your-user-id'
GROUP BY c.id, c.name
ORDER BY avg_messages_per_session DESC;
```

---

## Language & Geography

**Q: What languages do my visitors use?**
```sql
SELECT
  language,
  COUNT(*) AS sessions
FROM chat_sessions cs
JOIN chatbots c ON cs.chatbot_id = c.id
WHERE c.user_id = 'your-user-id'
GROUP BY language
ORDER BY sessions DESC;
```

---

## Document Stats

**Q: How many documents have been processed successfully?**
```sql
SELECT
  c.name AS chatbot,
  COUNT(d.id) AS doc_count,
  SUM(d.chunk_count) AS total_chunks
FROM documents d
JOIN chatbots c ON d.chatbot_id = c.id
WHERE c.user_id = 'your-user-id'
  AND d.status = 'DONE'
GROUP BY c.id, c.name;
```

---

## Tips

- Questions are interpreted by the AI engine, so natural phrasing works well.
- Only `SELECT` queries are executed; mutations are blocked.
- Your `user_id` is always automatically included in the WHERE clause for security.
- Results are shown in a table with the generated SQL visible below.
