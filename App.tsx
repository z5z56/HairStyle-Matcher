import React, { useState, useRef } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultGrid } from './components/ResultGrid';
import { GeneratedImage, HairstyleConfig } from './types';
import { analyzeAndRecommendStyles, generateHairstyleMutation } from './services/gemini';

const App: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const abortControllerRef = useRef<boolean>(false);

  const handleImageSelect = async (base64: string) => {
    if (!base64) {
        setSourceImage(null);
        setGeneratedImages([]);
        return;
    }

    setSourceImage(base64);
    setIsAnalyzing(true);
    abortControllerRef.current = true; // Stop any previous runs if distinct
    
    try {
      // Step 1: Analyze image and get custom styles
      const recommendations: HairstyleConfig[] = await analyzeAndRecommendStyles(base64);
      
      // Step 2: Prepare grid
      const initialItems: GeneratedImage[] = recommendations.map((config) => ({
        id: config.id,
        config,
        imageUrl: null,
        status: 'pending',
      }));
      setGeneratedImages(initialItems);
    } catch (error) {
      console.error("Failed to analyze image", error);
      alert("Could not analyze image style. Please try a clearer photo.");
      setSourceImage(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startGeneration = async () => {
    if (!sourceImage) return;

    setIsProcessing(true);
    abortControllerRef.current = false;

    // Queue system: Process 3 at a time for efficiency
    const CONCURRENCY = 3;
    const itemsToProcess = generatedImages.filter(img => img.status === 'pending' || img.status === 'error');
    
    const updateStatus = (id: number, status: GeneratedImage['status'], imageUrl: string | null = null, msg?: string) => {
      setGeneratedImages(prev => prev.map(item => 
        item.id === id ? { ...item, status, imageUrl, errorMessage: msg } : item
      ));
    };

    for (let i = 0; i < itemsToProcess.length; i += CONCURRENCY) {
      if (abortControllerRef.current) break;

      const batch = itemsToProcess.slice(i, i + CONCURRENCY);
      
      batch.forEach(item => updateStatus(item.id, 'loading'));

      await Promise.all(batch.map(async (item) => {
        try {
          const resultBase64 = await generateHairstyleMutation(sourceImage, item.config.promptDescription);
          if (!abortControllerRef.current) {
            updateStatus(item.id, 'success', resultBase64);
          }
        } catch (error) {
          if (!abortControllerRef.current) {
            updateStatus(item.id, 'error', null, "Generation failed");
          }
        }
      }));
    }

    setIsProcessing(false);
  };

  const downloadImage = (url: string, id: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `hairstyle-variation-${id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                H
             </div>
             <h1 className="text-xl font-bold text-gray-900 tracking-tight">StyleMatch AI</h1>
          </div>
          {sourceImage && (
            <button
              onClick={() => handleImageSelect('')}
              className="text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Start Over
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Intro / Upload Section */}
        {!sourceImage ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-fade-in">
             <div className="text-center space-y-4 max-w-2xl">
                <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
                   Personalized Style Finder
                </h2>
                <p className="text-lg text-gray-600">
                  Upload your photo. Our AI analyzes your face shape and style to recommend and generate 18 tailored hairstyle variations just for you.
                </p>
             </div>
             <ImageUploader onImageSelected={handleImageSelect} />
             
             {/* Features List */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full max-w-4xl">
                {[
                  { title: "Smart Analysis", desc: "Detects gender, age, and face shape automatically." },
                  { title: "Tailored Recommendations", desc: "Generates styles that specifically suit YOU." },
                  { title: "Universal", desc: "Works for men, women, and all ages." }
                ].map((f, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-900">{f.title}</h3>
                    <p className="text-sm text-gray-500 mt-2">{f.desc}</p>
                  </div>
                ))}
             </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar: Source Image & Controls */}
            <div className="w-full lg:w-1/4 flex flex-col gap-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 sticky top-24">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">You</h3>
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative">
                  <img src={sourceImage} alt="Original" className="w-full h-full object-cover" />
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                      <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                      <p className="text-sm font-semibold text-purple-700">Analyzing Face Shape...</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 space-y-3">
                  {!isAnalyzing && !isProcessing && generatedImages.every(i => i.status === 'pending') && (
                     <button
                       onClick={startGeneration}
                       className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 animate-pulse"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                       </svg>
                       Generate Recommendations
                     </button>
                  )}
                  
                  {(isProcessing || isAnalyzing) && (
                    <div className="w-full py-3 px-4 bg-gray-100 text-gray-500 font-medium rounded-lg flex items-center justify-center gap-2 cursor-not-allowed">
                       {isAnalyzing ? (
                         <span>Designing styles...</span>
                       ) : (
                         <>
                           <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                           <span>Generating...</span>
                         </>
                       )}
                    </div>
                  )}

                  {!isProcessing && !isAnalyzing && generatedImages.some(i => i.status === 'success') && (
                    <p className="text-xs text-center text-gray-500">
                      Right click or use the download button on images to save.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Main Area: Grid */}
            <div className="w-full lg:w-3/4">
               <div className="mb-4 flex items-center justify-between">
                 <div>
                   <h2 className="text-xl font-bold text-gray-900">Recommended Styles</h2>
                   {!isAnalyzing && generatedImages.length > 0 && (
                     <p className="text-sm text-gray-500 mt-1">Based on your face shape and features</p>
                   )}
                 </div>
                 <span className="text-sm text-gray-500">
                   {generatedImages.filter(i => i.status === 'success').length} / {generatedImages.length} Ready
                 </span>
               </div>
               
               {isAnalyzing ? (
                 <div className="w-full h-96 flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-gray-300">
                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600 font-medium">Consulting AI stylist...</p>
                    <p className="text-sm text-gray-400 mt-2">Analyzing facial structure and selecting optimal cuts.</p>
                 </div>
               ) : (
                 <ResultGrid items={generatedImages} onDownload={downloadImage} />
               )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
