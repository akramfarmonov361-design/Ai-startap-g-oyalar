import express from 'express';
import { createServer as createViteServer } from 'vite';
import cron from 'node-cron';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper: Send a single Telegram message (max 4096 chars)
const sendTgMessage = async (token: string, chatId: string, text: string) => {
  const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.substring(0, 4096),
      parse_mode: 'HTML'
    })
  });
  const result = await tgRes.json();
  if (!result.ok) {
    console.error('Telegram API Error:', result);
    throw new Error(`Telegram API Error: ${result.description}`);
  }
};

// Generate and send ONE idea to Telegram
const generateAndSendOneIdea = async () => {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram bot token or chat ID not configured. Skipping job.');
    return;
  }

  let GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY is missing.');
    throw new Error('GEMINI_API_KEY is missing.');
  }

  GEMINI_API_KEY = GEMINI_API_KEY.replace(/^["']|["']$/g, '').trim();

  try {
    console.log('Generating 1 idea for Telegram...');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = `Siz 2026-yildagi vizyoner startap asoschisi va texnologiya ekspertisiz.
    Google AI Studio yordamida qurilishi mumkin bo'lgan 1 ta yuqori innovatsion, hayotiy startap g'oyasini o'ylab toping.
    G'oya 2026-yilda mavjud bo'lgan eng so'nggi AI imkoniyatlaridan foydalanishi SHART.
    
    Quyidagilarni taqdim eting:
    1. Sarlavha (O'zbek tilida)
    2. Muammo (O'zbek tilida)
    3. Yechim (O'zbek tilida)
    4. AI Studio Prompt (Ingliz tilida)

    Javobni faqat JSON formatida qaytaring.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            problem: { type: Type.STRING },
            solution: { type: Type.STRING },
            aiStudioPrompt: { type: Type.STRING }
          },
          required: ['title', 'problem', 'solution', 'aiStudioPrompt']
        }
      }
    });

    if (response.text) {
      const idea = JSON.parse(response.text);
      const prompt = idea.aiStudioPrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      let msg = `🚀 <b>2026-yil uchun Yangi Startap G'oyasi</b>\n\n`;
      msg += `<b>${idea.title}</b>\n\n`;
      msg += `🔴 <b>Muammo:</b> ${idea.problem}\n\n`;
      msg += `🟢 <b>Yechim:</b> ${idea.solution}\n\n`;
      msg += `💻 <b>AI Studio Prompt:</b>\n<code>${prompt.substring(0, 3000)}</code>`;

      await sendTgMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, msg);
      console.log('Successfully sent 1 idea to Telegram.');
    }
  } catch (error) {
    console.error('Error generating/sending idea:', error);
    throw error;
  }
};

// Schedule task every 3 hours — automatically sends 1 idea
cron.schedule('0 */3 * * *', () => {
  console.log('Running scheduled Telegram job (1 idea)...');
  generateAndSendOneIdea();
});

// Also send one idea right when server starts
console.log('Sending first idea on startup...');
generateAndSendOneIdea().catch(err => console.error('Startup idea failed:', err));

// API route to manually trigger for testing
app.post('/api/trigger-telegram', async (req, res) => {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(400).json({ error: 'Telegram bot token or chat ID is missing in environment variables.' });
  }

  try {
    await generateAndSendOneIdea();
    res.json({ success: true, message: 'Telegram bot triggered successfully. 1 idea sent!' });
  } catch (error: any) {
    console.error('Error in trigger-telegram:', error);
    res.status(500).json({ error: error.message || 'Failed to generate or send idea.' });
  }
});

app.get('/api/telegram-status', (req, res) => {
  res.json({
    configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
  });
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Cron job scheduled: Every 3 hours (1 idea)');
  });
}

startServer();
