import { GoogleGenAI } from "@google/genai";
import { HairstyleConfig } from "../types";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Analyzes the uploaded image to determine gender, age, and face shape,
 * then returns 18 distinct hairstyle recommendations suitable for that person.
 */
export const analyzeAndRecommendStyles = async (
  base64Image: string
): Promise<HairstyleConfig[]> => {
  const ai = getGeminiClient();
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const prompt = `
    Analyze this image to determine the person's gender, approximate age, and face shape.
    Based on this analysis, generate a list of 18 DISTINCT, different hairstyle recommendations that would look good on this specific person for a professional profile/ID photo.
    
    The hairstyles should vary in length (short, medium, long), texture (straight, wavy, curly), and style (formal, casual, trendy).
    Include 2-3 creative/bold options (e.g., different hair colors like blonde, red, or silver if appropriate, but mostly natural colors).
    
    Return the response as a JSON array of objects with the following structure:
    [
      { "id": 1, "label": "Short Name", "promptDescription": "Detailed visual description of the hairstyle..." },
      ...
    ]
    Do not wrap in markdown code blocks. Just return the JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No analysis received");

    const data = JSON.parse(text);
    
    // Ensure we have 18 items and correct structure
    if (Array.isArray(data)) {
      return data.slice(0, 18).map((item: any, index: number) => ({
        id: index + 1,
        label: item.label || `Style ${index + 1}`,
        promptDescription: item.promptDescription || item.label,
      }));
    }
    
    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Analysis failed:", error);
    // Fallback if analysis fails (Generic set)
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i + 1,
      label: `Style Variation ${i + 1}`,
      promptDescription: "A professional, neat hairstyle suitable for this person",
    }));
  }
};

export const generateHairstyleMutation = async (
  originalImageBase64: string,
  hairDescription: string
): Promise<string> => {
  const ai = getGeminiClient();
  
  const cleanBase64 = originalImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const prompt = `Change the person's hairstyle to: ${hairDescription}. 
  CRITICAL REQUIREMENTS:
  1. KEEP FACIAL FEATURES, IDENTITY, GENDER, AND AGE EXACTLY THE SAME. Do not modify the face.
  2. The output must be a headshot/half-body ID photo style.
  3. Background must be PURE WHITE.
  4. High resolution, photorealistic, clear hair details.
  5. Ensure the hair integrates naturally with the head shape.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          { text: prompt }
        ]
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    
    if (!parts) {
      throw new Error("No content generated");
    }

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in response");
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Failed to generate hairstyle");
  }
};
