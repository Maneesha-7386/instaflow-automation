import React, { useState, useRef, useEffect } from 'react';
import { useAccount } from '../../hooks/useAccount';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { FAQ_ITEMS } from '../../config/constants';
import { isFirebaseConfigured } from '../../config/firebase';
import { uploadMediaFile } from '../../services/storageService';
import {
  generateAiStudioRemote,
  askAiAssistantRemote,
  isBackendConfigured,
} from '../../services/apiService';
import {
  renderGraphicPng,
  triggerDataUrlDownload,
  renderStoryboardWebm,
} from '../../utils/mediaCanvas';
import PhonePreview from '../../components/common/PhonePreview';

const SUB_TOOLS = [
  { id: 'ai_reel', label: 'AI Reel Creator', icon: '✨' },
  { id: 'normal_reel', label: 'Normal Reel Creator', icon: '🎬' },
  { id: 'thumbnail', label: 'AI Thumbnail Creator', icon: '🖼️' },
  { id: 'post', label: 'AI Post Creator', icon: '📱' },
];

export default function AIStudioView({ onNavigate }) {
  const {
    accounts,
    reels,
    automations,
    activeAccountIndex,
    addReel,
    saveAiGeneration,
    setPendingCoverAttachment,
    openNewReelModal,
  } = useAccount();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTool, setActiveTool] = useState('ai_reel');

  // Form inputs
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('Trendy and fast');
  const [duration, setDuration] = useState('15 sec');
  const [language, setLanguage] = useState('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationResult, setGenerationResult] = useState(null);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState('');

  // Normal Reel Creator state
  const [normalVideoUrl, setNormalVideoUrl] = useState('');
  const [normalFileName, setNormalFileName] = useState('');
  const [normalStoragePath, setNormalStoragePath] = useState('');
  const [isNormalUploading, setIsNormalUploading] = useState(false);
  const [normalUploadProgress, setNormalUploadProgress] = useState(0);
  const [normalCaption, setNormalCaption] = useState('');
  const [normalAudio, setNormalAudio] = useState('Original audio · Uploaded');

  // Chat state
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: 'Hi! I am InstaFlow AI. I can answer questions about your accounts, diagnose publishing errors, write viral hooks, and help configure automations. What do you need?',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef(null);

  const activeAccount = accounts[activeAccountIndex] || accounts[0] || null;

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const buildLocalGeneration = (inputTopic, hue) => {
    const keyword = inputTopic.split(' ')[0].toLowerCase().replace(/\W/g, '') || 'instaflow';

    if (activeTool === 'ai_reel') {
      return {
        type: 'ai_reel',
        provider: 'local',
        title: inputTopic.slice(0, 42),
        hue,
        scenes: [
          { num: 1, hook: 'Scene 1 (Hook)', text: `Stop scrolling if you want to elevate your ${inputTopic.split(' ')[0]}.` },
          { num: 2, hook: 'Scene 2 (Value)', text: `Here is how ${inputTopic} works in ${duration} with ${style.toLowerCase()} energy.` },
          { num: 3, hook: 'Scene 3 (CTA)', text: 'Save this Reel and check our bio link to try it today!' },
        ],
        caption: `${inputTopic} ✨ Crafted in ${language} (${style}) #${keyword} #reels #instaflow`,
        audioName: `AI Script · ${style} (${language})`,
      };
    }

    if (activeTool === 'thumbnail') {
      const pngDataUrl = renderGraphicPng({
        type: 'thumbnail',
        hue,
        handle: activeAccount?.handle || '@instaflow',
        title: inputTopic.slice(0, 48),
        subtitle: `${style} Cover`,
      });
      return {
        type: 'thumbnail',
        provider: 'local',
        title: inputTopic.slice(0, 48),
        hue,
        pngDataUrl,
        styleDescription: `${style} 1080×1920 vertical cover rendered in InstaFlow Canvas Studio`,
      };
    }

    const pngDataUrl = renderGraphicPng({
      type: 'post',
      hue,
      handle: activeAccount?.handle || '@instaflow',
      title: inputTopic.slice(0, 48),
      subtitle: style,
    });
    return {
      type: 'post',
      provider: 'local',
      title: inputTopic.slice(0, 48),
      hue,
      pngDataUrl,
      caption: `Introducing ${inputTopic}! Built for the community ✨ #${keyword} #instagram`,
    };
  };

  const handleGenerate = async () => {
    const inputTopic = topic.trim() || 'New cold brew coffee launch';
    setIsGenerating(true);
    setGenerationStep(1);
    setGenerationResult(null);
    setRenderedVideoUrl('');

    const hue = Math.floor(Math.random() * 360);

    // Attempt live Gemini backend generation first when configured
    if (isBackendConfigured && user?.uid && !user?.isDemo) {
      try {
        setGenerationStep(2);
        const remote = await generateAiStudioRemote({
          tool: activeTool,
          topic: inputTopic,
          style,
          duration,
          language,
          brandHandle: activeAccount?.handle,
        });
        setGenerationStep(4);

        const data = remote.result || {};
        let finalResult;
        if (activeTool === 'ai_reel') {
          finalResult = {
            type: 'ai_reel',
            provider: 'gemini',
            title: (data.title || inputTopic).slice(0, 42),
            hue,
            scenes: data.scenes || [],
            caption: data.caption || inputTopic,
            audioName: data.audioNotes || `Gemini AI · ${style} (${language})`,
          };
        } else if (activeTool === 'thumbnail') {
          const title = data.headline || inputTopic.slice(0, 48);
          const pngDataUrl = renderGraphicPng({
            type: 'thumbnail',
            hue,
            handle: activeAccount?.handle || '@instaflow',
            title,
            subtitle: data.subtitle || `${style} Cover`,
          });
          finalResult = {
            type: 'thumbnail',
            provider: 'gemini',
            title,
            hue,
            pngDataUrl,
            styleDescription: data.subtitle || `${style} cover rendered at 1080×1920`,
          };
        } else {
          const title = data.headline || inputTopic.slice(0, 48);
          const pngDataUrl = renderGraphicPng({
            type: 'post',
            hue,
            handle: activeAccount?.handle || '@instaflow',
            title,
            subtitle: data.subtitle || style,
          });
          finalResult = {
            type: 'post',
            provider: 'gemini',
            title,
            hue,
            pngDataUrl,
            caption: data.caption || inputTopic,
          };
        }

        setGenerationResult(finalResult);
        await saveAiGeneration({
          tool: activeTool,
          topic: inputTopic,
          provider: 'gemini',
          title: finalResult.title,
        }).catch(() => {});
        setIsGenerating(false);
        setGenerationStep(0);
        showToast('Generated with Gemini AI!');
        return;
      } catch (err) {
        console.warn('[AIStudio] Falling back to Local Studio Engine:', err.message);
      }
    }

    // Clean local canvas/studio fallback
    let stepIdx = 1;
    const interval = setInterval(async () => {
      stepIdx++;
      if (stepIdx <= 4) {
        setGenerationStep(stepIdx);
      } else {
        clearInterval(interval);
        const localRes = buildLocalGeneration(inputTopic, hue);
        setGenerationResult(localRes);
        await saveAiGeneration({
          tool: activeTool,
          topic: inputTopic,
          provider: 'local_studio',
          title: localRes.title,
        }).catch(() => {});
        setIsGenerating(false);
        setGenerationStep(0);
        showToast('Generated in Local Studio Engine!');
      }
    }, 350);
  };

  const handleUpdateSceneText = (num, text) => {
    setGenerationResult((prev) =>
      prev
        ? {
            ...prev,
            scenes: (prev.scenes || []).map((s) => (s.num === num ? { ...s, text } : s)),
          }
        : prev
    );
  };

  const handleSpeakScript = () => {
    if (!generationResult?.scenes?.length || typeof window === 'undefined' || !window.speechSynthesis) {
      showToast('Browser speech synthesis unavailable.');
      return;
    }
    window.speechSynthesis.cancel();
    const fullText = generationResult.scenes.map((s) => s.text).join('. ');
    const utter = new SpeechSynthesisUtterance(fullText);
    window.speechSynthesis.speak(utter);
    showToast('Playing browser voiceover preview...');
  };

  const handleRenderVideo = async () => {
    if (!generationResult?.scenes) return;
    setIsRenderingVideo(true);
    try {
      const { objectUrl } = await renderStoryboardWebm({
        scenes: generationResult.scenes,
        hue: generationResult.hue,
        handle: activeAccount?.handle || '@instaflow',
        title: generationResult.title,
      });
      setRenderedVideoUrl(objectUrl);
      triggerDataUrlDownload(objectUrl, `${generationResult.title.replace(/\W+/g, '_')}.webm`);
      showToast('Rendered & downloaded 9:16 WebM Reel!');
    } catch (err) {
      showToast(err?.message || 'Unable to render WebM video in this browser.');
    } finally {
      setIsRenderingVideo(false);
    }
  };

  const handleDownloadGraphic = () => {
    if (!generationResult?.pngDataUrl) return;
    const slug = (generationResult.title || 'instaflow_asset').toLowerCase().replace(/\W+/g, '_');
    triggerDataUrlDownload(generationResult.pngDataUrl, `${slug}.png`);
    showToast(`Downloaded PNG (${activeTool === 'post' ? '1080×1080' : '1080×1920'})`);
  };

  const handleUseAsCover = () => {
    if (!generationResult?.pngDataUrl) return;
    setPendingCoverAttachment({
      title: generationResult.title,
      dataUrl: generationResult.pngDataUrl,
      hue: generationResult.hue,
    });
    openNewReelModal('normal');
    showToast('Cover attached to Reel composer!');
  };

  const handleNormalVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setNormalVideoUrl(url);
    setNormalFileName(file.name);
    if (!normalCaption) {
      const tag = (activeAccount?.name || 'instaflow').toLowerCase().replace(/\W/g, '');
      setNormalCaption(`Sharing our latest update! ✨ #${tag} #reels`);
    }

    if (isFirebaseConfigured && user?.uid && !user?.isDemo) {
      setIsNormalUploading(true);
      setNormalUploadProgress(0);
      try {
        const result = await uploadMediaFile(user.uid, file, 'reels', (pct) => {
          setNormalUploadProgress(pct);
        });
        setNormalVideoUrl(result.downloadUrl);
        setNormalStoragePath(result.storagePath);
        showToast(`Uploaded ${file.name} to Firebase Storage`);
      } catch (err) {
        showToast(err.message || 'Storage unavailable; keeping local preview');
      } finally {
        setIsNormalUploading(false);
      }
    } else {
      showToast(`Video loaded: ${file.name}`);
    }
  };

  const handleSaveToDrafts = async (isScheduled = false) => {
    if (isNormalUploading) {
      showToast('Please wait for the video upload to finish.');
      return;
    }

    let title = '';
    let captionText = '';
    let kind = 'Reel';
    let videoUrl = '';
    let storagePath = '';
    let hue = 280;
    let scenes = null;

    if (activeTool === 'normal_reel') {
      title = normalFileName || 'Normal Uploaded Reel';
      captionText = normalCaption;
      videoUrl = normalVideoUrl;
      storagePath = normalStoragePath;
      hue = 300;
    } else if (generationResult) {
      title = generationResult.title;
      captionText = generationResult.caption || '';
      kind = activeTool === 'post' ? 'Post' : 'Reel';
      hue = generationResult.hue || 260;
      scenes = generationResult.scenes || null;
      videoUrl = renderedVideoUrl || '';
    }

    const tomorrow = new Date(Date.now() + 86400000);
    const isoDate = tomorrow.toISOString().slice(0, 10);

    const newReel = {
      id: `reel_${Date.now()}`,
      title,
      status: isScheduled ? 'scheduled' : 'draft',
      dateText: isScheduled
        ? `${tomorrow.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} · 18:30`
        : 'Not scheduled',
      scheduledTimestamp: isScheduled ? `${isoDate}T18:30:00+05:30` : null,
      accountIndex: activeAccountIndex,
      accountId: activeAccount?.id || null,
      accountHandle: activeAccount?.handle || '@unassigned',
      hue,
      kind,
      caption: captionText,
      videoUrl,
      storagePath,
      scenes,
    };

    try {
      await addReel(newReel);
      showToast(isScheduled ? 'Scheduled in Firestore!' : 'Saved to drafts in Firestore');
      if (onNavigate) {
        onNavigate(isScheduled ? 'schedule' : 'content');
      }
    } catch (err) {
      showToast(err?.message || 'Failed to save to Firestore');
    }
  };

  const handleSendChat = async (textToSend) => {
    const query = (textToSend || chatInput).trim();
    if (!query || isChatLoading) return;

    setChatMessages((prev) => [...prev, { sender: 'user', text: query }]);
    setChatInput('');
    setIsChatLoading(true);

    const workspaceSummary = {
      activeAccount: activeAccount?.handle || 'None',
      connectedAccounts: accounts.filter((a) => a.connected).length,
      scheduledPosts: reels.filter((r) => r.status === 'scheduled').length,
      failedPosts: reels.filter((r) => r.status === 'failed').length,
      activeAutomations: automations.filter((a) => a.enabled).length,
    };

    if (isBackendConfigured && user?.uid && !user?.isDemo) {
      try {
        const remote = await askAiAssistantRemote({ message: query, workspaceSummary });
        setChatMessages((prev) => [...prev, { sender: 'ai', text: remote.reply }]);
        setIsChatLoading(false);
        return;
      } catch (err) {
        console.warn('[Chat] Falling back to workspace-aware local assistant:', err.message);
      }
    }

    const matched = FAQ_ITEMS.find((item) => item.pattern.test(query));
    const response = matched
      ? matched.answer
      : `Workspace snapshot (${workspaceSummary.activeAccount}): you have ${workspaceSummary.connectedAccounts} connected account(s), ${workspaceSummary.scheduledPosts} scheduled item(s), ${workspaceSummary.failedPosts} failed item(s), and ${workspaceSummary.activeAutomations} active workflow(s). Try asking about best posting times, captions, or why a Reel failed.`;

    setChatMessages((prev) => [...prev, { sender: 'ai', text: response }]);
    setIsChatLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      {/* Left Column: Create with AI & Normal Reel Studio */}
      <div
        className="p-5 rounded-2xl border flex flex-col gap-4"
        style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-bold text-[var(--tx)] m-0">Inbuilt Studio</h2>
          <div className="flex items-center gap-2">
            <span className="chip c-mu text-[10px]">
              {isBackendConfigured ? 'Backend Ready' : 'Local Studio'}
            </span>
            <span className="text-xs font-semibold text-[var(--mu)]">
              Account: {activeAccount?.handle || 'None connected'}
            </span>
          </div>
        </div>

        {/* Sub-Tools Tabs */}
        <div className="flex gap-1.5 p-1 rounded-xl border bg-[var(--sf2)] overflow-x-auto" style={{ borderColor: 'var(--ln)' }}>
          {SUB_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => {
                setActiveTool(tool.id);
                setGenerationResult(null);
              }}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
                activeTool === tool.id
                  ? 'bg-[var(--sf)] text-[var(--tx)] shadow-xs'
                  : 'text-[var(--mu)] hover:text-[var(--tx)]'
              }`}
            >
              <span>{tool.icon}</span>
              <span>{tool.label}</span>
            </button>
          ))}
        </div>

        {/* TOOL 1: NORMAL REEL CREATOR */}
        {activeTool === 'normal_reel' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[var(--mu)] m-0">
              Upload your own recorded video (MP4, MOV, or WebM), compose your caption, and preview live on a 9:16 Instagram phone screen.
            </p>

            <div>
              <label className="block text-xs font-bold text-[var(--mu)] mb-1">
                Upload Video File
              </label>
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-[var(--br)] transition-colors bg-[var(--sf2)] text-center">
                <span className="text-3xl mb-1">📹</span>
                <span className="font-bold text-xs text-[var(--tx)]">
                  {isNormalUploading
                    ? `Uploading to Firebase Storage (${normalUploadProgress}%)...`
                    : normalFileName || 'Click to select or drag video file'}
                </span>
                <span className="text-[11px] text-[var(--mu)] mt-0.5">
                  Supports MP4, MOV, WebM · 9:16 Portrait
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={handleNormalVideoUpload}
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--mu)] mb-1">
                Caption & Hashtags
              </label>
              <textarea
                rows={3}
                placeholder="Write an engaging caption..."
                value={normalCaption}
                onChange={(e) => setNormalCaption(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
                style={{ background: 'var(--sf)', borderColor: 'var(--ln)', color: 'var(--tx)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--mu)] mb-1">
                Audio Track Name
              </label>
              <input
                type="text"
                value={normalAudio}
                onChange={(e) => setNormalAudio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs"
                style={{ background: 'var(--sf)', borderColor: 'var(--ln)', color: 'var(--tx)' }}
              />
            </div>

            <div className="py-2 flex justify-center">
              <PhonePreview
                caption={normalCaption}
                accountHandle={activeAccount?.handle || '@instaflow'}
                accountAvatarColor={activeAccount?.color || '#6d3df2'}
                accountInitials={activeAccount?.initials || 'IF'}
                videoUrl={normalVideoUrl}
                audioName={normalAudio}
              />
            </div>

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => handleSaveToDrafts(false)}
                className="flex-1 py-2 rounded-xl text-xs font-bold border hover:bg-[var(--sf2)] transition-colors"
                style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
              >
                Save to drafts
              </button>
              <button
                type="button"
                onClick={() => handleSaveToDrafts(true)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-all border-0"
                style={{ background: 'var(--g)' }}
              >
                Schedule for 6:30 PM
              </button>
            </div>
          </div>
        )}

        {/* TOOL 2, 3, 4: AI REEL, THUMBNAIL & POST CREATOR */}
        {activeTool !== 'normal_reel' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[var(--mu)] m-0">
              {activeTool === 'ai_reel' &&
                'Generate editable Reel scripts, voiceover previews, captions, and downloadable 9:16 storyboard videos.'}
              {activeTool === 'thumbnail' &&
                'Render 1080×1920 high-CTR Instagram Reel covers and download as PNG or attach to a Reel.'}
              {activeTool === 'post' &&
                'Render 1080×1080 Instagram feed graphics with editable captions and hashtags.'}
            </p>

            <div>
              <label className="block text-xs font-bold text-[var(--mu)] mb-1">
                {activeTool === 'ai_reel' && 'What is the video about?'}
                {activeTool === 'thumbnail' && 'What should the thumbnail headline say?'}
                {activeTool === 'post' && 'What is the post topic or offer?'}
              </label>
              <textarea
                rows={2}
                placeholder={
                  activeTool === 'ai_reel'
                    ? 'e.g. 15-second teaser for our new cold brew launch'
                    : activeTool === 'thumbnail'
                    ? 'e.g. 5 Cold Brew Mistakes Everyone Makes'
                    : 'e.g. Announce our extended weekend roastery hours'
                }
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
                style={{ background: 'var(--sf)', borderColor: 'var(--ln)', color: 'var(--tx)' }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-[var(--mu)] mb-1">Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                  style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                >
                  <option>Trendy and fast</option>
                  <option>Educational</option>
                  <option>Product promo</option>
                  <option>Storytelling</option>
                </select>
              </div>

              {activeTool === 'ai_reel' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[var(--mu)] mb-1">Length</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                      style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                    >
                      <option>15 sec</option>
                      <option>30 sec</option>
                      <option>60 sec</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--mu)] mb-1">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                      style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                    >
                      <option>English</option>
                      <option>Hindi</option>
                      <option>Spanish</option>
                      <option>French</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs md:text-sm text-white shadow-md hover:opacity-95 transition-all border-0 flex items-center justify-center gap-2 mt-1"
              style={{ background: 'var(--g)' }}
            >
              {isGenerating
                ? '✨ Generating Content...'
                : activeTool === 'ai_reel'
                ? '✨ Generate Reel'
                : activeTool === 'thumbnail'
                ? '✨ Generate Thumbnail'
                : '✨ Generate Post'}
            </button>

            {isGenerating && (
              <div
                className="p-3.5 rounded-xl border bg-[var(--sf2)] text-xs flex flex-col gap-2"
                style={{ borderColor: 'var(--ln)' }}
              >
                {[
                  'Analyzing topic & audience hooks...',
                  'Writing 3-scene viral script...',
                  'Preparing voiceover & timing...',
                  'Rendering visual composition...',
                ].map((s, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 font-medium ${
                      idx + 1 < generationStep
                        ? 'text-[var(--ok)] font-bold'
                        : idx + 1 === generationStep
                        ? 'text-[var(--br)] font-bold animate-pulse'
                        : 'text-[var(--mu)]'
                    }`}
                  >
                    <span>{idx + 1 < generationStep ? '✓' : idx + 1 === generationStep ? '…' : '○'}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Generation Result Panel */}
            {generationResult && (
              <div className="flex flex-col gap-3 pt-3 border-t" style={{ borderColor: 'var(--ln)' }}>
                {activeTool === 'ai_reel' && (
                  <div className="grid grid-cols-1 md:grid-cols-[175px_1fr] gap-4 items-start">
                    <PhonePreview
                      caption={generationResult.caption}
                      accountHandle={activeAccount?.handle || '@instaflow'}
                      accountAvatarColor={activeAccount?.color || '#6d3df2'}
                      accountInitials={activeAccount?.initials || 'IF'}
                      videoUrl={renderedVideoUrl}
                      gradientHue={generationResult.hue}
                      audioName={generationResult.audioName}
                    />

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--mu)] uppercase tracking-wide">
                          Editable AI Scenes ({generationResult.provider === 'gemini' ? 'Gemini' : 'Local Studio'})
                        </span>
                        <button
                          type="button"
                          onClick={handleSpeakScript}
                          className="px-2 py-1 rounded-md text-[11px] font-semibold border hover:bg-[var(--sf2)]"
                          style={{ borderColor: 'var(--ln)' }}
                        >
                          🔊 Voice Preview
                        </button>
                      </div>

                      {generationResult.scenes.map((sc) => (
                        <div
                          key={sc.num}
                          className="p-2 rounded-xl text-xs border"
                          style={{ background: 'var(--sf2)', borderColor: 'var(--ln)' }}
                        >
                          <b className="text-[var(--br)] block mb-1">{sc.hook}</b>
                          <input
                            type="text"
                            value={sc.text}
                            onChange={(e) => handleUpdateSceneText(sc.num, e.target.value)}
                            className="w-full bg-transparent border-0 text-xs outline-hidden text-[var(--tx)]"
                          />
                        </div>
                      ))}

                      <div
                        className="p-2.5 rounded-xl text-xs border mt-1"
                        style={{ background: 'var(--sf2)', borderColor: 'var(--ln)' }}
                      >
                        <b className="text-[var(--tx)] block mb-1">Editable Caption & Hashtags:</b>
                        <textarea
                          rows={2}
                          value={generationResult.caption}
                          onChange={(e) =>
                            setGenerationResult((prev) => ({ ...prev, caption: e.target.value }))
                          }
                          className="w-full bg-transparent border-0 text-xs resize-none outline-hidden text-[var(--mu)]"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 mt-1">
                        <button
                          type="button"
                          disabled={isRenderingVideo}
                          onClick={handleRenderVideo}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)]"
                          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                        >
                          {isRenderingVideo ? 'Rendering WebM...' : '⬇ Export WebM Video'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveToDrafts(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)] transition-colors"
                          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                        >
                          Save to drafts
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveToDrafts(true)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs border-0"
                          style={{ background: 'var(--g)' }}
                        >
                          Schedule for 6:30 PM
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTool === 'thumbnail' && (
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <img
                      src={generationResult.pngDataUrl}
                      alt={generationResult.title}
                      className="w-36 aspect-[9/16] rounded-2xl object-cover shadow-md shrink-0 border"
                      style={{ borderColor: 'var(--ln)' }}
                    />

                    <div className="flex flex-col gap-2 flex-1">
                      <b className="text-sm font-bold text-[var(--tx)]">1080×1920 Reel Cover Ready</b>
                      <p className="text-xs text-[var(--mu)] m-0">{generationResult.styleDescription}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          type="button"
                          onClick={handleDownloadGraphic}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)] transition-colors"
                          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                        >
                          ⬇ Download PNG
                        </button>
                        <button
                          type="button"
                          onClick={handleUseAsCover}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white border-0"
                          style={{ background: 'var(--g)' }}
                        >
                          Use as Reel cover
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTool === 'post' && (
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <img
                      src={generationResult.pngDataUrl}
                      alt={generationResult.title}
                      className="w-36 aspect-square rounded-2xl object-cover shadow-md shrink-0 border"
                      style={{ borderColor: 'var(--ln)' }}
                    />

                    <div className="flex flex-col gap-2 flex-1">
                      <div
                        className="p-2.5 rounded-xl text-xs border"
                        style={{ background: 'var(--sf2)', borderColor: 'var(--ln)' }}
                      >
                        <b className="text-[var(--tx)] block mb-1">Editable Caption:</b>
                        <textarea
                          rows={2}
                          value={generationResult.caption}
                          onChange={(e) =>
                            setGenerationResult((prev) => ({ ...prev, caption: e.target.value }))
                          }
                          className="w-full bg-transparent border-0 text-xs resize-none outline-hidden text-[var(--mu)]"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <button
                          type="button"
                          onClick={handleDownloadGraphic}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)]"
                          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                        >
                          ⬇ Download PNG
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveToDrafts(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)] transition-colors"
                          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                        >
                          Save to drafts
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveToDrafts(true)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white border-0"
                          style={{ background: 'var(--g)' }}
                        >
                          Schedule for 6:30 PM
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Ask InstaFlow AI Assistant */}
      <div
        className="p-5 rounded-2xl border flex flex-col h-[600px] justify-between"
        style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--ln)' }}>
          <div>
            <h2 className="text-base font-bold text-[var(--tx)] m-0">Ask InstaFlow AI</h2>
            <p className="text-xs text-[var(--mu)] m-0 mt-0.5">
              Account-aware assistant for captions, scheduling advice & error diagnosis.
            </p>
          </div>
          <span className="chip c-ok text-[11px]">
            {isBackendConfigured ? 'Gemini Ready' : 'Assistant Ready'}
          </span>
        </div>

        <div ref={chatScrollRef} className="flex-1 overflow-y-auto py-3 flex flex-col gap-2.5 pr-1">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                msg.sender === 'user'
                  ? 'self-end text-white'
                  : 'self-start text-[var(--tx)] border'
              }`}
              style={{
                background: msg.sender === 'user' ? 'var(--g)' : 'var(--sf2)',
                borderColor: msg.sender === 'user' ? 'transparent' : 'var(--ln)',
              }}
            >
              {msg.text}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 py-2 border-t" style={{ borderColor: 'var(--ln)' }}>
          {[
            'Best time to post?',
            'Why did my Reel fail?',
            'Write a caption',
            'How do I automate DMs?',
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSendChat(suggestion)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold border text-[var(--br)] bg-[var(--sf)] hover:bg-[var(--brs)] transition-colors"
              style={{ borderColor: 'var(--ln)' }}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            placeholder="Ask anything about your Instagram accounts or content..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendChat();
            }}
            className="flex-1 px-3 py-2 rounded-xl border text-xs"
            style={{ background: 'var(--sf)', borderColor: 'var(--ln)', color: 'var(--tx)' }}
          />
          <button
            type="button"
            disabled={isChatLoading}
            onClick={() => handleSendChat()}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs border-0"
            style={{ background: 'var(--g)' }}
          >
            {isChatLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
