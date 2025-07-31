
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, GroundingSource, FinancialSymbol, FileCategory, Timeframe, RiskProfile, UploadedFile } from '../types';
import { FileCategories } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// This function now returns the analysis, sources, and the prompt used.
export const getFinancialAnalysis = async (symbol: string, timeframe: Timeframe, riskProfile: RiskProfile, files: UploadedFile[], knowledgeContext: string, timeZone: string): Promise<{ analysis: AnalysisResult; sources: GroundingSource[]; prompt: string; }> => {
  const textFiles = files.filter(f => f.category !== 'تصویر چارت');
  const imageFiles = files.filter(f => f.category === 'تصویر چارت');
  const fileContents = textFiles.map(f => `نام فایل: ${f.name}\nمحتوا:\n${f.content}`).join('\n\n---\n\n');

  const prompt = `
    شما یک متخصص تحلیل تکنیکال و بنیادی در سطح جهانی برای بازارهای مالی (کریپتو، فارکس، بورس) هستید. وظیفه شما ارائه یک تحلیل عمیق و کاربردی برای نماد "${symbol}" در **تایم فریم ${timeframe}** است.

    **پروفایل ریسک کاربر (بسیار مهم):** ${riskProfile}
    شما **باید** تحلیل و استراتژی خود را (شامل اهداف خرید، فروش، حد ضرر، سطح ریسک و استراتژی کلی) با توجه دقیق به این پروفایل ریسک تنظیم کنید.
    - **محافظه‌کار:** تمرکز بر ریسک کمتر، حد ضررهای بزرگتر (برای جلوگیری از نوسانات عادی)، اهداف سود واقع‌بینانه و دارایی‌های با ثبات‌تر. استراتژی باید بیشتر بر حفظ سرمایه تاکید کند.
    - **متعادل:** رویکردی متوازن بین ریسک و بازده. استراتژی باید ترکیبی از فرصت‌های رشد و کنترل ریسک باشد.
    - **تهاجمی:** تمایل به پذیرش ریسک بالاتر برای کسب سود بیشتر. می‌توانید حد ضررهای نزدیک‌تر، اهداف قیمتی بلندپروازانه‌تر و استراتژی‌های معاملاتی سریع‌تر را پیشنهاد دهید.

    **منطقه زمانی کاربر:** ${timeZone}. تمام تاریخ‌ها و زمان‌ها باید بر اساس این منطقه زمانی باشند.

    **منابع اطلاعاتی شما (به ترتیب اولویت):**
    1.  **پایگاه دانش سفارشی (فایل‌های کاربر)**: اطلاعات، استراتژی‌ها و داده‌های زیر که توسط کاربر ارائه شده، بالاترین اولویت را در تحلیل شما دارند و باید به عنوان هسته اصلی استراتژی معاملاتی در نظر گرفته شوند.
    --- START OF CUSTOM KNOWLEDGE BASE ---
    ${fileContents || 'پایگاه دانش سفارشی خالی است.'}
    --- END OF CUSTOM KNOWLEDGE BASE ---

    2.  **تحلیل تصاویر پیوست شده (اختیاری):**
    اگر تصویری از چارت یا تحلیل تکنیکال پیوست شده است، آن را به دقت بررسی کنید. الگوها، خطوط روند، سطوح حمایت و مقاومت و اندیکاتورهای مشخص شده در تصویر را در تحلیل خود لحاظ کرده و درستی یا نادرستی آن‌ها را ارزیابی کنید.

    3.  **پایگاه دانش آموخته شده (Learned Knowledge Base)**: از این دانش ساختاریافته که از تحلیل‌های موفق قبلی استخراج شده، به عنوان یک منبع کلیدی برای شکل دادن به استراتژی فعلی استفاده کنید. این دانش، نسبت به تحلیل‌های پیشین، اولویت بالاتری دارد.
    --- START OF LEARNED KNOWLEDGE BASE ---
    ${knowledgeContext || 'پایگاه دانش آموخته شده خالی است.'}
    --- END OF LEARNED KNOWLEDGE BASE ---

    4.  **جستجوی آنی در وب (Google Search)**: برای دریافت جدیدترین اخبار، قیمت‌ها، احساسات بازار و رویدادهای تاثیرگذار.
    5.  **دانش داخلی و مدل‌های پیش‌بینی**: دانش جامع شما از بازارهای مالی.

    **دستورالعمل اصلی تحلیل:**
    با توجه دقیق به **تمام منابع اطلاعاتی بالا** و با تمرکز بر **تایم فریم ${timeframe}**، وظیفه شما شناسایی موارد زیر و ارائه خروجی در قالب یک آبجکت JSON **معتبر و بدون هیچ متن اضافی** است.

    1.  **داده‌های کندل استیک (Candlestick Data):** **حتما** داده‌های کندل استیک برای تایم فریم **${timeframe}** را برای **۹۰ کندل اخیر** در فیلد \`candlestickData\` قرار دهید. هر آیتم باید شامل تاریخ (date)، قیمت باز شدن (open)، بالاترین قیمت (high)، پایین‌ترین قیمت (low) و قیمت بسته شدن (close) باشد. **فیلد تاریخ باید یک رشته معتبر با فرمت ISO 8601 باشد.**
    2.  **اهداف قیمتی و حد ضرر دقیق (اجباری):** شما **باید** بر اساس تحلیل در تایم فریم **${timeframe}**، **دقیقا سه هدف قیمتی برای خرید (ورود)**، **دقیقا سه هدف برای فروش (خروج/سود)** و **یک حد ضرر (stopLoss) دقیق به صورت عددی** مشخص کنید.
    3.  **امتیاز احساسات بازار (Sentiment Score):** احساسات فعلی بازار را با توجه به نماد و تایم فریم تحلیل کرده و یک امتیاز عددی بین -100 (ترس شدید) و +100 (طمع شدید) در فیلد \`sentimentScore\` قرار دهید. فیلد \`sentiment\` باید معادل متنی آن (مثلا: "طمع") باشد.
    4.  **پیش‌بینی قیمت (Price Prediction):** یک پیش‌بینی برای **۱۰ دوره آینده** (مطابق با تایم فریم ${timeframe}) ارائه دهید و آن را در فیلد \`priceChartData\` قرار دهید. این فیلد فقط باید شامل داده‌های پیش‌بینی شده باشد. **فیلد تاریخ باید یک رشته معتبر با فرمت ISO 8601 باشد.**
    5.  **یادگیری مستمر:** در حین جستجو در وب، به دنبال استراتژی‌های معاملاتی نوین یا تفسیرهای جدید از الگوها که مرتبط با تایم فریم **${timeframe}** هستند، باشید. آموخته‌های کلیدی خود را در فیلد \`learnedInsights\` خلاصه کنید.
    6.  **نکات کلیدی (Key Takeaways):** **حتما** مهم‌ترین نتایج تحلیل را در قالب آرایه‌ای از رشته‌ها (حداکثر 4 مورد) در فیلد \`keyTakeaways\` خلاصه کنید. این موارد باید برای تصمیم‌گیری سریع، بسیار مفید باشند.
    7.  **دیدگاه حرفه‌ای (Pro Tip):** یک نکته یا دیدگاه ویژه و غیرمنتظره به عنوان یک تحلیلگر حرفه‌ای ارائه دهید. این نکته را در فیلد \`proTip\` قرار دهید.

    **ساختار خروجی JSON (بسیار مهم):**
    {
      "symbol": "${symbol}",
      "timeframe": "${timeframe}",
      "trend": "تحلیل کامل روند (کوتاه‌مدت، میان‌مدت، بلندمدت) بر اساس تایم فریم ${timeframe} همراه با قدرت روند.",
      "summary": "یک جمع‌بندی کلی از تحلیل، با تاکید بر استراتژی پیشنهادی.",
      "signal": "خرید قوی | خرید | نگهداری | فروش | فروش قوی",
      "sentiment": "یک کلمه کلیدی برای احساسات بازار (مثلا: طمع شدید، خنثی، ترس)",
      "sentimentScore": 75,
      "newsSummary": "خلاصه‌ای از اخبار تاثیرگذار اخیر که از وب استخراج شده است.",
      "patterns": [
        { "name": "نام الگو", "description": "توضیح تاثیر الگو بر قیمت", "implication": "Bullish" }
      ],
      "indicators": {
        "rsi": { "value": 65, "signal": "Neutral", "description": "RSI در محدوده خنثی است." },
        "macd": { "signal": "Bullish Crossover", "description": "خط MACD خط سیگنال را به سمت بالا قطع کرده است." },
        "bollinger": { "signal": "Price near Upper Band", "description": "قیمت به باند بالایی بولینگر نزدیک شده." }
      },
      "strategy": "شرح کامل استراتژی معاملاتی پیشنهادی شامل نقطه ورود، حد ضرر دقیق و مدیریت پوزیشن.",
      "buyTargets": [120.50, 118.00, 115.75],
      "sellTargets": [135.00, 140.25, 145.00],
      "stopLoss": 112.00,
      "riskRewardRatio": "1:3.2",
      "prediction": "یک پیش‌بینی واقع‌بینانه برای آینده کوتاه‌مدت.",
      "riskLevel": "متوسط",
      "confidence": 85,
      "candlestickData": [
        { "date": "2023-01-01T12:00:00Z", "open": 100, "high": 105, "low": 98, "close": 104 }
      ],
      "priceChartData": [
        { "date": "2023-10-27T12:00:00Z", "price": 125, "type": "predicted" }
      ],
      "learnedInsights": "خلاصه‌ای از استراتژی‌ها یا نکات جدیدی که از وب آموخته‌اید.",
      "keyTakeaways": ["روند صعودی قوی در تایم فریم روزانه مشاهده می‌شود.", "سطح مقاومت کلیدی در قیمت 135.00 قرار دارد."],
      "proTip": "با توجه به افزایش حجم معاملات در نزدیکی حمایت، احتمال یک حرکت انفجاری به سمت بالا وجود دارد."
    }
  `;
  
  const contentParts = [{ text: prompt }];

  for (const imageFile of imageFiles) {
    // imageFile.content is a Data URL like "data:image/png;base64,iVBORw0KGgo..."
    const [meta, base64Data] = imageFile.content.split(',');
    const mimeTypeMatch = meta.match(/:(.*?);/);
    if (!mimeTypeMatch || !base64Data) continue;

    const mimeType = mimeTypeMatch[1];
    contentParts.push({
      inlineData: {
        mimeType,
        data: base64Data,
      }
    } as any); // Use `as any` to satisfy the complex Part type
  }


  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: contentParts },
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    });

    const jsonText = response.text.trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("پاسخ دریافتی از هوش مصنوعی در قالب JSON معتبر نبود.");
    }
    
    const analysis: AnalysisResult = JSON.parse(jsonMatch[0]);
    
    // Ensure critical fields exist and provide fallbacks if not
    if (!analysis.candlestickData || !Array.isArray(analysis.candlestickData)) {
      analysis.candlestickData = [];
    }
     if (!analysis.priceChartData || !Array.isArray(analysis.priceChartData)) {
      analysis.priceChartData = [];
    }
    analysis.timeframe = analysis.timeframe || timeframe;
    analysis.sentiment = analysis.sentiment || 'تحلیل نشده';
    analysis.sentimentScore = analysis.sentimentScore ?? 0;
    analysis.stopLoss = analysis.stopLoss ?? 0;
    analysis.newsSummary = analysis.newsSummary || 'هیچ خبر قابل توجهی یافت نشد.';
    analysis.learnedInsights = analysis.learnedInsights || 'در این تحلیل نکته جدیدی برای یادگیری یافت نشد.';
    analysis.riskRewardRatio = analysis.riskRewardRatio || 'محاسبه نشده';
    analysis.keyTakeaways = analysis.keyTakeaways || [];
    analysis.proTip = analysis.proTip || 'نکته حرفه‌ای خاصی برای این تحلیل یافت نشد.';
    analysis.indicators = analysis.indicators || {
        rsi: { value: 0, signal: 'Neutral', description: 'داده‌ای دریافت نشد.'},
        macd: { signal: 'Neutral', description: 'داده‌ای دریافت نشد.'},
        bollinger: { signal: 'Price near Middle Band', description: 'داده‌ای دریافت نشد.'}
    };
    analysis.patterns = analysis.patterns || [];
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

    return { analysis, sources, prompt };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof SyntaxError) {
        throw new Error("خطا در پردازش پاسخ JSON از سرویس هوش مصنوعی.");
    }
    throw error;
  }
};

export const getSymbolSuggestions = async (query: string): Promise<FinancialSymbol[]> => {
  if (query.length < 2) {
    return [];
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `شما یک API جستجوی نماد مالی هستید. بر اساس عبارت جستجوی کاربر: "${query}"، لیستی از حداکثر 10 نماد مالی مرتبط را پیدا کن. این نمادها می‌توانند از بازارهای رمزارز (Crypto)، فارکس (Forex)، بورس آمریکا (US Stocks) یا بورس ایران (Iran Bourse) باشند. پاسخ باید فقط یک آرایه JSON با ساختار مشخص شده باشد.`,
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: {
                type: Type.STRING,
                description: "نماد تیکر، مثلا BTC-USD یا AAPL یا خودرو"
              },
              name: {
                type: Type.STRING,
                description: "نام کامل شرکت یا دارایی، مثلا Bitcoin / US Dollar یا Apple Inc. یا ایران خودرو"
              },
              market: {
                type: Type.STRING,
                description: "بازاری که نماد به آن تعلق دارد. باید یکی از این مقادیر باشد: 'Crypto', 'Forex', 'US Stocks', 'Iran Bourse'"
              }
            },
            required: ["symbol", "name", "market"]
          }
        }
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        return [];
    }
    const suggestions: FinancialSymbol[] = JSON.parse(jsonText);
    
    return suggestions.filter(s => s && typeof s.symbol === 'string' && typeof s.name === 'string' && typeof s.market === 'string');

  } catch (error) {
    console.error("Error fetching symbol suggestions from Gemini:", error);
    throw error;
  }
};

export const categorizeFileContent = async (content: string): Promise<FileCategory> => {
    const categoriesString = FileCategories.filter(c => c !== 'تصویر چارت').join(', ');
    const contentSnippet = content.substring(0, 500);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a file classifier for a financial analysis app. Based on the following text snippet, classify it into ONE of the following categories: ${categoriesString}. Return ONLY the category name as a plain string. Do not add any extra text or explanation. Snippet: "${contentSnippet}"`,
            config: {
                temperature: 0,
            }
        });
        
        const category = response.text.trim() as FileCategory;

        if (FileCategories.includes(category)) {
            return category;
        }
        
        return 'سایر';
    } catch (error) {
        console.error("Error categorizing file content:", error);
        return 'سایر';
    }
};
