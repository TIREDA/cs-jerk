
import { GoogleGenAI, Type } from "@google/genai";
import { ReactionAttempt, AICoachFeedback } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getPerformanceAnalysis = async (attempts: ReactionAttempt[]): Promise<AICoachFeedback> => {
  const avgCounterLat = attempts.reduce((acc, curr) => acc + curr.counterLatency, 0) / attempts.length;
  const avgReleaseLat = attempts.reduce((acc, curr) => acc + curr.releaseLatency, 0) / attempts.length;
  const avgTapDur = attempts.reduce((acc, curr) => acc + curr.tapDuration, 0) / attempts.length;
  
  const prompt = `
    请分析该玩家在 CS 急停 (Counter-Strafing) 训练中的表现数据：
    - 平均信号响应至松键延迟: ${avgReleaseLat.toFixed(2)}ms
    - 平均松键至反向敲击延迟 (Snap Latency): ${avgCounterLat.toFixed(2)}ms (理想: < 50ms)
    - 平均反向键敲击时长 (Tap Duration): ${avgTapDur.toFixed(2)}ms (理想: < 100ms，越短越能瞬间锁死)
    - 综合精准度评分: ${attempts.reduce((a, b) => a + b.score, 0) / attempts.length}

    请根据以上数据提供：
    1. 一个竞技段位评价。
    2. 识别其最大的技术短板 (特别关注：反向键是否按得太久导致反向滑步)。
    3. 提供专业的 FPS 肌肉记忆训练建议。
    
    必须使用中文回复。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rating: { type: Type.STRING },
            advice: { type: Type.STRING },
            weakness: { type: Type.STRING }
          },
          required: ["rating", "advice", "weakness"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      rating: "未定级",
      advice: "尝试缩短反向键的敲击时间，想象那是灼热的火，快速点按即离。",
      weakness: "操作流程不完整或延迟波动较大。"
    };
  }
};
