/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/* tslint:disable */
import {
  ChevronDown,
  Library,
  LoaderCircle,
  Paintbrush,
  PictureInPicture,
  Redo2,
  SendHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

// This function remains useful for parsing potential error messages
function parseError(error: string) {
  try {
    // Attempt to parse the error as a JSON object which the proxy might send
    const errObj = JSON.parse(error);
    return errObj.message || error;
  } catch (e) {
    // If it's not JSON, return the original error string
    const regex = /{"error":(.*)}/gm;
    const m = regex.exec(error);
    try {
      const e = m[1];
      const err = JSON.parse(e);
      return err.message || error;
    } catch (e) {
      return error;
    }
  }
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [multiImages, setMultiImages] = useState<
    {url: string; type: string}[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mode, setMode] = useState<
    'canvas' | 'editor' | 'imageGen' | 'multi-img-edit'
  >('editor');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // State for canvas history
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // When switching to canvas mode, initialize it and its history
  useEffect(() => {
    if (mode === 'canvas' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // If an image already exists from another mode, draw it.
      if (generatedImage) {
        const img = new window.Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Save this as the initial state for this session
          const dataUrl = canvas.toDataURL();
          setHistory([dataUrl]);
          setHistoryIndex(0);
        };
        img.src = generatedImage;
      } else {
        // Otherwise, save the blank state as initial
        const dataUrl = canvas.toDataURL();
        setHistory([dataUrl]);
        setHistoryIndex(0);
      }
    }
  }, [mode, generatedImage]);

  // Load background image when generatedImage changes
  useEffect(() => {
    if (generatedImage && canvasRef.current) {
      const img = new window.Image();
      img.onload = () => {
        backgroundImageRef.current = img;
        drawImageToCanvas();
        if (mode === 'canvas') {
          // A small timeout to let the draw happen before saving
          setTimeout(saveCanvasState, 50);
        }
      };
      img.src = generatedImage;
    }
  }, [generatedImage, mode]);

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  // Initialize canvas with white background
  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // Draw the background image to the canvas
  const drawImageToCanvas = () => {
    if (!canvasRef.current || !backgroundImageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      backgroundImageRef.current,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  };

  // Canvas history functions
  const saveCanvasState = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const restoreCanvasState = (index: number) => {
    if (!canvasRef.current || !history[index]) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dataUrl = history[index];
    const img = new window.Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreCanvasState(newIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreCanvasState(newIndex);
    }
  };

  // Get the correct coordinates based on canvas scaling
  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x:
        (e.nativeEvent.offsetX ||
          e.nativeEvent.touches?.[0]?.clientX - rect.left) * scaleX,
      y:
        (e.nativeEvent.offsetY ||
          e.nativeEvent.touches?.[0]?.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const {x, y} = getCoordinates(e);
    if (e.type === 'touchstart') {
      e.preventDefault();
    }
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    if (e.type === 'touchmove') {
      e.preventDefault();
    }
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const {x, y} = getCoordinates(e);
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveCanvasState();
  };

  const handleClear = () => {
    if (mode === 'canvas' && canvasRef.current) {
      initializeCanvas();
      const dataUrl = canvasRef.current.toDataURL();
      setHistory([dataUrl]);
      setHistoryIndex(0);
    }
    setGeneratedImage(null);
    setMultiImages([]);
    backgroundImageRef.current = null;
    setPrompt('');
  };

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (fileArray.length === 0) return;

    if (mode === 'multi-img-edit') {
      const readers = fileArray.map((file) => {
        return new Promise<{url: string; type: string}>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({url: reader.result as string, type: file.type});
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });
      Promise.all(readers).then((newImages) => {
        setMultiImages((prev) => [...prev, ...newImages]);
      });
    } else {
      const file = fileArray[0];
      const reader = new FileReader();
      reader.onload = () => {
        setGeneratedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-blue-500');
    processFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.add('border-blue-500');
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('border-blue-500');
  };

  const removeImage = (indexToRemove: number) => {
    setMultiImages((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
  };

  // *** MODIFIED FUNCTION ***
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'editor' && !generatedImage) {
        setErrorMessage('Please upload an image to edit.');
        setShowErrorModal(true);
        return;
      }

      if (mode === 'multi-img-edit' && multiImages.length === 0) {
        setErrorMessage('Please upload at least one image to edit.');
        setShowErrorModal(true);
        return;
      }

      const parts: any[] = [];

      // This logic for building the 'parts' array is correct.
      if (mode === 'imageGen') {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 960;
        tempCanvas.height = 540;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.fillStyle = '#FEFEFE';
        tempCtx.fillRect(0, 0, 1, 1);
        const imageB64 = tempCanvas.toDataURL('image/png').split(',')[1];
        parts.push({inlineData: {data: imageB64, mimeType: 'image/png'}});
      } else if (mode === 'canvas') {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const imageB64 = canvas.toDataURL('image/png').split(',')[1];
        parts.push({inlineData: {data: imageB64, mimeType: 'image/png'}});
      } else if (mode === 'editor' && generatedImage) {
        const mimeType = generatedImage.substring(
          generatedImage.indexOf(':') + 1,
          generatedImage.indexOf(';'),
        );
        const imageB64 = generatedImage.split(',')[1];
        parts.push({inlineData: {data: imageB64, mimeType}});
      } else if (mode === 'multi-img-edit') {
        multiImages.forEach((img) => {
          parts.push({
            inlineData: {data: img.url.split(',')[1], mimeType: img.type},
          });
        });
      }

      parts.push({text: prompt});

      // Construct the request body for the Gemini REST API
      const requestBody = {
        contents: [{role: 'USER', parts}],
      };

      // Define the proxy endpoint
      const proxyUrl =
        '/api-proxy/v1beta/models/gemini-2.5-flash-image-preview:generateContent';

      // Use fetch to send the request to your proxy server
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || `HTTP error! status: ${response.status}`,
        );
      }

      const responseData = await response.json();

      // Process the response
      const result = {message: '', imageData: null};

      if (responseData.candidates && responseData.candidates.length > 0) {
        for (const part of responseData.candidates[0].content.parts) {
          if (part.text) {
            result.message = part.text;
          } else if (part.inlineData) {
            result.imageData = part.inlineData.data;
          }
        }
      } else {
        throw new Error('Invalid response structure from API.');
      }

      if (result.imageData) {
        const imageUrl = `data:image/png;base64,${result.imageData}`;
        if (mode === 'multi-img-edit') {
          setGeneratedImage(imageUrl);
          setMultiImages([]);
          setMode('editor');
        } else {
          setGeneratedImage(imageUrl);
        }
      } else {
        setErrorMessage(
          result.message || 'Failed to generate image. Please try again.',
        );
        setShowErrorModal(true);
      }
    } catch (error: any) {
      console.error('Error submitting:', error);
      setErrorMessage(error.message || 'An unexpected error occurred.');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventTouchDefault = (e: TouchEvent) => {
      if (isDrawing) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('touchstart', preventTouchDefault, {
      passive: false,
    });
    canvas.addEventListener('touchmove', preventTouchDefault, {
      passive: false,
    });

    return () => {
      canvas.removeEventListener('touchstart', preventTouchDefault);
      canvas.removeEventListener('touchmove', preventTouchDefault);
    };
  }, [isDrawing]);

  const baseDisplayClass =
    'w-full sm:h-[60vh] h-[40vh] min-h-[320px] bg-white/90 touch-none flex items-center justify-center p-4 transition-colors';

  return (
    <>
      <div className="min-h-screen text-gray-900 flex flex-col justify-start items-center">
        <main className="container mx-auto px-3 sm:px-6 py-5 sm:py-10 pb-32 max-w-5xl w-full">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-2 sm:mb-6 gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-0 leading-tight">
                Nano Banana AIO
              </h1>
              <p className="text-sm sm:text-base text-gray-500 mt-1">
                constructed with the{' '}
                <a
                  className="underline"
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer">
                  gemini api
                </a>{' '}
                by{' '}
                <a
                  className="underline"
                  href="https://huggingface.co/prithivMLmods"
                  target="_blank"
                  rel="noopener noreferrer">
                  prithivsakthi-ur
                </a>
              </p>
            </div>

            <menu className="flex items-center bg-gray-300 rounded-full p-2 shadow-sm self-start sm:self-auto">
              <div className="flex flex-wrap justify-center items-center bg-gray-200/80 rounded-full p-1 mr-2">
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`p-2 sm:px-3 sm:py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                      mode === 'editor' || mode === 'multi-img-edit'
                        ? 'bg-white shadow'
                        : 'text-gray-600 hover:bg-gray-300/50'
                    }`}
                    aria-haspopup="true"
                    aria-expanded={isDropdownOpen}>
                    {mode === 'multi-img-edit' ? (
                      <>
                        <Library className="w-4 h-4" />
                        <span className="hidden sm:inline">Multi-Image</span>
                      </>
                    ) : (
                      <>
                        <PictureInPicture className="w-4 h-4" />
                        <span className="hidden sm:inline">Editor</span>
                      </>
                    )}
                    <ChevronDown className="w-4 h-4 opacity-70" />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute top-full mt-2 w-48 bg-white rounded-lg shadow-xl z-10 border border-gray-200 py-1">
                      <button
                        onClick={() => {
                          setMode('editor');
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 transition-colors ${
                          mode === 'editor'
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        aria-pressed={mode === 'editor'}>
                        <PictureInPicture className="w-4 h-4" />
                        <span>Single Image Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          setMode('multi-img-edit');
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 transition-colors ${
                          mode === 'multi-img-edit'
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        aria-pressed={mode === 'multi-img-edit'}>
                        <Library className="w-4 h-4" />
                        <span>Multi-Image Edit</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setMode('canvas')}
                  className={`p-2 sm:px-3 sm:py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                    mode === 'canvas'
                      ? 'bg-white shadow'
                      : 'text-gray-600 hover:bg-gray-300/50'
                  }`}
                  aria-pressed={mode === 'canvas'}>
                  <Paintbrush className="w-4 h-4" />
                  <span className="hidden sm:inline">Canvas</span>
                </button>
                <button
                  onClick={() => setMode('imageGen')}
                  className={`p-2 sm:px-3 sm:py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                    mode === 'imageGen'
                      ? 'bg-white shadow'
                      : 'text-gray-600 hover:bg-gray-300/50'
                  }`}
                  aria-pressed={mode === 'imageGen'}>
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Image Gen</span>
                </button>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm transition-all hover:bg-gray-50 hover:scale-110">
                <Trash2
                  className="w-5 h-5 text-gray-700"
                  aria-label="Clear Canvas"
                />
              </button>
            </menu>
          </div>

          <div className="w-full mb-6">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              aria-label="Upload image"
              multiple={mode === 'multi-img-edit'}
            />
            {mode === 'canvas' ? (
              <div className="relative w-full">
                <canvas
                  ref={canvasRef}
                  width={960}
                  height={540}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="border-2 border-black w-full sm:h-[60vh] h-[40vh] min-h-[320px] bg-white/90 touch-none"
                  style={{
                    cursor:
                      "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23FF0000\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 5v14M5 12h14\"/></svg>') 12 12, crosshair",
                  }}
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-2 bg-white rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                    aria-label="Undo">
                    <Undo2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 bg-white rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                    aria-label="Redo">
                    <Redo2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : mode === 'editor' ? (
              <div
                className={`${baseDisplayClass} ${
                  generatedImage ? 'border-black' : 'border-gray-400'
                } border-2 border-dashed`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}>
                {generatedImage ? (
                  <img
                    src={generatedImage}
                    alt="Current image"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-center text-gray-500 hover:text-gray-700 p-8 rounded-lg">
                    <h3 className="font-semibold text-lg">Upload Image</h3>
                    <p>Click to upload or drag & drop</p>
                  </button>
                )}
              </div>
            ) : mode === 'multi-img-edit' ? (
              <div
                className={`${baseDisplayClass} ${
                  multiImages.length > 0
                    ? 'border-black items-start'
                    : 'border-gray-400'
                } border-2 border-dashed flex-col`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}>
                {multiImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 overflow-y-auto w-full h-full">
                    {multiImages.map((image, index) => (
                      <div key={index} className="relative group aspect-square">
                        <img
                          src={image.url}
                          alt={`upload preview ${index + 1}`}
                          className="w-full h-full object-cover rounded-md"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Remove image ${index + 1}`}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors aspect-square">
                      + Add more
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-center text-gray-500 hover:text-gray-700 p-8 rounded-lg m-auto">
                    <h3 className="font-semibold text-lg">
                      Upload one or multiple images
                    </h3>
                    <p>Click to upload or drag & drop</p>
                  </button>
                )}
              </div>
            ) : (
              // Image Gen mode display
              <div
                className={`relative ${baseDisplayClass} border-2 ${
                  generatedImage ? 'border-black' : 'border-gray-400'
                }`}>
                {generatedImage ? (
                  <img
                    src={generatedImage}
                    alt="Generated image"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <h3 className="font-semibold text-lg">Image Generation</h3>
                    <p>Enter a prompt below to create an image</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === 'imageGen'
                    ? 'Describe the image you want to create...'
                    : mode === 'multi-img-edit'
                    ? 'Describe how to edit or combine the images...'
                    : 'Add your change...'
                }
                className="w-full p-3 sm:p-4 pr-12 sm:pr-14 text-sm sm:text-base border-2 border-black bg-white text-gray-800 shadow-sm focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-none bg-black text-white hover:cursor-pointer hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                {isLoading ? (
                  <LoaderCircle
                    className="w-5 sm:w-6 h-5 sm:h-6 animate-spin"
                    aria-label="Loading"
                  />
                ) : (
                  <SendHorizontal
                    className="w-5 sm:w-6 h-5 sm:h-6"
                    aria-label="Submit"
                  />
                )}
              </button>
            </div>
          </form>
        </main>
        {/* Error Modal */}
        {showErrorModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-700">
                  Failed to generate
                </h3>
                <button
                  onClick={closeErrorModal}
                  className="text-gray-400 hover:text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="font-medium text-gray-600">
                {parseError(errorMessage)}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}