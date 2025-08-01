import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, GroundingSource, FinancialSymbol, FileCategory, Timeframe, Timezone, RiskProfile, UploadedFile, Strategy, NewsItem, ComparativeAnalysisResult } from '../types';
import { FileCategories } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisResultSchema = {
    type: Type.OBJECT,
    properties: {
        symbol: { type: Type.STRING },
        timeframe: { type: Type.STRING },
        timezone: { type: Type.STRING },
        trend: { type: Type.STRING },
        summary: { type: Type.STRING },
        signal: { type: Type.STRING },
        sentiment: { type: Type.STRING },
        sentimentScore: { type: Type.NUMBER },
        newsSummary: { type: Type.STRING },
        patterns: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    implication: { type: Type.STRING },
                    startDate: { type: Type.STRING, description: "Date in UTC ISO 8601 format" },
                    endDate: { type: Type.STRING, description: "Date in UTC ISO 8601 format" },
                },
            },
        },
        indicators: {
            type: Type.OBJECT,
            properties: {
                rsi: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, signal: { type: Type.STRING }, description: { type: Type.STRING } } },
                macd: { type: Type.OBJECT, properties: { signal: { type: Type.STRING }, description: { type: Type.STRING } } },
                bollinger: { type: Type.OBJECT, properties: { signal: { type: Type.STRING }, description: { type: Type.STRING } } },
            },
        },
        strategy: { type: Type.STRING },
        buyTargets: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        sellTargets: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        stopLoss: { type: Type.NUMBER },
        riskRewardRatio: { type: Type.STRING },
        prediction: { type: Type.STRING },
        riskLevel: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        candlestickData: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING, description: "Date in UTC ISO 8601 format" },
                    open: { type: Type.NUMBER },
                    high: { type: Type.NUMBER },
                    low: { type: Type.NUMBER },
                    close: { type: Type.NUMBER },
                    volume: { type: Type.NUMBER },
                },
            },
        },
        priceChartData: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING, description: "Date in UTC ISO 8601 format" },
                    price: { type: Type.NUMBER },
                    type: { type: Type.STRING },
                },
            },
        },
        learnedInsights: { type: Type.STRING },
        keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
        proTip: { type: Type.STRING },
        astrologyAnalysis: { type: Type.STRING },
    },
};

const comparativeAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        symbolA: { type: Type.STRING },
        symbolB: { type: Type.STRING },
        timeframe: { type: Type.STRING },
        riskProfile: { type: Type.STRING },
        keyMetrics: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    metric: { type: Type.STRING },
                    symbolAValue: { type: Type.STRING },
                    symbolBValue: { type: Type.STRING },
                },
            },
        },
        comparativeSummary: { type: Type.STRING },
        recommendation: { type: Type.STRING },
        proRecommendation: { type: Type.STRING },
        conRecommendation: { type: Type.STRING },
    },
};


export const getFinancialAnalysis = async (symbol: string, timeframe: Timeframe, timezone: Timezone, riskProfile: RiskProfile, strategies: Strategy[], files: UploadedFile[], knowledgeContext: string): Promise<{ analysis: AnalysisResult; sources: GroundingSource[]; prompt: string; }> => {
  const textFiles = files.filter(f => f.category !== 'تصویر چارت');
  const imageFiles = files.filter(f => f.category === 'تصویر چارت');
  const fileContents = textFiles.map(f => `نام فایل: ${f.name}\nمحتوا:\n${f.content}`).join('\n\n---\n\n');
  const strategiesString = strategies.join(', ');

  const systemInstruction = `شما یک متخصص تحلیل تکنیکال و بنیادی در سطح جهانی برای بازارهای مالی (کریپتو، فارکس، بورس) هستید. وظیفه شما ارائه یک تحلیل عمیق، دقیق و کاربردی است. تحلیل شما باید جامع باشد و از تمام منابع اطلاعاتی ارائه شده استفاده کند. پاسخ ها باید کاملا به زبان فارسی باشد. شما باید خروجی را **فقط** در قالب یک آبجکت JSON معتبر و بدون هیچ متن اضافی تولید کنید.`;
  
  const userPrompt = `
    برای نماد "${symbol}" در تایم فریم **${timeframe}** و منطقه زمانی **${timezone}** یک تحلیل کامل ارائه دهید.

    **مهم: منطقه زمانی (Timezone)**
    تمام تحلیل‌ها، تاریخ‌ها و زمان‌ها باید بر اساس منطقه زمانی **${timezone}** باشد. اما برای خروجی JSON، تمام فیلدهای تاریخ باید در فرمت رشته ISO 8601 و در **UTC** باشند (مثال: "2023-10-27T15:00:00Z").

    **پروفایل ریسک کاربر (بسیار مهم):** ${riskProfile}
    تحلیل و استراتژی خود را با توجه دقیق به این پروفایل ریسک تنظیم کنید.

    **استراتژی‌های تحلیلی منتخب کاربر:** ${strategiesString}
    تحلیل خود را بر اساس ترکیبی از تمام استراتژی‌های انتخابی کاربر انجام دهید.

    ${strategies.includes('تحلیل بر اساس آسترولوژی') ? `
    **تحلیل آسترولوژی (تخصصی و گمانه‌پردازانه):**
    - یک بخش جداگانه برای تحلیل آسترولوژی با عنوان "astrologyAnalysis" در نظر بگیرید.
    - این تحلیل باید صرفاً بر اساس مفاهیم آسترولوژی مالی (مثل حرکت سیارات، رویدادهای نجومی مهم و تاثیر آن‌ها بر بازار) باشد.
    - این تحلیل باید به عنوان یک دیدگاه تکمیلی و گمانه‌پردازانه ارائه شود، نه یک واقعیت قطعی.
    - اگر اطلاعات کافی برای این نوع تحلیل ندارید، این فیلد را با یک رشته خالی برگردانید.
    ` : ''}

    ${knowledgeContext ? `
    **دانش قبلی مرتبط با این نماد (برای یادآوری و بهبود تحلیل):**
    این موارد از تحلیل‌های پیشین شما برای همین نماد و تایم فریم استخراج شده‌اند. از آن‌ها برای افزایش دقت و عمق تحلیل فعلی استفاده کنید.
    ${knowledgeContext}
    ` : ''}
    
    **فایل‌های آپلود شده توسط کاربر (در صورت وجود):**
    ${fileContents ? fileContents : 'هیچ فایل متنی آپلود نشده است.'}
    ${imageFiles.length > 0 ? `تعداد ${imageFiles.length} تصویر برای تحلیل آپلود شده است.` : ''}

    **دستورالعمل‌های خروجی JSON:**
    - **candlestickData**: حدود 100 کندل آخر را برای نمودار قیمت فراهم کنید.
    - **priceChartData**: پیش‌بینی قیمت برای 10 کندل آینده را ارائه دهید.
    - **keyTakeaways**: 3 تا 5 نکته کلیدی و مهم تحلیل را لیست کنید.
    - **proTip**: یک توصیه حرفه‌ای و کاربردی مرتبط با شرایط فعلی نماد ارائه دهید.
    - **learnedInsights**: اگر با جستجو در وب به نکته جدید و قابل توجهی (که در دانش قبلی شما نبوده) در مورد این نماد، استراتژی‌ها، یا الگوهای جدید دست یافتید، آن را در این فیلد شرح دهید. در غیر این صورت، آن را با "در این تحلیل نکته جدیدی برای یادگیری یافت نشد." پر کنید.
    - **sentimentScore**: یک عدد بین -100 (ترس شدید) تا +100 (طمع شدید) برگردانید.
    - **confidence**: یک عدد بین 0 تا 100 برای نشان دادن میزان اطمینان خود به این تحلیل ارائه دهید.
    - **astrologyAnalysis**: فقط در صورتی که کاربر این استراتژی را انتخاب کرده باشد، آن را پر کنید.

    تحلیل خود را شروع کنید.`;

  const imageParts = imageFiles.map(file => ({
      inlineData: {
          mimeType: file.type,
          data: file.content.split(',')[1] // remove data:image/jpeg;base64,
      }
  }));

  const parts = [
      { text: userPrompt }, 
      ...imageParts
  ];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisResultSchema,
      tools: [{ googleSearch: {} }]
    },
  });

  const analysis = JSON.parse(response.text) as AnalysisResult;
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  return { analysis, sources, prompt: userPrompt };
};

export const getSymbolSuggestions = async (query: string): Promise<FinancialSymbol[]> => {
    const systemInstruction = `شما یک سرویس پیشنهاددهنده نمادهای مالی هستید. کاربر یک عبارت جستجو ارائه می‌دهد. شما لیستی از نمادهای مالی منطبق را برمی‌گردانید. نتیجه باید یک آرایه JSON معتبر از اشیاء باشد. هیچ متنی به جز آرایه JSON برنگردانید. هر شی باید شامل symbol, name, و market باشد. برای مارکت از این مقادیر استفاده کن: 'Crypto', 'Forex', 'US Stocks', 'Iran Bourse', 'Other'`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        symbol: { type: Type.STRING },
                        name: { type: Type.STRING },
                        market: { type: Type.STRING },
                        popular: { type: Type.BOOLEAN, description: "True if it's a very common symbol" }
                    }
                }
            }
        }
    });

    return JSON.parse(response.text) as FinancialSymbol[];
};

export const categorizeFileContent = async (content: string): Promise<FileCategory> => {
    const systemInstruction = `شما یک سرویس دسته‌بندی فایل هستید. بر اساس محتوای فایل، فقط یکی از دسته‌بندی‌های زیر را به عنوان یک رشته JSON برگردانید: ${JSON.stringify(FileCategories)}. محتوا را تحلیل کرده و مناسب‌ترین دسته‌بندی را انتخاب کنید. برای تصاویر، همیشه 'تصویر چارت' را برگردانید. خروجی شما باید **فقط** رشته JSON نام دسته‌بندی باشد.`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `محتوای فایل:\n\n${content.substring(0, 4000)}`, // Truncate for performance
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: { type: Type.STRING }
        }
    });

    return JSON.parse(response.text) as FileCategory;
};

export const getWhatIfAnalysis = async (scenario: string, originalAnalysis: AnalysisResult): Promise<string> => {
    const systemInstruction = `شما یک تحلیلگر مالی هستید که یک سناریوی "چه می‌شود اگر" را بر اساس یک تحلیل اولیه انجام می‌دهید. پاسخ شما باید مستقیم، به زبان فارسی و متمرکز بر تاثیر سناریوی جدید بر نتایج تحلیل اصلی (مثل سیگنال، اهداف، ریسک) باشد. از ارائه دوباره کل تحلیل خودداری کنید و فقط تغییرات را شرح دهید.`;

    const prompt = `
    تحلیل اصلی:
    ${JSON.stringify(originalAnalysis, null, 2)}

    سناریوی جدید:
    "${scenario}"

    با توجه به تحلیل اصلی، تاثیر این سناریوی جدید را تحلیل کن.
    `;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
        }
    });

    return response.text;
};

export const getLatestFinancialNews = async (): Promise<NewsItem[]> => {
    const prompt = `Using Google Search, find the 5 latest and most important global financial news articles. Return the result as a valid JSON array of objects. Each object must have "title", "summary", "link", and "source" properties. The "link" must be a full, valid URL. Do not include any surrounding text or markdown. Just the JSON array. All text content must be in Persian.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        
        const text = response.text.trim().replace(/^```json\s*|```\s*$/g, '');
        return JSON.parse(text) as NewsItem[];
    } catch (error) {
        console.error("Failed to fetch or parse financial news:", error);
        throw new Error("Could not fetch financial news. The API might have returned an unexpected format.");
    }
};

export const getComparativeAnalysis = async (symbolA: string, symbolB: string, timeframe: Timeframe, riskProfile: RiskProfile): Promise<ComparativeAnalysisResult> => {
    const systemInstruction = `You are an expert financial analyst. Compare two financial symbols side-by-side and provide a clear recommendation based on the user's risk profile. Output must be a valid JSON object only, in Persian.`;
    const prompt = `
        Please perform a comparative analysis of **${symbolA}** versus **${symbolB}**.
        - **Timeframe:** ${timeframe}
        - **Investor Risk Profile:** ${riskProfile}

        **Instructions:**
        1.  **Key Metrics Comparison:** Provide a side-by-side comparison for the following metrics:
            - "روند فعلی" (e.g., "صعودی", "نزولی", "خنثی")
            - "نوسانات" (e.g., "کم", "متوسط", "زیاد")
            - "احساسات بازار" (e.g., "ترس", "خنثی", "طمع")
            - "سطح حمایتی کلیدی"
            - "سطح مقاومتی کلیدی"
        2.  **Comparative Summary:** Write a detailed paragraph summarizing the key differences and similarities in the "comparativeSummary" field.
        3.  **Recommendation:** Based on everything, which asset do you recommend for an investor with this risk profile and why? Put this in the "recommendation" field.
        4.  **Pros and Cons:** Briefly list one major pro in "proRecommendation" and one major con in "conRecommendation" for your recommended asset.

        Generate the response entirely in Persian.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: comparativeAnalysisSchema,
            tools: [{ googleSearch: {} }]
        },
    });

    return JSON.parse(response.text) as ComparativeAnalysisResult;
}
