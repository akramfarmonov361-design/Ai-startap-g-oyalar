import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

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
        throw new Error(`Telegram API Error: ${result.description}`);
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !GEMINI_API_KEY) {
        return res.status(400).json({ error: 'Environment variables missing.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.replace(/^["']|["']$/g, '').trim() });

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
            const promptText = idea.aiStudioPrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;');

            let msg = `🚀 <b>2026-yil uchun Yangi Startap G'oyasi</b>\n\n`;
            msg += `<b>${idea.title}</b>\n\n`;
            msg += `🔴 <b>Muammo:</b> ${idea.problem}\n\n`;
            msg += `🟢 <b>Yechim:</b> ${idea.solution}\n\n`;
            msg += `💻 <b>AI Studio Prompt:</b>\n<code>${promptText.substring(0, 3000)}</code>`;

            await sendTgMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, msg);
            return res.json({ success: true, message: 'Cron: 1 ta g\'oya yuborildi!' });
        }

        return res.status(500).json({ error: 'G\'oya yaratishda xatolik.' });
    } catch (error: any) {
        console.error('Cron error:', error);
        return res.status(500).json({ error: error.message });
    }
}
