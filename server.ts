import express from 'express';
import { createServer as createViteServer } from 'vite';
import cron from 'node-cron';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Telegram Bot Logic
const generateAndSendIdeas = async () => {
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

  // Strip quotes if present and trim
  GEMINI_API_KEY = GEMINI_API_KEY.replace(/^["']|["']$/g, '').trim();

  console.log(`GEMINI_API_KEY length: ${GEMINI_API_KEY.length}, starts with: ${GEMINI_API_KEY.substring(0, 5)}`);

  try {
    console.log('Generating 5 ideas for Telegram...');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const prompt = `Siz 2026-yildagi vizyoner startap asoschisi va texnologiya ekspertisiz.
    Google AI Studio yordamida qurilishi mumkin bo'lgan 5 ta yuqori innovatsion, hayotiy startap g'oyasini o'ylab toping.
    G'oyalar 2026-yilda mavjud bo'lgan eng so'nggi AI imkoniyatlaridan foydalanishi SHART.
    
    Har bir g'oya uchun quyidagilarni taqdim eting:
    1. Sarlavha (O'zbek tilida)
    2. Muammo (O'zbek tilida)
    3. Yechim (O'zbek tilida)
    4. AI Studio Prompt (Ingliz tilida)

    Javobni faqat JSON formatida qaytaring.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
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
      }
    });

    if (response.text) {
      const ideas = JSON.parse(response.text);
      
      let message = `🚀 <b>2026-yil uchun Yangi Startap G'oyalari (Top 5)</b>\n\n`;
      ideas.forEach((idea: any, index: number) => {
        message += `<b>${index + 1}. ${idea.title}</b>\n`;
        message += `🔴 <b>Muammo:</b> ${idea.problem}\n`;
        message += `🟢 <b>Yechim:</b> ${idea.solution}\n`;
        message += `💻 <b>Prompt:</b> <code>${idea.aiStudioPrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>\n\n`;
        message += `〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\n\n`;
      });

      // Send to Telegram
      const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML'
        })
      });
      
      const tgResult = await tgResponse.json();
      if (!tgResult.ok) {
        console.error('Telegram API Error:', tgResult);
        throw new Error(`Telegram API Error: ${tgResult.description}`);
      } else {
        console.log('Successfully sent 5 ideas to Telegram.');
      }
    }
  } catch (error) {
    console.error('Error generating/sending ideas:', error);
    throw error;
  }
};

// Schedule task every 3 hours
cron.schedule('0 */3 * * *', () => {
  console.log('Running scheduled Telegram job...');
  generateAndSendIdeas();
});

// API route to manually trigger for testing
app.post('/api/trigger-telegram', async (req, res) => {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(400).json({ error: 'Telegram bot token or chat ID is missing in environment variables.' });
  }
  
  try {
    await generateAndSendIdeas();
    res.json({ success: true, message: 'Telegram bot triggered successfully. 5 ideas sent to your bot!' });
  } catch (error: any) {
    console.error('Error in trigger-telegram:', error);
    res.status(500).json({ error: error.message || 'Failed to generate or send ideas.' });
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
    console.log('Cron job scheduled: Every 3 hours');
  });
}

startServer();
