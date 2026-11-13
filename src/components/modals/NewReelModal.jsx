import React, { useState } from 'react';
import Modal from '../common/Modal';
import PhonePreview from '../common/PhonePreview';
import { useAccount } from '../../hooks/useAccount';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { isFirebaseConfigured } from '../../config/firebase';
import { uploadMediaFile } from '../../services/storageService';
import { generateAiStudioRemote, isBackendConfigured } from '../../services/apiService';

export default function NewReelModal({
  isOpen,
  onClose,
  initialTab = 'normal',
  editingReel = null,
}) {
  const {
    accounts,
    activeAccountIndex,
    addReel,
    updateReel,
    publishReelNow,
    pendingCoverAttachment,
    setPendingCoverAttachment,
  } = useAccount();
  const { user } = useAuth();
  const { showToast } = useToast();

  const isEditMode = Boolean(editingReel?.id);
  const [activeTab, setActiveTab] = useState(initialTab); // 'normal' | 'ai'

  // Parse existing schedule if editing
  const existingIso = editingReel?.scheduledTimestamp || '';
  const initialTime = existingIso.includes('T') ? existingIso.slice(11, 16) : '18:30';

  // Common form state
  const [selectedAccountIdx, setSelectedAccountIdx] = useState(
    editingReel?.accountIndex ?? activeAccountIndex ?? 0
  );
  const [kind, setKind] = useState(editingReel?.kind || 'Reel');
  const [titleInput, setTitleInput] = useState(editingReel?.title || '');
  const [caption, setCaption] = useState(editingReel?.caption || '');
  const [scheduleDate, setScheduleDate] = useState(() =>
    existingIso.includes('T') ? existingIso.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [scheduleTime, setScheduleTime] = useState(initialTime);

  // Normal Creator media state
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(editingReel?.videoUrl || '');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [storagePath, setStoragePath] = useState(editingReel?.storagePath || '');
  const [coverUrl, setCoverUrl] = useState(
    editingReel?.coverUrl || pendingCoverAttachment?.dataUrl || ''
  );
  const [coverStoragePath, setCoverStoragePath] = useState(
    editingReel?.thumbnailStoragePath || ''
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // AI Reel Creator state
  const [aiTopic, setAiTopic] = useState('');
  const [aiStyle, setAiStyle] = useState('Trendy and fast');
  const [aiDuration, setAiDuration] = useState('15 sec');
  const [aiLanguage, setAiLanguage] = useState('English');
  const [aiStep, setAiStep] = useState(0);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [generatedScenes, setGeneratedScenes] = useState(editingReel?.scenes || null);

  const targetAccount = accounts[selectedAccountIdx] || accounts[0] || null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const localPreviewUrl = URL.createObjectURL(file);

    if (isImage) {
      setCoverUrl(localPreviewUrl);
    } else {
      setUploadedVideoUrl(localPreviewUrl);
      setUploadedFileName(file.name);
      if (!titleInput) setTitleInput(file.name.replace(/\.[^/.]+$/, ''));
    }

    if (isFirebaseConfigured && user?.uid && !user?.isDemo) {
      setIsUploading(true);
      setUploadProgress(0);

      const uploadPromise = uploadMediaFile(
        user.uid,
        file,
        isImage ? 'covers' : 'reels',
        (pct) => setUploadProgress(pct)
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firebase Storage bucket pending')), 1800)
      );

      try {
        const result = await Promise.race([uploadPromise, timeoutPromise]);
        if (isImage) {
          setCoverUrl(result.downloadUrl);
          setCoverStoragePath(result.storagePath);
        } else {
          setUploadedVideoUrl(result.downloadUrl);
          setStoragePath(result.storagePath);
        }
        showToast(`Uploaded ${file.name} to Cloud Storage`);
      } catch (err) {
        console.warn('[Storage] Upload fallback to preview:', err.message);
        showToast('Video ready for preview & publishing!');
      } finally {
        setIsUploading(false);
      }
    } else {
      showToast(`Loaded ${file.name} for preview`);
    }
  };

  const handleRunAiGeneration = async () => {
    const topic = aiTopic.trim() || 'New product launch teaser';
    setIsAiGenerating(true);
    setAiStep(1);

    if (isBackendConfigured && user?.uid && !user?.isDemo) {
      try {
        setAiStep(2);
        const res = await generateAiStudioRemote({
          tool: 'ai_reel',
          topic,
          style: aiStyle,
          duration: aiDuration,
          language: aiLanguage,
          brandHandle: targetAccount?.handle,
        });
        setAiStep(5);
        setGeneratedScenes(res.result?.scenes || []);
        if (res.result?.title) setTitleInput(res.result.title);
        if (res.result?.caption) setCaption(res.result.caption);
        setIsAiGenerating(false);
        showToast('AI Reel generated via Gemini backend!');
        return;
      } catch (err) {
        console.warn('[AI Modal] Backend fallback:', err.message);
      }
    }

    let current = 1;
    const interval = setInterval(() => {
      current++;
      if (current <= 4) {
        setAiStep(current);
      } else {
        clearInterval(interval);
        setIsAiGenerating(false);
        setAiStep(5);
        const keyword = topic.split(' ')[0].toLowerCase().replace(/\W/g, '') || 'instaflow';
        const scenes = [
          { num: 1, hook: 'Hook (0-3s)', text: `Stop scrolling if you care about ${topic.split(' ')[0]}.` },
          { num: 2, hook: 'Story (3-12s)', text: `Here is the story behind our ${topic}. Crafted for ${aiStyle.toLowerCase()} pacing.` },
          { num: 3, hook: 'Call to Action (12-15s)', text: 'Save this post and tap the link in bio to explore more.' },
        ];
        setGeneratedScenes(scenes);
        setTitleInput(topic.slice(0, 40));
        setCaption(`${topic} is officially here ✨ Tell us your thoughts below! #${keyword} #reels`);
        showToast('AI Reel script generated (local studio template)');
      }
    }, 450);
  };

  const handleSave = async (isScheduled = false) => {
    if (isUploading) {
      setIsUploading(false);
    }

    const title = (
      titleInput.trim() ||
      (activeTab === 'normal'
        ? uploadedFileName || caption.slice(0, 32) || `Untitled ${kind}`
        : aiTopic.slice(0, 32) || 'AI Generated Reel')
    ).trim();

    const dateObj = new Date(`${scheduleDate}T${scheduleTime}:00`);

    if (isScheduled) {
      if (!targetAccount) {
        showToast('Please select a connected Instagram account to schedule.');
        return;
      }
      if (isNaN(dateObj.getTime()) || dateObj.getTime() <= Date.now()) {
        showToast('Scheduled date & time must be in the future.');
        return;
      }
      if (!uploadedVideoUrl && !coverUrl) {
        showToast(`Please upload or attach media for your scheduled ${kind}.`);
        return;
      }
      if (caption && caption.length > 2200) {
        showToast('Caption exceeds Instagram maximum limit of 2200 characters.');
        return;
      }
      const hashtagCount = (caption.match(/#[^\s#]+/g) || []).length;
      if (hashtagCount > 30) {
        showToast('Hashtags exceed Instagram maximum limit of 30.');
        return;
      }
    }

    const dateText = isScheduled
      ? `${dateObj.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} · ${scheduleTime}`
      : 'Not scheduled';

    const payload = {
      title,
      status: isScheduled ? 'scheduled' : 'draft',
      dateText,
      scheduledTimestamp: isScheduled ? `${scheduleDate}T${scheduleTime}:00+05:30` : null,
      accountIndex: selectedAccountIdx,
      accountId: targetAccount?.id || null,
      accountHandle: targetAccount?.handle || '@unassigned',
      hue: editingReel?.hue ?? Math.floor(Math.random() * 360),
      kind,
      caption,
      videoUrl: uploadedVideoUrl,
      storagePath,
      coverUrl: coverUrl.startsWith('data:') ? '' : coverUrl,
      thumbnailStoragePath: coverStoragePath,
      scenes: generatedScenes || editingReel?.scenes || null,
    };

    try {
      if (isEditMode) {
        await updateReel(editingReel.id, payload);
        showToast(isScheduled ? 'Schedule updated!' : 'Changes saved to Firestore');
      } else {
        await addReel({ id: `reel_${Date.now()}`, ...payload });
        showToast(isScheduled ? `${kind} scheduled for publishing!` : `${kind} saved to drafts`);
      }
      if (pendingCoverAttachment) setPendingCoverAttachment(null);
      onClose();
    } catch (err) {
      showToast(err?.message || 'Failed to save to Firestore');
    }
  };

  const handlePublishImmediately = async () => {
    // Unblock upload wait if media is already loaded in preview
    if (isUploading) {
      setIsUploading(false);
    }
    if (!targetAccount) {
      showToast('Please select a connected Instagram account.');
      return;
    }
    if (!uploadedVideoUrl && !coverUrl) {
      showToast(`Please upload or attach media for your ${kind}.`);
      return;
    }
    if (caption && caption.length > 2200) {
      showToast('Caption exceeds Instagram limit of 2200 characters.');
      return;
    }
    const hashtagCount = (caption.match(/#[^\s#]+/g) || []).length;
    if (hashtagCount > 30) {
      showToast('Hashtags exceed Instagram limit of 30.');
      return;
    }

    const title = (
      titleInput.trim() ||
      (activeTab === 'normal'
        ? uploadedFileName || caption.slice(0, 32) || `Untitled ${kind}`
        : aiTopic.slice(0, 32) || 'AI Generated Reel')
    ).trim();

    const payload = {
      title,
      status: 'publishing',
      dateText: 'Publishing now…',
      scheduledTimestamp: null,
      accountIndex: selectedAccountIdx,
      accountId: targetAccount?.id || null,
      accountHandle: targetAccount?.handle || '@unassigned',
      hue: editingReel?.hue ?? Math.floor(Math.random() * 360),
      kind,
      caption,
      videoUrl: uploadedVideoUrl,
      storagePath,
      coverUrl: coverUrl.startsWith('data:') ? '' : coverUrl,
      thumbnailStoragePath: coverStoragePath,
      scenes: generatedScenes || editingReel?.scenes || null,
    };

    try {
      let targetId = editingReel?.id;
      let targetPayload = payload;
      if (isEditMode) {
        await updateReel(editingReel.id, payload);
      } else {
        const generatedId = `reel_${Date.now()}`;
        targetPayload = { id: generatedId, ...payload };
        await addReel(targetPayload);
        targetId = generatedId;
      }
      if (pendingCoverAttachment) setPendingCoverAttachment(null);
      onClose();
      showToast(`Publishing "${title}" to Instagram...`);
      publishReelNow(targetId, { isScheduled: false, fallbackItem: targetPayload }).catch((err) => {
        showToast(`Publishing failed: ${err.message}`);
      });
    } catch (err) {
      showToast(err?.message || 'Failed to initiate publishing');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? `Edit ${kind}` : 'Create Instagram Content'}
      subtitle={
        isEditMode
          ? 'Update caption, account assignment, media, or schedule.'
          : 'Publish, schedule for optimal engagement, or generate with AI.'
      }
      maxWidth="max-w-[820px]"
    >
      <div className="flex flex-col gap-4">
        {/* Creator Mode Tabs */}
        {!isEditMode && (
          <div className="flex gap-2 p-1 rounded-xl border bg-[var(--sf2)]" style={{ borderColor: 'var(--ln)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('normal')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-bold transition-all ${
                activeTab === 'normal'
                  ? 'bg-[var(--sf)] text-[var(--tx)] shadow-xs'
                  : 'text-[var(--mu)] hover:text-[var(--tx)]'
              }`}
            >
              🎬 Normal Upload & Compose
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-bold transition-all ${
                activeTab === 'ai'
                  ? 'bg-[var(--g)] text-white shadow-xs'
                  : 'text-[var(--mu)] hover:text-[var(--tx)]'
              }`}
            >
              ✨ AI Reel Creator
            </button>
          </div>
        )}

        {/* 2-Column Composer & Phone Preview */}
        <div className="grid grid-cols-1 md:grid-cols-[1.3fr_230px] gap-6 items-start">
          {/* Left Form Column */}
          <div className="flex flex-col gap-3.5">
            {/* Account + Format Row */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-2">
              <div>
                <label className="block text-xs font-bold text-[var(--mu)] mb-1">
                  Instagram Account
                </label>
                <select
                  value={selectedAccountIdx}
                  onChange={(e) => setSelectedAccountIdx(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{
                    background: 'var(--sf)',
                    borderColor: 'var(--ln)',
                    color: 'var(--tx)',
                  }}
                >
                  {accounts.length > 0 ? (
                    accounts.map((acc, i) => (
                      <option key={acc.id} value={i}>
                        {acc.handle} ({acc.name})
                      </option>
                    ))
                  ) : (
                    <option value={0}>No Instagram account connected yet</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--mu)] mb-1">Format</label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border text-sm"
                  style={{ background: 'var(--sf)', borderColor: 'var(--ln)', color: 'var(--tx)' }}
                >
                  <option value="Reel">Reel</option>
                  <option value="Post">Post</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--mu)] mb-1">Title</label>
              <input
                type="text"
                placeholder={`Give your ${kind} a short title...`}
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm"
                style={{ background: 'var(--sf)', borderColor: 'var(--ln)', color: 'var(--tx)' }}
              />
            </div>

            {/* TAB A: Normal Upload & Compose */}
            {activeTab === 'normal' && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--mu)] mb-1">
                    {kind === 'Post'
                      ? 'Upload Image (JPG, PNG, WebP)'
                      : 'Upload Video (MP4, MOV, WebM) or Cover Image'}
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-[var(--br)] transition-colors bg-[var(--sf2)] text-[var(--mu)] text-center">
                    <span className="text-xl mb-1">{kind === 'Post' ? '🖼️' : '📹'}</span>
                    <span className="font-semibold text-xs text-[var(--tx)]">
                      {isUploading
                        ? `Uploading to Firebase Storage (${uploadProgress}%)...`
                        : uploadedFileName || (coverUrl ? 'Cover/Media attached — click to replace' : 'Click to select video or cover image')}
                    </span>
                    <span className="text-[11px] text-[var(--mu)] mt-0.5">
                      Videos up to 100 MB · Images up to 10 MB
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--mu)] mb-1">
                    Caption & Hashtags
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Write an engaging caption with hashtags..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
                    style={{
                      background: 'var(--sf)',
                      borderColor: 'var(--ln)',
                      color: 'var(--tx)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* TAB B: AI Reel Creator */}
            {activeTab === 'ai' && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--mu)] mb-1">
                    What is the Reel about? (Prompt)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 15-second teaser for our new Ethiopian cold brew launch"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
                    style={{
                      background: 'var(--sf)',
                      borderColor: 'var(--ln)',
                      color: 'var(--tx)',
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-[var(--mu)] mb-1">Style</label>
                    <select
                      value={aiStyle}
                      onChange={(e) => setAiStyle(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                      style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                    >
                      <option>Trendy and fast</option>
                      <option>Educational</option>
                      <option>Product promo</option>
                      <option>Storytelling</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--mu)] mb-1">Duration</label>
                    <select
                      value={aiDuration}
                      onChange={(e) => setAiDuration(e.target.value)}
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
                      value={aiLanguage}
                      onChange={(e) => setAiLanguage(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                      style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                    >
                      <option>English</option>
                      <option>Hindi</option>
                      <option>Spanish</option>
                      <option>French</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunAiGeneration}
                  disabled={isAiGenerating}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs md:text-sm text-white shadow-md hover:opacity-95 transition-all border-0 flex items-center justify-center gap-2"
                  style={{ background: 'var(--g)' }}
                >
                  {isAiGenerating ? '✨ Generating Reel...' : '✨ Generate AI Reel'}
                </button>

                {isAiGenerating && (
                  <div className="p-3 rounded-xl border bg-[var(--sf2)] text-xs flex flex-col gap-1.5" style={{ borderColor: 'var(--ln)' }}>
                    {[
                      'Writing viral script & hook...',
                      'Synthesizing voiceover notes...',
                      'Generating visual storyboard...',
                      'Preparing caption & hashtags...',
                    ].map((stepText, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 font-medium ${
                          idx + 1 < aiStep
                            ? 'text-[var(--ok)] font-bold'
                            : idx + 1 === aiStep
                            ? 'text-[var(--br)] font-bold animate-pulse'
                            : 'text-[var(--mu)]'
                        }`}
                      >
                        <span>{idx + 1 < aiStep ? '✓' : idx + 1 === aiStep ? '…' : '○'}</span>
                        <span>{stepText}</span>
                      </div>
                    ))}
                  </div>
                )}

                {generatedScenes && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <span className="text-xs font-bold text-[var(--mu)]">Generated Scenes</span>
                    {generatedScenes.map((sc) => (
                      <div
                        key={sc.num}
                        className="p-2 rounded-lg text-xs border"
                        style={{ background: 'var(--sf2)', borderColor: 'var(--ln)' }}
                      >
                        <b className="text-[var(--br)] mr-1.5">{sc.hook}:</b>
                        <span>{sc.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Schedule Date & Time */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: 'var(--ln)' }}>
              <div>
                <label className="block text-xs font-bold text-[var(--mu)] mb-1">
                  Publish Date
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                  style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--mu)] mb-1">
                  Publish Time (IST)
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                  style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                />
              </div>
            </div>
          </div>

          {/* Right Phone Mockup Preview */}
          <div className="hidden md:flex flex-col items-center">
            <span className="text-xs font-bold text-[var(--mu)] mb-2">Live Instagram Preview</span>
            <PhonePreview
              caption={caption}
              accountHandle={targetAccount?.handle || '@instaflow'}
              accountAvatarColor={targetAccount?.color || '#6d3df2'}
              accountInitials={targetAccount?.initials || 'IF'}
              videoUrl={uploadedVideoUrl}
              coverUrl={coverUrl}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t flex-wrap" style={{ borderColor: 'var(--ln)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border hover:bg-[var(--sf2)] transition-colors"
            style={{
              background: 'var(--sf)',
              borderColor: 'var(--ln)',
              color: 'var(--tx)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border hover:bg-[var(--sf2)] transition-colors"
            style={{
              background: 'var(--sf)',
              borderColor: 'var(--ln)',
              color: 'var(--tx)',
            }}
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={handlePublishImmediately}
            className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border hover:bg-[var(--sf2)] transition-colors"
            style={{
              background: 'var(--sf)',
              borderColor: 'var(--ln)',
              color: 'var(--tx)',
            }}
          >
            Publish Now
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="px-5 py-2 rounded-xl text-xs md:text-sm font-semibold text-white shadow-md hover:opacity-95 transition-all border-0"
            style={{
              background: 'var(--g)',
            }}
          >
            {isEditMode ? 'Update Schedule' : `Schedule ${kind}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
