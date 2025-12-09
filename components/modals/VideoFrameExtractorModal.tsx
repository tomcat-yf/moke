
import React, { useState, useEffect, useRef } from 'react';
import { X, Video, Camera, Loader2, Play, Pause } from 'lucide-react';
import { generateVideoFromImage } from '../../services/geminiService';
import toast from 'react-hot-toast';

interface VideoFrameExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (capturedImage: string) => void;
}

export const VideoFrameExtractorModal: React.FC<VideoFrameExtractorModalProps> = ({ 
    isOpen, 
    onClose, 
    imageUrl, 
    onSave 
}) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-start generation when opened
  useEffect(() => {
    if (isOpen && imageUrl) {
      setVideoUrl(null);
      setIsGenerating(true);
      generateVideoFromImage(imageUrl)
        .then(url => {
            setVideoUrl(url);
        })
        .catch(err => {
            console.error(err);
            toast.error("视频生成失败");
            onClose();
        })
        .finally(() => {
            setIsGenerating(false);
        });
    }
  }, [isOpen, imageUrl, onClose]);

  const handleCapture = () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Set canvas size to match video resolution
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
          const base64Image = canvas.toDataURL('image/jpeg', 0.95);
          onSave(base64Image);
          toast.success("已截取帧并添加到版本历史");
          onClose();
      } catch (e) {
          toast.error("截帧失败 (可能受限于跨域策略)");
      }
  };

  const togglePlay = () => {
      if (!videoRef.current) return;
      if (videoRef.current.paused) {
          videoRef.current.play();
          setIsPlaying(true);
      } else {
          videoRef.current.pause();
          setIsPlaying(false);
      }
  };

  const handleTimeUpdate = () => {
      if (videoRef.current) {
          setCurrentTime(videoRef.current.currentTime);
          if (!isNaN(videoRef.current.duration)) {
             setDuration(videoRef.current.duration);
          }
      }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      if (videoRef.current) {
          videoRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
       <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
           
           {/* Header */}
           <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-850">
               <h3 className="text-lg font-bold text-white flex items-center">
                   <Video className="mr-2 text-indigo-500"/> 视频截帧工具
               </h3>
               <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
           </div>

           {/* Content */}
           <div className="p-6 flex-1 flex flex-col items-center justify-center bg-black relative min-h-[400px]">
               {isGenerating ? (
                   <div className="flex flex-col items-center text-gray-400">
                       <Loader2 size={48} className="animate-spin mb-4 text-indigo-500" />
                       <p className="text-sm font-medium">正在基于当前图片生成视频...</p>
                       <p className="text-xs mt-2 opacity-50">这可能需要几秒钟</p>
                   </div>
               ) : videoUrl ? (
                   <div className="w-full h-full flex flex-col">
                       {/* Video Player */}
                       <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                           <video 
                               ref={videoRef}
                               src={videoUrl}
                               className="max-h-[50vh] max-w-full rounded shadow-lg"
                               onTimeUpdate={handleTimeUpdate}
                               onEnded={() => setIsPlaying(false)}
                               crossOrigin="anonymous" // Important for canvas capture
                           />
                       </div>

                       {/* Controls */}
                       <div className="mt-6 w-full bg-gray-800 p-4 rounded-lg border border-gray-700">
                           <div className="flex items-center space-x-4 mb-2">
                               <button 
                                  onClick={togglePlay}
                                  className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                               >
                                   {isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor" className="ml-1"/>}
                               </button>
                               <input 
                                   type="range" 
                                   min={0} 
                                   max={duration || 100} 
                                   step={0.1}
                                   value={currentTime}
                                   onChange={handleSeek}
                                   className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                               />
                               <span className="text-xs text-gray-400 font-mono w-16 text-right">
                                   {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                               </span>
                           </div>
                           
                           <div className="flex justify-between items-center mt-4 border-t border-gray-700 pt-4">
                               <p className="text-xs text-gray-500">
                                   <span className="text-indigo-400 font-bold mr-1">提示:</span> 
                                   拖动进度条选择最完美的瞬间
                               </p>
                               <button 
                                   onClick={handleCapture}
                                   className="px-6 py-2 bg-white text-black hover:bg-gray-200 rounded-full font-bold text-sm shadow-lg flex items-center transition-transform hover:scale-105"
                               >
                                   <Camera size={18} className="mr-2" /> 截取当前帧
                               </button>
                           </div>
                       </div>
                   </div>
               ) : (
                   <div className="text-red-500">加载失败</div>
               )}
           </div>
           
           {/* Hidden Canvas for Capture */}
           <canvas ref={canvasRef} className="hidden"></canvas>
       </div>
    </div>
  );
};
