
import { GoogleGenAI } from "@google/genai";
import { Scene, Task, ScriptEpisode, BreakdownResult, I2VConfig } from "../types";

// Ensure API Key is available
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const polishPrompt = async (originalPrompt: string): Promise<string> => {
  if (!apiKey) {
    console.warn("No API Key provided. Returning mock response.");
    return `(Polished) ${originalPrompt}, highly detailed, cinematic lighting, 8k resolution, photorealistic texture.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert prompt engineer for Midjourney and Imagen. Expand this short description into a highly detailed, professional image generation prompt. Focus on lighting, texture, camera lens, and artistic style. Keep it under 100 words.\n\nInput: "${originalPrompt}"`,
    });
    return response.text || originalPrompt;
  } catch (error) {
    console.error("Gemini API Error (Polish):", error);
    return originalPrompt; // Fallback
  }
};

export const generateImageWithImagen = async (prompt: string, aspectRatio: string = '16:9', referenceImage?: string): Promise<string> => {
  if (!apiKey) {
    console.warn("No API Key provided. Returning placeholder.");
    return `https://picsum.photos/seed/${Date.now()}/800/450`;
  }

  try {
    const parts: any[] = [];

    // If reference image exists, add it as inline data (multimodal prompt)
    if (referenceImage) {
        // Expecting data:image/png;base64,... format
        const matches = referenceImage.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
            parts.push({
                inlineData: {
                    mimeType: matches[1],
                    data: matches[2]
                }
            });
            console.log("Added reference image to prompt");
        }
    }

    // Add text prompt
    parts.push({ text: prompt });

    // Switch to gemini-2.5-flash-image for better availability and default compliance
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any, // "16:9", "1:1", etc.
        }
      }
    });

    // Iterate through parts to find the image
    const responseParts = response.candidates?.[0]?.content?.parts;
    if (responseParts) {
        for (const part of responseParts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    
    throw new Error("No image data returned from Gemini");

  } catch (error) {
    console.error("Image Generation Error (Gemini):", error);
    // Graceful fallback to placeholder so the UI doesn't break on Quota Error
    console.warn("Generating mock image due to API failure/Quota.");
    const seed = Math.floor(Math.random() * 10000);
    // Return a distinct placeholder to indicate fallback
    return `https://picsum.photos/seed/${seed}/1024/576?grayscale&blur=1`;
  }
};

// Updated Video Generation Service
export const generateVideoWithVeo = async (prompt: string, config?: I2VConfig): Promise<string> => {
   console.log(`[Veo Video Gen] Mode: ${config?.type}, Prompt: ${prompt}`);
   
   if (config?.type === 'image_to_video') {
       if (config.startFrameImage) console.log("Has Start Frame");
       if (config.endFrameImage) console.log("Has End Frame");
       if (config.referenceImages?.length) console.log(`Has ${config.referenceImages.length} Reference Images`);
   }

   // Mocking Veo response for now as it usually requires time-consuming operation polling
   return new Promise((resolve) => {
     setTimeout(() => {
        // Return a reliable sample video
        // Using a different video for I2V vs T2V to simulate difference
        if (config?.type === 'image_to_video') {
             resolve("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4");
        } else {
             resolve("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
        }
     }, 3000);
   });
}

// New Service: Image-to-Video for Frame Extraction
export const generateVideoFromImage = async (imageUrl: string): Promise<string> => {
    // In a real implementation, this would call Veo (Image-to-Video mode)
    // For now, we return a mock video that is likely to work in browser
    console.log("Generating video from image:", imageUrl);
    return new Promise((resolve) => {
        setTimeout(() => {
             resolve("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4");
        }, 4000);
    });
};

// Function to split a long script into episodes using AI AND extract assets
export const breakdownScriptToEpisodes = async (fullScript: string): Promise<BreakdownResult> => {
    // Mock Response Data for Fallback
    const mockBreakdown: BreakdownResult = {
        episodes: [
            { 
                title: '第一集：开端 (Mock)', 
                content: fullScript.slice(0, Math.min(fullScript.length / 2, 200)) + '...',
                assets: {
                    characters: ['杰克 (Jack)', '神秘杀手'],
                    scenes: ['暗巷', '废弃工厂'],
                    props: ['激光枪']
                }
            },
            { 
                title: '第二集：发展 (Mock)', 
                content: '...',
                assets: {
                    characters: ['杰克 (Jack)', '苏瑶'],
                    scenes: ['屋顶实验室'],
                    props: ['遗嘱', '芯片']
                }
            }
        ]
    };

    if (!apiKey) return mockBreakdown;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                Analyze the following script text.
                Split it into logical Episodes.
                
                IMPORTANT: For EACH episode, you must also extract the key assets (Characters, Scenes, Props) that appear IN THAT SPECIFIC EPISODE.
                
                Return a JSON object with this structure:
                {
                    "episodes": [
                        {
                            "title": "Episode 1: ...", 
                            "content": "...",
                            "assets": {
                                "characters": ["Name1", "Name2"],
                                "scenes": ["Location1"],
                                "props": ["Item1"]
                            }
                        },
                        ...
                    ]
                }

                Script:
                ${fullScript.substring(0, 30000)} // Truncate if too long
            `,
            config: { responseMimeType: 'application/json' }
        });
        
        const text = response.text;
        if (!text) throw new Error("Empty response");
        return JSON.parse(text);
    } catch (error) {
        console.error("Episode Split & Extraction Error:", error);
        // Fallback to mock data so flow isn't blocked
        return mockBreakdown;
    }
};

// Function to analyze script and break it down into scenes and shots
export const analyzeScript = async (scriptText: string): Promise<Scene[]> => {
  const mockScene: Scene = {
        id: 'sc_fallback_01',
        title: '场次1：示例场景 (Fallback)',
        content: '由于API限制，显示示例内容...',
        tasks: [
          {
             id: 's1-fallback',
             title: 'Shot 1: ELS - Fallback Shot',
             status: 'queued',
             script: '镜头描述...',
             assets: { char: null, scene: null, prop: null },
             // Enhanced mock prompt for demonstration
             prompt: 'Cinematic wide shot, cyberpunk alleyway at night, neon rain, reflection on wet pavement, silhouette of a detective, volumetric fog, blue and pink lighting, 8k, photorealistic, Arri Alexa.',
             breakdown: {
                 subject: 'Fallback Subject',
                 composition: 'Wide Shot',
                 lighting: 'Daylight',
                 mood: 'Neutral'
             },
             versions: [],
             duration: '3s',
             actionDescription: 'Static',
             cameraMovement: 'static',
             extractedTags: {
               characters: ['示例角色'],
               scenes: ['示例场景'],
               props: []
             },
             shotNumber: '1A',
             cameraAngle: 'Eye-level',
             sound: 'Ambient rain noise'
          }
        ]
  };

  if (!apiKey) return [mockScene];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are an expert Director of Photography (DP) and AI Prompt Engineer. 
        Analyze the following script text.
        Break it down into Scenes (based on location/time) and Shots (Tasks).
        
        For each shot, you MUST generate a specialized 'prompt' for AI image generation (Midjourney/Stable Diffusion style).
        The 'prompt' must be in English, strictly following this format:
        "[Subject/Character visual description], [Action/Pose], [Environment/Background], [Lighting], [Camera Angle/Shot Type], [Art Style/Vibe], 8k, cinematic, photorealistic"
        
        Return a JSON array of Scene objects with detailed breakdown metadata.
        
        Script:
        ${scriptText}
      `,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    id: { type: "STRING" },
                    title: { type: "STRING" },
                    content: { type: "STRING" },
                    tasks: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                title: { type: "STRING" },
                                script: { type: "STRING" },
                                prompt: { type: "STRING" },
                                duration: { type: "STRING" },
                                breakdown: {
                                    type: "OBJECT",
                                    properties: {
                                        subject: { type: "STRING" },
                                        composition: { type: "STRING" },
                                        lighting: { type: "STRING" },
                                        mood: { type: "STRING" }
                                    }
                                },
                                extractedAssets: {
                                    type: "OBJECT",
                                    properties: {
                                        characters: { type: "ARRAY", items: { type: "STRING" } },
                                        scenes: { type: "ARRAY", items: { type: "STRING" } },
                                        props: { type: "ARRAY", items: { type: "STRING" } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } as any // Cast to avoid strict enum check if needed, or stick to simpler prompt-based JSON if schema causes issues
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response");
    
    const rawScenes = JSON.parse(text);
    
    return rawScenes.map((s: any) => ({
      id: s.id || `sc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: s.title || '未命名场景',
      content: s.content || '',
      tasks: (s.tasks || []).map((t: any, idx: number) => ({
        id: t.id || `t_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title: t.title || 'Shot 1: Unnamed',
        status: 'queued',
        script: t.script || '',
        assets: { char: null, scene: null, prop: null },
        prompt: t.prompt || '',
        breakdown: {
            subject: t.breakdown?.subject || '-',
            composition: t.breakdown?.composition || '-',
            lighting: t.breakdown?.lighting || '-',
            mood: t.breakdown?.mood || '-'
        },
        versions: [],
        referenceImages: [],
        duration: t.duration || '3s',
        actionDescription: t.actionDescription || '',
        cameraMovement: t.cameraMovement || 'static',
        referenceCharacterIds: [],
        extractedTags: {
            characters: t.extractedAssets?.characters || [],
            scenes: t.extractedAssets?.scenes || [],
            props: t.extractedAssets?.props || []
        },
        shotNumber: `${idx + 1}`,
        cameraAngle: 'Eye-level',
        sound: ''
      }))
    }));

  } catch (error) {
    console.error("Script Analysis Error:", error);
    return [mockScene]; 
  }
};

// New helper to generate shots for a single scene if manual split was used
export const analyzeScene = async (sceneContent: string): Promise<Task[]> => {
    if(!apiKey) return [];
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                You are an expert Director of Photography (DP) and AI Prompt Engineer. 
                Break down the following scene script into a list of Camera Shots (Tasks).
                
                For each shot, you MUST generate a specialized 'prompt' for AI image generation (Midjourney/Stable Diffusion style).
                The 'prompt' must be in English, strictly following this format:
                "[Subject/Character visual description], [Action/Pose], [Environment/Background], [Lighting], [Camera Angle/Shot Type], [Art Style/Vibe], 8k, cinematic, photorealistic"
                
                Return JSON array of task objects with title, script, prompt, breakdown, duration.
                
                Scene Content:
                ${sceneContent}
            `,
            config: { responseMimeType: 'application/json' }
        });
        
        const rawTasks = JSON.parse(response.text || '[]');
        return rawTasks.map((t: any, idx: number) => ({
            id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            title: t.title || 'Shot 1: Detail',
            status: 'queued',
            script: t.script || '',
            assets: { char: null, scene: null, prop: null },
            prompt: t.prompt || '',
            breakdown: {
                subject: t.breakdown?.subject || '-',
                composition: t.breakdown?.composition || '-',
                lighting: t.breakdown?.lighting || '-',
                mood: t.breakdown?.mood || '-'
            },
            versions: [],
            referenceImages: [],
            duration: t.duration || '3s',
            actionDescription: t.actionDescription || '',
            cameraMovement: t.cameraMovement || 'static',
            referenceCharacterIds: [],
            extractedTags: {
                characters: t.extractedAssets?.characters || [],
                scenes: t.extractedAssets?.scenes || [],
                props: t.extractedAssets?.props || []
            },
            shotNumber: `${idx + 1}`,
            cameraAngle: 'Eye-level',
            sound: ''
        }));
    } catch (e) {
        console.error("Scene Analysis Error", e);
        // Fallback for scene analysis
        return [{
            id: `t_err_${Date.now()}`,
            title: 'Shot 1: Fallback',
            status: 'queued',
            script: 'Fallback shot due to error',
            assets: { char: null, scene: null, prop: null },
            prompt: 'Cinematic wide shot, cyberpunk city, rain, neon lights, 8k',
            breakdown: {},
            versions: [],
            duration: '3s',
            extractedTags: {},
            shotNumber: '1',
            cameraAngle: 'Eye-level',
            sound: ''
        } as Task];
    }
}
