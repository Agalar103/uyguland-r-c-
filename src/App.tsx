/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { Sparkles, Brain, Zap, Rocket, ChevronRight, Play, Cpu, Globe, MessageSquare, Copy, Check, Settings, X, Palette, BookOpen, Layers, CreditCard, Star, Mic, Volume2, Send, Trophy, RefreshCw, Home, Image as ImageIcon, Paperclip } from "lucide-react";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

type Theme = 'default' | 'punk' | 'fragpunk' | 'modern' | 'philosophical';

// Sound effect helper
const playSound = (type: 'click' | 'hover' | 'success' | 'error') => {
  const sounds = {
    click: 'https://www.soundjay.com/buttons/sounds/button-16.mp3',
    hover: 'https://www.soundjay.com/buttons/sounds/button-20.mp3',
    success: 'https://www.soundjay.com/buttons/sounds/button-3.mp3',
    error: 'https://www.soundjay.com/buttons/sounds/button-10.mp3'
  };
  const audio = new Audio(sounds[type]);
  audio.volume = 0.15;
  audio.play().catch(() => {}); 
};

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const FadeInView = ({ children, delay = 0, className = "" }: FadeInViewProps) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    className={className}
  >
    {children}
  </motion.div>
);

type View = 'home' | 'study' | 'quiz' | 'battle-royale' | 'pdf-library';

interface Book {
  id: string;
  title: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}

interface PdfBook {
  title: string;
  subject: string;
  url: string;
  thumbnail: string;
}

const pdfBooks: PdfBook[] = [
  { title: '8. Sınıf Matematik Ders Kitabı', subject: 'Matematik', url: 'http://aokul.gov.tr/Kitaplar/Kitaplar.aspx?type=2', thumbnail: 'https://picsum.photos/seed/math/200/300' },
  { title: '8. Sınıf Fen Bilimleri Ders Kitabı', subject: 'Fen Bilimleri', url: 'http://aokul.gov.tr/Kitaplar/Kitaplar.aspx?type=2', thumbnail: 'https://picsum.photos/seed/science/200/300' },
  { title: '8. Sınıf Türkçe Ders Kitabı', subject: 'Türkçe', url: 'http://aokul.gov.tr/Kitaplar/Kitaplar.aspx?type=2', thumbnail: 'https://picsum.photos/seed/turkish/200/300' },
  { title: '8. Sınıf İnkılap Tarihi Ders Kitabı', subject: 'İnkılap Tarihi', url: 'http://aokul.gov.tr/Kitaplar/Kitaplar.aspx?type=2', thumbnail: 'https://picsum.photos/seed/history/200/300' },
  { title: '8. Sınıf İngilizce Ders Kitabı', subject: 'İngilizce', url: 'http://aokul.gov.tr/Kitaplar/Kitaplar.aspx?type=2', thumbnail: 'https://picsum.photos/seed/english/200/300' },
  { title: '8. Sınıf Din Kültürü Ders Kitabı', subject: 'Din Kültürü', url: 'http://aokul.gov.tr/Kitaplar/Kitaplar.aspx?type=2', thumbnail: 'https://picsum.photos/seed/religion/200/300' },
];

interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string;
  video?: string;
  options?: string[];
  correctAnswer?: string;
  closeAnswer?: string;
  type?: 'text' | 'quiz' | 'image' | 'video';
}

const books: Book[] = [
  { id: 'matematik', title: 'Matematik', color: 'from-blue-500 to-indigo-600', icon: <Layers />, description: 'Çarpanlar, Katlar, Üslü İfadeler ve daha fazlası.' },
  { id: 'fen', title: 'Fen Bilimleri', color: 'from-emerald-500 to-teal-600', icon: <Cpu />, description: 'DNA, Genetik Kod, Mevsimler ve İklim.' },
  { id: 'turkce', title: 'Türkçe', color: 'from-orange-500 to-red-600', icon: <BookOpen />, description: 'Fiilimsiler, Cümle Ögeleri ve Paragraf.' },
  { id: 'inkilap', title: 'İnkılap Tarihi', color: 'from-red-500 to-amber-600', icon: <Star />, description: 'T.C. İnkılâp Tarihi ve Atatürkçülük.' },
  { id: 'ingilizce', title: 'İngilizce', color: 'from-violet-500 to-purple-600', icon: <Globe />, description: 'Yabancı Dil (İngilizce) Kelime ve Dil Bilgisi.' },
  { id: 'biyoloji', title: 'Biyoloji', color: 'from-green-500 to-emerald-600', icon: <Brain />, description: 'Canlılar ve Yaşam, Hücre ve Kalıtım.' },
  { id: 'tarih', title: 'Tarih', color: 'from-stone-500 to-neutral-600', icon: <Layers />, description: 'Dünya ve Türk Tarihi Kronolojisi.' },
];

export default function App() {
  const [view, setView] = useState<View>('home');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<Message[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [answerStatus, setAnswerStatus] = useState<{[key: number]: 'correct' | 'incorrect' | 'close' | null}>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [voiceType, setVoiceType] = useState<'male' | 'female'>('female');

  const [isScrolled, setIsScrolled] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<Theme>('default');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleAiGenerate = async () => {
    if (!aiInput.trim()) return;
    setIsGenerating(true);
    playSound('click');
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Kullanıcı şu konuda bir eğitim özeti veya çalışma planı istiyor: "${aiInput}". 
        Lütfen uyguluyo.com markasına uygun, enerjik, profesyonel ve ortaokul/lise seviyesinde bir yanıt üret. 
        Yanıtın sonunda bir motivasyon cümlesi olsun.`
      });
      setAiResponse(response.text || "");
      playSound('success');
    } catch (error) {
      console.error(error);
      setAiResponse("Üzgünüm, şu an yanıt üretemiyorum. Lütfen tekrar deneyin.");
      playSound('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    
    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const filteredVoices = voices.filter(v => v.lang.includes('tr'));
    
    if (voiceType === 'female') {
      // Usually female voices have "Google" or "Microsoft" names that are female-coded or just the default
      utterance.voice = filteredVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira')) || filteredVoices[0];
    } else {
      utterance.voice = filteredVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('tolga')) || filteredVoices[0];
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tarayıcınız ses tanımayı desteklemiyor.");
      return;
    }
    
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'tr-TR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        playSound('click');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        playSound('error');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setAiInput(transcript);
          handleStudyMessage(transcript);
        }
      };

      recognition.start();
    } catch (error) {
      console.error("Speech recognition start error:", error);
      setIsListening(false);
    }
  };

  const handleStudyMessage = async (text: string, image?: string) => {
    if ((!text.trim() && !image) || !selectedBook) return;
    
    const userMsg: Message = { role: 'user', text, image };
    setChatMessages(prev => [...prev, userMsg]);
    setAiInput("");
    setSelectedImage(null);
    setIsGenerating(true);
    playSound('click');

    try {
      // Handle /resim command
      if (text.startsWith('/resim ')) {
        const prompt = text.replace('/resim ', '');
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: [{ parts: [{ text: `${prompt}, educational illustration for 8th grade students, clean, professional style, clear labels` }] }],
          config: { 
            imageConfig: { 
              aspectRatio: "1:1"
            } 
          }
        });

        let imageUrl = "";
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }

        if (imageUrl) {
          // Get AI to describe the image using the standard model
          const descriptionResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: 'user', parts: [
              { text: `Aşağıdaki görseli bir 8. sınıf öğrencisine açıkla ve konuyu derinlemesine anlat. Görsel konusu: ${prompt}` },
              { inlineData: { data: imageUrl.split(',')[1], mimeType: "image/png" } }
            ]}]
          });

          setChatMessages(prev => [...prev, { 
            role: 'model', 
            text: descriptionResponse.text || `İşte senin için hazırladığım "${prompt}" görseli:`, 
            image: imageUrl,
            type: 'image'
          }]);
          playSound('success');
        } else {
          throw new Error("Görsel oluşturulamadı.");
        }
        return;
      }

      // Handle /video command
      if (text.startsWith('/video ')) {
        const prompt = text.replace('/video ', '');
        
        let operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: `${prompt}, educational animation, high quality, 8th grade level`,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
          }
        });

        // Poll for completion
        while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          operation = await ai.operations.getVideosOperation({operation: operation});
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
          const videoUrl = `${downloadLink}&key=${process.env.GEMINI_API_KEY}`;
          
          setChatMessages(prev => [...prev, { 
            role: 'model', 
            text: `İşte senin için hazırladığım "${prompt}" videosu:`, 
            video: videoUrl,
            type: 'video'
          }]);
          playSound('success');
        } else {
          throw new Error("Video oluşturulamadı.");
        }
        return;
      }

      const parts: any[] = [{ text: `Sen bir 8. sınıf ${selectedBook.title} öğretmenisin. Öğrencinin şu sorusuna veya mesajına yanıt ver: "${text}". 
      
      TALİMATLAR:
      1. DERİN ARAŞTIRMA VE ANALİZ: Konuyu derinlemesine incele, sadece yüzeysel bilgi verme. Akademik, güncel ve bilimsel verileri kullan. Görsel gönderildiyse görseli çok detaylı analiz et.
      2. DETAYLI VE NET CEVAP: Yanıtların açıklayıcı, mantıksal temellere dayanan ve öğrencinin konuyu tam kavramasını sağlayacak detayda olsun. Karmaşık konuları basitleştirerek ama derinliğini koruyarak anlat.
      3. MOTİVASYON: Öğrenciyi her zaman teşvik et ve merakını canlı tut.
      
      Eğer öğrenci "beni sına", "soru sor" derse veya "Soru Oluştur" butonuna basarsa (mesajda bu yönde bir talep varsa), ona 4 şıklı (A, B, C, D) bir çoktan seçmeli soru sor. 
      ÖNEMLİ: Sorular "LGS Yeni Nesil" tarzında olsun. Bilgi, mantık, tablo/grafik yorumlama içersin. 
      Soruyu şu formatta sor: "SORU: [Soru metni] A) [Seçenek] B) [Seçenek] C) [Seçenek] D) [Seçenek] CEVAP: [Doğru Şık] YAKIN: [Doğruya en yakın, en güçlü çeldirici şık]"` }];
      
      if (image) {
        parts.push({
          inlineData: {
            data: image.split(',')[1],
            mimeType: "image/png"
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts }],
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const aiText = response.text || "";
      let modelMsg: Message = { role: 'model', text: aiText };

      // Parse for quiz format if AI generated a question
      if (aiText.includes("SORU:") && aiText.includes("A)")) {
        const questionPart = aiText.split("SORU:")[1].split("A)")[0].trim();
        const options = ["A", "B", "C", "D"].map(opt => {
          const regex = new RegExp(`${opt}\\)\\s*(.*?)(?=\\s*[B-D]\\)|\\s*CEVAP:|\\s*YAKIN:|$)`, 's');
          const match = aiText.match(regex);
          return match ? `${opt}) ${match[1].trim()}` : "";
        });
        const answerMatch = aiText.match(/CEVAP:\s*([A-D])/);
        const closeMatch = aiText.match(/YAKIN:\s*([A-D])/);
        modelMsg = {
          role: 'model',
          text: questionPart,
          options: options.filter(o => o !== ""),
          correctAnswer: answerMatch ? answerMatch[1] : undefined,
          closeAnswer: closeMatch ? closeMatch[1] : undefined,
          type: 'quiz'
        };
      }

      setChatMessages(prev => [...prev, modelMsg]);
      playSound('success');
    } catch (error) {
      console.error(error);
      playSound('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        playSound('click');
      };
      reader.readAsDataURL(file);
    }
  };

  const startQuiz = async (isBattleRoyale = false) => {
    setView(isBattleRoyale ? 'battle-royale' : 'quiz');
    setQuizFinished(false);
    setQuizScore(0);
    setCurrentQuizIndex(0);
    setAnswerStatus({});
    setSelectedAnswer(null);
    setIsGenerating(true);
    playSound('click');

    const questionCount = isBattleRoyale ? 100 : 5;
    const subjects = books.map(b => b.title).join(", ");

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `8. sınıf ${subjects} konularından karışık ${questionCount} adet çoktan seçmeli soru hazırla. 
        Sorular "Yeni Nesil LGS" tarzında, uzun metinli, mantık ve muhakeme gerektiren, günlük hayatla ilişkilendirilmiş sorular olmalı.
        Her soru için şu formatı kullan: 
        SORU: [Soru metni] 
        A) [Seçenek] 
        B) [Seçenek] 
        C) [Seçenek] 
        D) [Seçenek] 
        CEVAP: [Doğru Şık]
        YAKIN: [Doğruya en yakın olan, en güçlü çeldirici yanlış şıkkı belirt]
        Sorular arasına "---" koy.`
      });

      const raw = response.text || "";
      const questionBlocks = raw.split("---");
      const parsedQuestions: Message[] = questionBlocks.map(block => {
        const questionPart = block.split("SORU:")[1]?.split("A)")[0]?.trim() || "Soru yüklenemedi.";
        const options = ["A", "B", "C", "D"].map(opt => {
          const regex = new RegExp(`${opt}\\)\\s*(.*?)(?=\\s*[B-D]\\)|\\s*CEVAP:|\\s*YAKIN:|$)`, 's');
          const match = block.match(regex);
          return match ? `${opt}) ${match[1].trim()}` : "";
        });
        const answerMatch = block.match(/CEVAP:\s*([A-D])/);
        const closeMatch = block.match(/YAKIN:\s*([A-D])/);
        
        return {
          role: 'model' as const,
          text: questionPart,
          options: options.filter(o => o !== ""),
          correctAnswer: answerMatch ? answerMatch[1] : undefined,
          closeAnswer: closeMatch ? closeMatch[1] : undefined,
          type: 'quiz' as const
        };
      }).filter(q => q.options && q.options.length > 0);

      setQuizQuestions(parsedQuestions);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuizAnswer = (answer: string) => {
    if (selectedAnswer) return; // Prevent multiple clicks
    
    setSelectedAnswer(answer);
    const currentQ = quizQuestions[currentQuizIndex] as any;
    let status: 'correct' | 'incorrect' | 'close' = 'incorrect';

    if (answer === currentQ.correctAnswer) {
      setQuizScore(prev => prev + (100 / quizQuestions.length));
      status = 'correct';
      playSound('success');
    } else if (answer === currentQ.closeAnswer) {
      setQuizScore(prev => prev + (50 / quizQuestions.length)); // Half points for close answer?
      status = 'close';
      playSound('hover');
    } else {
      status = 'incorrect';
      playSound('error');
    }

    setAnswerStatus(prev => ({ ...prev, [currentQuizIndex]: status }));

    setTimeout(() => {
      setSelectedAnswer(null);
      if (currentQuizIndex < quizQuestions.length - 1) {
        setCurrentQuizIndex(prev => prev + 1);
      } else {
        setQuizFinished(true);
      }
    }, 1500);
  };

  const themes: { id: Theme; name: string; color: string }[] = [
    { id: 'default', name: 'Şuanki Tema', color: 'bg-violet-600' },
    { id: 'punk', name: 'Punk Tema', color: 'bg-pink-600' },
    { id: 'fragpunk', name: 'FragPunk (Special)', color: 'bg-red-600' },
    { id: 'modern', name: 'Modern Tema', color: 'bg-zinc-900' },
    { id: 'philosophical', name: 'Felsefi Tema', color: 'bg-stone-600' },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      playSound('click');
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen transition-colors duration-500 selection:bg-violet-500/30 font-sans">
      <div className="atmosphere" />
      
      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${isScrolled ? 'py-4 bg-black/50 backdrop-blur-xl border-b border-white/5' : 'py-8 bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold tracking-tighter flex items-center gap-2 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Brain size={18} className="text-white" />
            </div>
            <span className="text-inherit">uyguluyo</span><span className="text-violet-500">.com</span>
          </motion.div>
          
          <div className="hidden md:flex gap-10 text-sm font-medium text-violet-200/50">
            {[
              { name: 'Yapay Zeka', id: 'yapay-zeka' },
              { name: 'Dersler', id: 'egitimler' },
              { name: 'PDF Kitaplar', id: 'pdf-library' },
              { name: 'Kütüphane', id: 'kutuphane' },
            ].map((item) => (
              <button 
                key={item.id} 
                onClick={() => { 
                  if (item.id === 'pdf-library') {
                    setView('pdf-library');
                  } else {
                    setView('home'); 
                    setTimeout(() => scrollToSection(item.id), 100); 
                  }
                }}
                onMouseEnter={() => playSound('hover')}
                className="hover:text-violet-400 transition-colors relative group"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-violet-500 transition-all group-hover:w-full" />
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onMouseEnter={() => playSound('hover')}
              onClick={() => { playSound('click'); startQuiz(true); }}
              className="px-6 py-2.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-600/30 transition-all"
            >
              Battle Royale
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onMouseEnter={() => playSound('hover')}
              onClick={() => { playSound('click'); startQuiz(); }}
              className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition-all"
            >
              Kendini Test Et
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onMouseEnter={() => playSound('hover')}
              onClick={() => { playSound('click'); scrollToSection('egitimler'); }}
              className="px-6 py-2.5 rounded-full bg-violet-600 text-white text-sm font-bold hover:shadow-xl hover:shadow-violet-500/20 transition-all"
            >
              Hemen Başla
            </motion.button>
          </div>
        </div>
      </nav>

      {view === 'home' && (
        <>
          {/* Hero Section */}
          <section className="relative h-screen flex flex-col items-center justify-center text-center px-6 pt-20">
            <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-widest mb-8"
              >
                <Sparkles size={14} />
                Eğitimin Geleceği Burada
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="text-7xl md:text-9xl font-bold tracking-tighter leading-[0.85] mb-10 text-glow"
              >
                Öğrenmek Hiç<br />
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                  Bu Kadar Akıcı
                </span><br />
                Olmamıştı.
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 1 }}
                className="text-xl md:text-2xl text-violet-200/40 max-w-3xl mx-auto font-light leading-relaxed mb-12"
              >
                uyguluyo.com, yapay zeka ile kişiselleştirilmiş, pürüzsüz animasyonlarla desteklenmiş ve tamamen senin hızına odaklanmış bir öğrenme platformudur.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-5 justify-center"
              >
                <button 
                  onMouseEnter={() => playSound('hover')}
                  onClick={() => { playSound('click'); scrollToSection('egitimler'); }}
                  className="group px-10 py-5 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-violet-900/40 transition-all flex items-center gap-3"
                >
                  Ders Başla
                  <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onMouseEnter={() => playSound('hover')}
                  onClick={() => { playSound('click'); startQuiz(true); }}
                  className="px-10 py-5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-red-900/40 transition-all flex items-center gap-3"
                >
                  <Zap size={20} />
                  Battle Royale (100 Soru)
                </button>
                <button 
                  onMouseEnter={() => playSound('hover')}
                  onClick={() => { playSound('click'); startQuiz(); }}
                  className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-inherit rounded-2xl font-bold text-lg transition-all flex items-center gap-3"
                >
                  <Trophy size={20} />
                  Kendini Test Et
                </button>
              </motion.div>
            </motion.div>

            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>
          </section>

          {/* Yapay Zeka Section */}
          <section id="yapay-zeka" className="py-32 px-6 relative z-10">
            <div className="max-w-5xl mx-auto">
              <FadeInView>
                <div className="text-center mb-16">
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">AI ile Anında Öğren.</h2>
                  <p className="text-violet-200/40 text-lg max-w-2xl mx-auto">
                    Herhangi bir konuyu sor, uyguluyo AI senin için en temiz özeti ve çalışma planını hazırlasın.
                  </p>
                </div>
              </FadeInView>

              <FadeInView delay={0.2}>
                <div className="glass-card p-2 md:p-4 shadow-2xl shadow-black/50">
                  <div className="flex flex-col md:flex-row gap-4">
                    <input 
                      type="text" 
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                      placeholder="Hangi konuyu öğrenmek istersin? (Örn: Fotosentez, Kuantum Fiziği...)"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-white/20 text-inherit"
                    />
                    <button 
                      onClick={handleAiGenerate}
                      disabled={isGenerating}
                      onMouseEnter={() => playSound('hover')}
                      className="px-8 py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-white"
                    >
                      {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap size={20} />}
                      Oluştur
                    </button>
                  </div>

                  <AnimatePresence>
                    {aiResponse && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-6 overflow-hidden"
                      >
                        <div className="p-8 bg-black/40 rounded-xl border border-white/5 relative group">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(aiResponse);
                              setCopied(true);
                              playSound('success');
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-violet-300 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                          </button>
                          <div className="flex items-center gap-3 mb-6 text-violet-400">
                            <MessageSquare size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Yapay Zeka Yanıtı</span>
                          </div>
                          <div className="prose prose-invert max-w-none">
                            <p className="text-xl text-violet-50 font-serif italic leading-relaxed whitespace-pre-wrap">
                              {aiResponse}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeInView>
            </div>
          </section>

          {/* Eğitimler Section - 8. Sınıf Kitapları */}
          <section id="egitimler" className="py-32 px-6 bg-white/[0.02]">
            <div className="max-w-7xl mx-auto">
              <FadeInView>
                <div className="text-center mb-16">
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">8. Sınıf Kitapları</h2>
                  <p className="text-violet-200/40 text-lg max-w-2xl mx-auto">
                    Dersini seç, yapay zeka eğitmeninle çalışmaya başla.
                  </p>
                </div>
              </FadeInView>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {books.map((book, idx) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    onMouseEnter={() => playSound('hover')}
                    onClick={() => {
                      playSound('click');
                      setSelectedBook(book);
                      setView('study');
                      setChatMessages([{ role: 'model', text: `Merhaba! Ben senin ${book.title} öğretmeninim. Bugün ne öğrenmek istersin? İstersen bana soru sorabilirsin, istersen de "beni sına" diyerek benden soru isteyebilirsin.` }]);
                    }}
                    className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all group cursor-pointer relative overflow-hidden"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${book.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      {book.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{book.title}</h3>
                    <p className="text-violet-200/40 text-sm leading-relaxed">{book.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Kütüphane Section */}
          <section id="kutuphane" className="py-32 px-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row items-center gap-16">
                <FadeInView className="flex-1">
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8">Dev Kütüphane.</h2>
                  <p className="text-xl text-violet-200/40 mb-10 leading-relaxed">
                    Binlerce kitap, makale ve video içerik parmaklarının ucunda. İstediğin zaman, istediğin yerden eriş.
                  </p>
                  <ul className="space-y-4">
                    {['5000+ Video Ders', 'İnteraktif Testler', 'PDF Kaynaklar', 'Canlı Destek'].map((text, i) => (
                      <li key={i} className="flex items-center gap-3 text-violet-200/60">
                        <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                          <Check size={12} />
                        </div>
                        {text}
                      </li>
                    ))}
                  </ul>
                </FadeInView>
                <FadeInView delay={0.2} className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-0 bg-violet-500/20 blur-[100px] rounded-full" />
                    <div className="glass-card p-8 relative aspect-square flex items-center justify-center">
                      <BookOpen size={120} className="text-violet-500 animate-float" />
                    </div>
                  </div>
                </FadeInView>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Study View */}
      {view === 'study' && selectedBook && (
        <section className="pt-32 pb-20 px-6 min-h-screen flex flex-col">
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col glass-card overflow-hidden shadow-2xl">
            {/* Chat Header */}
            <div className={`p-6 bg-gradient-to-r ${selectedBook.color} flex justify-between items-center`}>
              <div className="flex items-center gap-4">
                <button onClick={() => setView('home')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <Home size={20} className="text-white" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedBook.title} Çalışma Odası</h2>
                  <p className="text-white/60 text-xs">Yapay Zeka Eğitmeni Çevrimiçi</p>
                </div>
              </div>
              <button onClick={() => setView('home')} className="text-white/60 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/20">
              {chatMessages.map((msg, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-4 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-violet-600 text-white rounded-tr-none' 
                      : 'bg-white/5 border border-white/10 text-inherit rounded-tl-none'
                  }`}>
                    {msg.image && (
                      <div 
                        className="mb-3 rounded-lg overflow-hidden border border-white/10 cursor-zoom-in"
                        onClick={() => setFullScreenImage(msg.image || null)}
                      >
                        <img src={msg.image} alt="Uploaded" className="max-w-full h-auto hover:scale-105 transition-transform duration-300" />
                      </div>
                    )}
                    {msg.video && (
                      <div className="mb-3 rounded-lg overflow-hidden border border-white/10 bg-black">
                        <video 
                          src={msg.video} 
                          controls 
                          className="w-full aspect-video"
                          poster="https://picsum.photos/seed/video/800/450"
                        />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    
                    {msg.options && (
                      <div className="mt-4 grid grid-cols-1 gap-2">
                        {msg.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleStudyMessage(opt)}
                            className="p-3 text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-sm"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {msg.role === 'model' && (
                      <button 
                        onClick={() => speak(msg.text)}
                        className="mt-3 p-2 hover:bg-white/10 rounded-lg transition-colors text-violet-400"
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-6 bg-white/5 border-t border-white/10">
              {selectedImage && (
                <div className="mb-4 relative inline-block">
                  <img src={selectedImage} alt="Selected" className="w-20 h-20 object-cover rounded-lg border border-violet-500/50" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <div className="flex gap-4">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 bg-white/5 hover:bg-white/10 text-violet-400 rounded-xl transition-all"
                >
                  <Paperclip size={20} />
                </button>
                <button 
                  onClick={startListening}
                  className={`p-4 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 hover:bg-white/10 text-violet-400'}`}
                >
                  <Mic size={20} />
                </button>
                <input 
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStudyMessage(aiInput, selectedImage || undefined)}
                  placeholder="Soru sor, fotoğraf gönder, /resim [konu] veya /video [konu] yaz..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-violet-500/50 transition-all text-inherit"
                />
                <button 
                  onClick={() => handleStudyMessage("Bana rastgele bir soru oluştur ve konuyu tartışalım.")}
                  className="p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all flex items-center gap-2 font-bold"
                  title="Rastgele Soru Oluştur"
                >
                  <Sparkles size={20} />
                  <span className="hidden md:inline">Soru Oluştur</span>
                </button>
                <button 
                  onClick={() => handleStudyMessage(aiInput, selectedImage || undefined)}
                  className="p-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quiz & Battle Royale View */}
      {(view === 'quiz' || view === 'battle-royale') && (
        <section className="pt-32 pb-20 px-6 min-h-screen flex items-center justify-center">
          <div className={`max-w-2xl mx-auto w-full glass-card p-10 shadow-2xl border-2 ${view === 'battle-royale' ? 'border-red-500/30' : 'border-white/5'}`}>
            {!quizFinished ? (
              <>
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
                    {view === 'battle-royale' && <Zap className="text-red-500 animate-pulse" size={24} />}
                    {view === 'battle-royale' ? 'Battle Royale' : 'Kendini Test Et'}
                  </h2>
                  <div className={`px-4 py-1 ${view === 'battle-royale' ? 'bg-red-500/20 text-red-400' : 'bg-violet-500/20 text-violet-400'} rounded-full text-sm font-bold`}>
                    Soru {currentQuizIndex + 1} / {quizQuestions.length}
                  </div>
                </div>

                {isGenerating ? (
                  <div className="py-20 flex flex-col items-center gap-6">
                    <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                    <p className="text-violet-200/40 animate-pulse">Yapay Zeka soruları hazırlıyor...</p>
                  </div>
                ) : quizQuestions.length > 0 ? (
                  <motion.div
                    key={currentQuizIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <p className="text-xl font-medium mb-8 leading-relaxed">
                      {quizQuestions[currentQuizIndex].text}
                    </p>
                    <div className="grid grid-cols-1 gap-4">
                      {quizQuestions[currentQuizIndex].options?.map((opt, i) => {
                        const char = opt.charAt(0);
                        const isSelected = selectedAnswer === char;
                        const status = answerStatus[currentQuizIndex];
                        
                        let bgColor = "bg-white/5";
                        let borderColor = "border-white/10";
                        
                        if (isSelected || (status && char === quizQuestions[currentQuizIndex].correctAnswer)) {
                          if (char === quizQuestions[currentQuizIndex].correctAnswer) {
                            bgColor = "bg-emerald-500/20";
                            borderColor = "border-emerald-500/50";
                          } else if (char === quizQuestions[currentQuizIndex].closeAnswer) {
                            bgColor = "bg-orange-500/20";
                            borderColor = "border-orange-500/50";
                          } else if (isSelected) {
                            bgColor = "bg-red-500/20";
                            borderColor = "border-red-500/50";
                          }
                        }

                        return (
                          <button
                            key={i}
                            disabled={!!selectedAnswer}
                            onClick={() => handleQuizAnswer(char)}
                            className={`p-5 text-left ${bgColor} ${borderColor} border rounded-2xl transition-all group relative overflow-hidden`}
                          >
                            <span className={`font-bold ${isSelected ? 'text-white' : 'text-violet-400'} mr-3 transition-colors`}>{char})</span>
                            {opt.substring(3)}
                            {isSelected && status === 'correct' && <Check className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400" />}
                            {isSelected && status === 'incorrect' && <X className="absolute right-4 top-1/2 -translate-y-1/2 text-red-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center py-20">
                    <p>Sorular yüklenemedi. Lütfen tekrar deneyin.</p>
                    <button onClick={startQuiz} className="mt-6 px-6 py-3 bg-violet-600 rounded-xl">Tekrar Dene</button>
                  </div>
                )}
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <div className="w-24 h-24 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Trophy size={48} className="text-violet-400" />
                </div>
                <h2 className="text-4xl font-bold mb-4">{view === 'battle-royale' ? 'Battle Royale Bitti!' : 'Test Tamamlandı!'}</h2>
                <div className="text-6xl font-black text-violet-500 mb-6">
                  {Math.round(quizScore)}
                  <span className="text-2xl text-violet-200/40 font-normal"> / 100</span>
                </div>
                <p className="text-violet-200/40 mb-10 max-w-sm mx-auto">
                  {view === 'battle-royale' 
                    ? `100 soruluk maratonu tamamladın! Skorun: ${Math.round(quizScore)}. Gerçek bir savaşçısın!`
                    : quizScore >= 70 ? 'Harika bir iş çıkardın! Konuları gayet iyi kavramışsın.' : 'Biraz daha çalışarak puanını yükseltebilirsin. AI öğretmenine soru sormayı unutma!'}
                </p>
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => startQuiz(view === 'battle-royale')}
                    className={`px-8 py-4 ${view === 'battle-royale' ? 'bg-red-600 hover:bg-red-500' : 'bg-violet-600 hover:bg-violet-500'} text-white rounded-xl font-bold flex items-center gap-2 transition-all`}
                  >
                    <RefreshCw size={20} />
                    Tekrar Çöz
                  </button>
                  <button 
                    onClick={() => setView('home')}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold transition-all"
                  >
                    Ana Sayfaya Dön
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* PDF Library View */}
      {view === 'pdf-library' && (
        <section className="pt-32 pb-20 px-6 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-between items-center mb-12"
            >
              <div>
                <h2 className="text-4xl font-bold tracking-tighter mb-2">MEB PDF Kütüphanesi</h2>
                <p className="text-violet-200/40">Milli Eğitim Bakanlığı resmi ders kitaplarına buradan ulaşabilirsin.</p>
              </div>
              <button 
                onClick={() => setView('home')}
                className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <Home size={18} />
                Ana Sayfa
              </button>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {pdfBooks.map((pdf, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -10 }}
                  className="glass-card group cursor-pointer overflow-hidden flex flex-col"
                  onClick={() => {
                    playSound('click');
                    window.open(pdf.url, '_blank');
                  }}
                >
                  <div className="aspect-[3/4] relative overflow-hidden">
                    <img 
                      src={pdf.thumbnail} 
                      alt={pdf.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                      <span className="text-white font-bold flex items-center gap-2">
                        <BookOpen size={18} />
                        Şimdi Oku
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-2 block">{pdf.subject}</span>
                    <h3 className="text-lg font-bold leading-tight group-hover:text-violet-400 transition-colors">{pdf.title}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-40 px-6 text-center">
        <FadeInView>
          <div className="max-w-4xl mx-auto glass-card p-16 md:p-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 z-0" />
            <div className="relative z-10">
              <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8">Öğrenmeye Bugün Başla.</h2>
              <p className="text-xl text-violet-200/60 mb-12 max-w-xl mx-auto">
                Binlerce öğrenci uyguluyo.com ile potansiyelini keşfediyor. Sen de aramıza katıl.
              </p>
              <button 
                onMouseEnter={() => playSound('hover')}
                onClick={() => { playSound('click'); scrollToSection('egitimler'); }}
                className="px-12 py-5 bg-violet-600 text-white rounded-2xl font-bold text-xl hover:scale-105 transition-transform shadow-2xl shadow-violet-500/20"
              >
                Misafir Olarak Başla
              </button>
            </div>
          </div>
        </FadeInView>
      </section>

      {/* Full Screen Image Modal */}
      <AnimatePresence>
        {fullScreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullScreenImage(null)}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 cursor-zoom-out"
          >
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={fullScreenImage} 
              alt="Full Screen" 
              className="max-w-full max-h-full rounded-2xl shadow-2xl"
            />
            <button 
              onClick={() => setFullScreenImage(null)}
              className="absolute top-10 right-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
            >
              <X size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Button (Bottom Left) */}
      <div className="fixed bottom-8 left-8 z-[60]">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onMouseEnter={() => playSound('hover')}
          onClick={() => { playSound('click'); setShowSettings(true); }}
          className="w-14 h-14 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-2xl shadow-violet-900/40 border border-white/10"
        >
          <Settings size={24} />
        </motion.button>

        <AnimatePresence>
          {showSettings && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20, x: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20, x: -20 }}
                className="fixed bottom-24 left-8 w-72 glass-card p-6 z-[80] shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2 text-violet-400">
                    <Palette size={18} />
                    <h3 className="font-bold uppercase tracking-widest text-xs">Tema Seçimi</h3>
                  </div>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="p-1 rounded-lg hover:bg-white/5 text-violet-200/40 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-3 mb-6">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        playSound('click');
                        setTheme(t.id);
                        setShowSettings(false);
                      }}
                      onMouseEnter={() => playSound('hover')}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        theme === t.id 
                          ? 'bg-violet-600/20 border-violet-500 text-white' 
                          : 'bg-white/5 border-white/5 text-violet-200/60 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${t.color} border border-white/20`} />
                      <span className="text-sm font-medium">{t.name}</span>
                      {theme === t.id && <Check size={14} className="ml-auto text-violet-400" />}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-violet-400 mb-4">
                  <Volume2 size={18} />
                  <h3 className="font-bold uppercase tracking-widest text-xs">Seslendirme</h3>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setVoiceType('female'); playSound('click'); }}
                    className={`flex-1 py-2 rounded-lg border ${voiceType === 'female' ? 'bg-violet-600 border-violet-500' : 'bg-white/5 border-white/10'} text-[10px] font-bold transition-all`}
                  >
                    Kadın Sesi
                  </button>
                  <button
                    onClick={() => { setVoiceType('male'); playSound('click'); }}
                    className={`flex-1 py-2 rounded-lg border ${voiceType === 'male' ? 'bg-violet-600 border-violet-500' : 'bg-white/5 border-white/10'} text-[10px] font-bold transition-all`}
                  >
                    Erkek Sesi
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex flex-col gap-4">
            <div className="text-2xl font-bold tracking-tighter">
              uyguluyo<span className="text-violet-500">.com</span>
            </div>
            <p className="text-violet-200/20 text-sm max-w-xs">
              Yapay zeka destekli, modern eğitim platformu. Öğrenmeyi pürüzsüz hale getiriyoruz.
            </p>
          </div>
          
          <div className="flex gap-12 text-sm text-violet-200/40">
            <div className="flex flex-col gap-4">
              <span className="text-inherit font-bold">Ürün</span>
              <button onClick={() => { setView('home'); setTimeout(() => scrollToSection('yapay-zeka'), 100); }} className="hover:text-violet-400 transition-colors text-left">AI Asistan</button>
              <button onClick={() => { setView('home'); setTimeout(() => scrollToSection('egitimler'), 100); }} className="hover:text-violet-400 transition-colors text-left">Dersler</button>
              <button onClick={() => { setView('home'); setTimeout(() => scrollToSection('kutuphane'), 100); }} className="hover:text-violet-400 transition-colors text-left">Kütüphane</button>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-inherit font-bold">Şirket</span>
              <a href="#" className="hover:text-violet-400 transition-colors">Hakkımızda</a>
              <a href="#" className="hover:text-violet-400 transition-colors">Blog</a>
              <a href="#" className="hover:text-violet-400 transition-colors">İletişim</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex justify-between items-center text-[10px] uppercase tracking-widest text-violet-200/20">
          <span>© 2026 uyguluyo.com</span>
          <div className="flex gap-6">
            <a href="#">Gizlilik Politikası</a>
            <a href="#">Kullanım Şartları</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
