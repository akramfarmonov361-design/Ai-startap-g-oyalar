import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Sparkles,
  Rocket,
  BrainCircuit,
  Globe,
  HeartPulse,
  GraduationCap,
  Coins,
  Video,
  Copy,
  CheckCircle2,
  Loader2,
  Download,
  Send
} from 'lucide-react';

const CATEGORIES = [
  { id: 'random', name: 'Kutilmagan g\'oya', icon: Sparkles },
  { id: 'agents', name: 'AI Agentlar va Avtomatlashtirish', icon: BrainCircuit },
  { id: 'spatial', name: 'Fazoviy Hisoblash (Spatial Computing)', icon: Rocket },
  { id: 'climate', name: 'Iqlim Texnologiyalari', icon: Globe },
  { id: 'health', name: 'Sog\'liqni saqlash (HealthTech)', icon: HeartPulse },
  { id: 'edtech', name: 'Ta\'lim (EdTech)', icon: GraduationCap },
  { id: 'fintech', name: 'Moliya (FinTech)', icon: Coins },
  { id: 'creator', name: 'Kreatorlar Iqtisodiyoti', icon: Video },
];

interface Idea {
  title: string;
  problem: string;
  solution: string;
  trendAlignment: string;
  aiStudioPrompt: string;
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isTriggeringTelegram, setIsTriggeringTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<boolean | null>(null);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if Telegram bot is configured
    fetch('/api/telegram-status')
      .then(res => res.json())
      .then(data => setTelegramStatus(data.configured))
      .catch(() => setTelegramStatus(false));
  }, []);

  const generateIdea = async () => {
    setIsGenerating(true);
    setError(null);
    setIdea(null);
    setCopied(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const categoryName = CATEGORIES.find(c => c.id === activeCategory)?.name || 'Kutilmagan g\'oya';

      const prompt = `Siz 2026-yildagi vizyoner startap asoschisi va texnologiya ekspertisiz.
      Google AI Studio yordamida qurilishi mumkin bo'lgan yuqori innovatsion, hayotiy startap g'oyasi yoki loyiha promptini o'ylab toping.
      G'oya 2026-yilda mavjud bo'lgan eng so'nggi AI imkoniyatlaridan (masalan, ilg'or multimodal fikrlash, real vaqtda audio/video, avtonom agentlar, fazoviy tushunish va h.k.) foydalanishi SHART.
      U kuchli startap salohiyatiga ega bo'lishi yoki 2026-yilning asosiy trendi bo'lishi kerak.
      
      Tanlangan yo'nalish: ${categoryName}
      
      MUHIM QOIDA: 'title', 'problem', 'solution' va 'trendAlignment' maydonlari O'ZBEK TILIDA bo'lishi shart. 
      Lekin 'aiStudioPrompt' maydoni INGLIZ TILIDA bo'lishi shart (chunki u dasturchi uchun AI Studio'ga kiritishga mo'ljallangan).
      
      Batafsil va amaliy javob bering.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Startap yoki loyihaning jozibali nomi (O\'zbek tilida)' },
              problem: { type: Type.STRING, description: 'Hal qilinayotgan asosiy muammo (1-2 gap, O\'zbek tilida)' },
              solution: { type: Type.STRING, description: 'AI yordamida yechim qanday ishlashi (2-3 gap, O\'zbek tilida)' },
              trendAlignment: { type: Type.STRING, description: 'Nima uchun bu 2026-yilda katta imkoniyat ekanligi (O\'zbek tilida)' },
              aiStudioPrompt: { type: Type.STRING, description: 'Dasturchi Google AI Studio-da ushbu g\'oyaning asosiy MVP-sini yaratish uchun foydalanishi mumkin bo\'lgan batafsil, nusxalashga tayyor prompt (INGLIZ TILIDA).' }
            },
            required: ['title', 'problem', 'solution', 'trendAlignment', 'aiStudioPrompt']
          }
        }
      });

      if (response.text) {
        const parsedIdea = JSON.parse(response.text) as Idea;
        setIdea(parsedIdea);
      } else {
        throw new Error("G'oya yaratishda xatolik yuz berdi.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "G'oya yaratishda xatolik yuz berdi.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPrompt = () => {
    if (idea?.aiStudioPrompt) {
      navigator.clipboard.writeText(idea.aiStudioPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadPDF = async () => {
    if (!resultRef.current || !idea) return;
    setIsGeneratingPDF(true);
    try {
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: '#050505',
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${idea.title.replace(/\\s+/g, '_').toLowerCase()}_2026.pdf`);
    } catch (error) {
      console.error('PDF yaratishda xatolik:', error);
      alert('PDF yaratishda xatolik yuz berdi.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const triggerTelegramBot = async () => {
    setIsTriggeringTelegram(true);
    try {
      const response = await fetch('/api/trigger-telegram', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        alert("Telegram bot ishga tushirildi! G'oyalar orqa fonda generatsiya qilinib, botingizga yuboriladi.");
      } else {
        alert("Xatolik: " + (data.error || "Noma'lum xatolik"));
      }
    } catch (error) {
      console.error(error);
      alert("Server bilan bog'lanishda xatolik yuz berdi.");
    } finally {
      setIsTriggeringTelegram(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-semibold tracking-tight text-lg">AI Studio 2026 Vizyoni</h1>
          </div>
          <div className="text-xs font-mono text-white/50 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            v2026.1.0
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">

        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Kelajakni Quramiz.</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              2026-yil texnologik trendlariga asoslangan innovatsion startap g'oyalari va AI Studio promptlarini yarating.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Yo'nalishni Tanlang
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${isActive
                      ? 'bg-white/10 border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                      : 'bg-transparent border-transparent text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : ''}`} />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={generateIdea}
            disabled={isGenerating}
            className="w-full relative group overflow-hidden rounded-xl p-[1px]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70 group-hover:opacity-100 transition-opacity duration-300"></span>
            <div className="relative bg-black px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 group-hover:bg-opacity-0">
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span className="font-semibold text-white">Tahlil qilinmoqda...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-white" />
                  <span className="font-semibold text-white">G'oya Yaratish</span>
                </>
              )}
            </div>
          </button>

          {/* Telegram Bot Section */}
          <div className="mt-8 p-5 rounded-2xl bg-white/[0.02] border border-white/10">
            <h3 className="text-sm font-semibold text-white/80 mb-2 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-400" />
              Telegram Bot (Avtomatlashtirish)
            </h3>
            <p className="text-xs text-white/50 leading-relaxed mb-4">
              Har 3 soatda avtomatik ravishda 5 ta yangi g'oyani Telegram botingizga yuborish uchun AI Studio "Secrets" bo'limida <code>TELEGRAM_BOT_TOKEN</code> va <code>TELEGRAM_CHAT_ID</code> ni sozlang.
            </p>

            {telegramStatus === true ? (
              <button
                onClick={triggerTelegramBot}
                disabled={isTriggeringTelegram}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors text-sm font-medium border border-blue-500/20"
              >
                {isTriggeringTelegram ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Hozir sinab ko'rish (5 ta g'oya)</span>
              </button>
            ) : telegramStatus === false ? (
              <div className="text-xs text-amber-400/80 bg-amber-400/10 p-3 rounded-lg border border-amber-400/20">
                Bot sozlanmagan. Iltimos, muhit o'zgaruvchilarini (environment variables) kiriting.
              </div>
            ) : (
              <div className="text-xs text-white/40 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Holat tekshirilmoqda...
              </div>
            )}
          </div>

        </div>

        {/* Results Area */}
        <div className="lg:col-span-8">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              {error}
            </div>
          )}

          {!idea && !isGenerating && !error && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 border border-white/5 rounded-3xl bg-white/[0.02] border-dashed">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                <Rocket className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white/80">Kutish Rejimi</h3>
              <p className="text-white/40 max-w-sm text-sm">
                Yo'nalishni tanlang va 2026-yil uchun navbatdagi katta startap g'oyangizni kashf etish uchun tugmani bosing.
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 border border-white/5 rounded-3xl bg-white/[0.02]">
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-r-2 border-purple-500 rounded-full animate-spin animation-delay-150"></div>
                <div className="absolute inset-4 border-b-2 border-pink-500 rounded-full animate-spin animation-delay-300"></div>
                <BrainCircuit className="absolute inset-0 m-auto w-6 h-6 text-white/50 animate-pulse" />
              </div>
              <p className="text-white/60 font-mono text-sm animate-pulse">2026-yil bozor trendlari tahlil qilinmoqda...</p>
            </div>
          )}

          {idea && !isGenerating && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

              {/* Action Buttons (Not included in PDF) */}
              <div className="flex justify-end gap-3 mb-2" data-html2canvas-ignore="true">
                <button
                  onClick={downloadPDF}
                  disabled={isGeneratingPDF}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium border border-white/10"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>PDF Saqlash</span>
                </button>
              </div>

              {/* PDF Content Container */}
              <div ref={resultRef} className="space-y-6 p-2 -m-2 bg-[#050505]">
                {/* Title Card */}
                <div className="p-8 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20 transition-transform duration-700 group-hover:scale-150"></div>
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-indigo-300 mb-6">
                      <Sparkles className="w-3 h-3" />
                      2026 Startap Konsepsiyasi
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                      {idea.title}
                    </h2>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
                    <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                      Muammo
                    </h3>
                    <p className="text-white/80 leading-relaxed text-sm">
                      {idea.problem}
                    </p>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
                    <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                      Yechim
                    </h3>
                    <p className="text-white/80 leading-relaxed text-sm">
                      {idea.solution}
                    </p>
                  </div>
                </div>

                {/* Trend Alignment */}
                <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                  <h3 className="text-sm font-semibold text-indigo-300/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Rocket className="w-4 h-4" />
                    Nima uchun 2026-yil?
                  </h3>
                  <p className="text-indigo-100/80 leading-relaxed text-sm">
                    {idea.trendAlignment}
                  </p>
                </div>

                {/* AI Studio Prompt */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-purple-400" />
                      AI Studio uchun Prompt (Ingliz tilida)
                    </h3>
                    <button
                      onClick={copyPrompt}
                      data-html2canvas-ignore="true"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-sm font-medium border border-white/10"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Nusxalandi!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Promptni Nusxalash</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 font-mono text-sm text-white/70 leading-relaxed whitespace-pre-wrap break-words">
                      {idea.aiStudioPrompt}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
