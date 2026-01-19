import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Upload, Download } from 'lucide-react';

const BattleSimulator = () => {
  const [participantCount, setParticipantCount] = useState(100);
  const [isRunning, setIsRunning] = useState(false);
  const [playersLeft, setPlayersLeft] = useState(0);
  const [winner, setWinner] = useState(null);
  const [followerData, setFollowerData] = useState(null);
  const [loadedImages, setLoadedImages] = useState({});
  const loadedImagesRef = useRef({});
  const [enableTop5Reset, setEnableTop5Reset] = useState(false);
  const enableTop5ResetRef = useRef(false);
  const [enableExtras, setEnableExtras] = useState(true);
  const enableExtrasRef = useRef(true);
  const hasResetRef = useRef(false);
  const resetCountdownRef = useRef(0);
  const eliminationOrderRef = useRef([]); // Track order of elimination for scoring
  const powerUpsRef = useRef([]); // ETH power-ups for final 2
  const hasSpawnedPowerUpsRef = useRef(false); // Track if power-ups have spawned
  
  // Tank cannon state
  const tankRef = useRef(null);
  const hasTankFiredRef = useRef(false);
  
  // Winner celebration animation
  const winnerAnimationRef = useRef(null);
  const confettiRef = useRef([]);
  const winnerStartTimeRef = useRef(null);
  
  // Victory path tracking
  const pathTrackingRef = useRef({}); // { odile: [{x, y}, ...], ... }
  const killTrackingRef = useRef({}); // { odile: [{x, y, victim}, ...], ... }
  const [showVictoryPath, setShowVictoryPath] = useState(false);
  const [victoryPathStyle, setVictoryPathStyle] = useState('detailed'); // 'clean' or 'detailed'
  const victoryPathCanvasRef = useRef(null);
  
  // Fixed frame settings
  const battleNumber = 1;
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const participantsRef = useRef([]);
  const frameCountRef = useRef(0);
  const isRunningRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [videoBlob, setVideoBlob] = useState(null);

  // Mobile-friendly input options
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Canvas dimensions with frame
  const FRAME_WIDTH = 1080;
  const FRAME_HEIGHT = 1080;
  const ARENA_SIZE = 850;
  const ARENA_X = (FRAME_WIDTH - ARENA_SIZE) / 2;
  const ARENA_Y = 120;
  const CANVAS_SIZE = ARENA_SIZE;
  
  const BASE_HP = 100;
  const BASE_SPEED = 3.8;
  
  // Draw the branded frame around the arena
  const drawFrame = (ctx) => {
    // Dark gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, FRAME_HEIGHT);
    bgGrad.addColorStop(0, '#1a1a1a');
    bgGrad.addColorStop(0.5, '#0d0d0d');
    bgGrad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);

    // Subtle noise texture effect
    ctx.fillStyle = 'rgba(255,255,255,0.015)';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * FRAME_WIDTH;
      const y = Math.random() * FRAME_HEIGHT;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Top header - Battle number + follower count (left), Title (right)
    const followerCount = followerData?.followers?.length || 0;
    ctx.fillStyle = '#888888';
    ctx.font = '600 32px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const battleText = `BATTLE #${String(battleNumber).padStart(3, '0')}`;
    ctx.fillText(battleText, ARENA_X, 70);
    
    // Follower count right after battle number - SAME SIZE
    const battleTextWidth = ctx.measureText(battleText).width;
    ctx.fillStyle = '#888888';
    ctx.font = '600 32px Arial, sans-serif';
    ctx.fillText(`  •  ${followerCount.toLocaleString()} FOLLOWERS`, ARENA_X + battleTextWidth, 70);

    // Title (right) - PFP WAR (no S), larger
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 42px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('PFP WAR', ARENA_X + ARENA_SIZE, 70);

    // Arena border - thin grey border
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;
    ctx.strokeRect(ARENA_X - 1, ARENA_Y - 1, ARENA_SIZE + 2, ARENA_SIZE + 2);

    // Bottom CTA - edge to edge across arena
    const ctaY = ARENA_Y + ARENA_SIZE + 60;
    const part1 = 'FOLLOW ';
    const part2 = '@PFPWAR';
    const part3 = ' TO JOIN TOMORROW';
    
    // Calculate font size to span arena width
    ctx.font = '600 40px Arial, sans-serif';
    const part1Width = ctx.measureText(part1).width;
    const part2Width = ctx.measureText(part2).width;
    const part3Width = ctx.measureText(part3).width;
    const totalWidth = part1Width + part2Width + part3Width;
    
    const scale = ARENA_SIZE / totalWidth;
    const fontSize = Math.floor(40 * scale);
    
    ctx.font = `600 ${fontSize}px Arial, sans-serif`;
    const scaledPart1Width = ctx.measureText(part1).width;
    const scaledPart2Width = ctx.measureText(part2).width;
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#888888';
    ctx.fillText(part1, ARENA_X, ctaY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(part2, ARENA_X + scaledPart1Width, ctaY);
    ctx.fillStyle = '#888888';
    ctx.fillText(part3, ARENA_X + scaledPart1Width + scaledPart2Width, ctaY);

    // Subtle vignette
    const vignetteGrad = ctx.createRadialGradient(
      FRAME_WIDTH / 2, FRAME_HEIGHT / 2, FRAME_HEIGHT * 0.3,
      FRAME_WIDTH / 2, FRAME_HEIGHT / 2, FRAME_HEIGHT * 0.7
    );
    vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
  };

  // Fun emojis for participants
  const EMOJIS = [
    '😀', '😎', '🤠', '🥳', '😈', '👻', '💀', '🤖', '👽', '🎃',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
    '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
    '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
    '🐌', '🐞', '🐜', '🦟', '🐢', '🐍', '🦎', '🐙', '🦑', '🦀',
    '🐡', '🐠', '🐟', '🐬', '🐳', '🦈', '🐊', '🐅', '🐆', '🦓',
    '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🦒', '🦘', '🐃', '🐂',
    '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩',
    '🦮', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🐇', '🦝',
    '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🦔', '🌵', '🎄',
    '🌲', '🌳', '🌴', '🪴', '🌱', '🌿', '☘️', '🍀', '🎍', '🪺',
    '🍄', '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻',
    '🔥', '⭐', '🌟', '✨', '💫', '🌈', '☀️', '🌙', '💧', '❄️',
    '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑',
    '🥝', '🍅', '🥑', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠',
    '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🏸', '🥊',
    '💎', '🔮', '🎪', '🎨', '🎭', '🎯', '🎲', '🧩', '🪄', '🗡️'
  ];

  // Get random emoji
  const getRandomEmoji = () => {
    return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  };

  // IndexedDB for storing large follower data (localStorage has 5MB limit)
  const DB_NAME = 'BattleSimulatorDB';
  const STORE_NAME = 'followerData';
  
  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  };
  
  const saveFollowerData = async (data) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(data, 'current');
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      console.log('💾 Saved follower data to IndexedDB');
    } catch (err) {
      console.warn('Failed to save to IndexedDB:', err);
    }
  };
  
  const loadFollowerData = async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get('current');
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('Failed to load from IndexedDB:', err);
      return null;
    }
  };

  // Load saved follower data on mount
  useEffect(() => {
    const loadSaved = async () => {
      const saved = await loadFollowerData();
      if (saved) {
        console.log('📂 Found saved follower data, loading...');
        await processFollowerData(saved);
      }
    };
    loadSaved();
  }, []);
  
  // Process follower data (used by both upload and load from DB)
  const processFollowerData = async (data) => {
    console.log(`📊 Processing: ${data.followers.length} followers`);
    
    setFollowerData(data);
    setParticipantCount(data.followers.length);
    
    // Load ALL images from base64 data OR URLs and pre-render to circular canvases
    console.log('🖼️ Loading and pre-rendering profile images...');
    const images = {};
    let loaded = 0;
    
    const loadPromises = data.followers.map((follower) => {
      return new Promise((resolve) => {
        // Try base64 first, then fall back to URL
        const imgSrc = follower.pfpBase64 || follower.pfpUrl;
        
        if (imgSrc) {
          const img = new Image();
          img.crossOrigin = 'anonymous'; // Enable CORS for URL images
          img.onload = () => {
            // Pre-render to circular canvas for faster drawing
            const size = 128; // Fixed size for pre-render
            
            // Color version
            const colorCanvas = document.createElement('canvas');
            colorCanvas.width = size;
            colorCanvas.height = size;
            const colorCtx = colorCanvas.getContext('2d');
            colorCtx.beginPath();
            colorCtx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
            colorCtx.clip();
            colorCtx.drawImage(img, 0, 0, size, size);
            
            // Grayscale version
            const grayCanvas = document.createElement('canvas');
            grayCanvas.width = size;
            grayCanvas.height = size;
            const grayCtx = grayCanvas.getContext('2d');
            grayCtx.beginPath();
            grayCtx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
            grayCtx.clip();
            grayCtx.drawImage(img, 0, 0, size, size);
            // Apply grayscale
            try {
              const imageData = grayCtx.getImageData(0, 0, size, size);
              const pixels = imageData.data;
              for (let i = 0; i < pixels.length; i += 4) {
                const gray = pixels[i] * 0.299 + pixels[i+1] * 0.587 + pixels[i+2] * 0.114;
                pixels[i] = gray;
                pixels[i+1] = gray;
                pixels[i+2] = gray;
              }
              grayCtx.putImageData(imageData, 0, 0);
            } catch (e) {
              // CORS may block getImageData, use color as fallback for gray
              console.log(`⚠️ CORS blocked grayscale for ${follower.username}, using color`);
            }
            
            images[follower.username] = {
              color: colorCanvas,
              gray: grayCanvas,
              complete: true
            };
            loaded++;
            resolve();
          };
          img.onerror = () => {
            console.log(`❌ Failed to load image for ${follower.username}`);
            resolve();
          };
          img.src = imgSrc;
        } else {
          resolve();
        }
      });
    });
    
    await Promise.all(loadPromises);
    
    console.log(`✅ Pre-rendered ${loaded} profile images`);
    setLoadedImages(images);
    loadedImagesRef.current = images;
    
    // Small delay to ensure state is updated, then create participants
    setTimeout(() => {
      // Note: createParticipants reads from followerData state which may not be updated yet
      // So we create participants directly here using the data we have
      const shuffled = shuffleArray(data.followers);
      const randomIds = shuffleArray(Array.from({length: shuffled.length}, (_, i) => i));
      
      participantsRef.current = shuffled.map((follower, i) => ({
        id: randomIds[i],
        name: `@${follower.username}`,
        username: follower.username,
        displayName: follower.displayName,
        pfpUrl: follower.pfpUrl,
        x: 25 + Math.random() * (CANVAS_SIZE - 50),
        y: 60 + Math.random() * (CANVAS_SIZE - 85),
        vx: Math.cos(Math.random() * Math.PI * 2) * BASE_SPEED,
        vy: Math.sin(Math.random() * Math.PI * 2) * BASE_SPEED,
        health: BASE_HP,
        maxHealth: BASE_HP,
        alive: true,
        color: `hsl(${(randomIds[i] * 137.508) % 360}, 70%, 60%)`,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        size: 5,
        lastHitTime: 0,
        lastHitBy: null
      }));
      
      setPlayersLeft(participantsRef.current.length);
      drawInitialGrid();
      console.log(`✅ Created ${participantsRef.current.length} participants`);
    }, 100);
  };

  // Handle follower JSON upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }
    
    try {
      console.log('📁 File selected:', file.name, 'Size:', file.size);
      const text = await file.text();
      console.log('📄 File read, parsing JSON...');
      const data = JSON.parse(text);
      console.log('✅ JSON parsed:', data.totalFollowers || data.followers?.length, 'followers');
      
      // Save to IndexedDB for persistence
      await saveFollowerData(data);
      console.log('💾 Saved to IndexedDB');
      
      // Process the data
      await processFollowerData(data);
      console.log('✅ Processing complete!');
      
    } catch (err) {
      console.error('❌ Failed to load follower data:', err);
      alert('Failed to load file: ' + err.message);
    }
  };

  // Handle pasted JSON text
  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) {
      alert('Please paste JSON data first');
      return;
    }
    try {
      const data = JSON.parse(pasteText);
      if (!data.followers || !Array.isArray(data.followers)) {
        throw new Error('Invalid format: missing followers array');
      }
      await saveFollowerData(data);
      await processFollowerData(data);
      setShowPasteModal(false);
      setPasteText('');
    } catch (err) {
      alert('Invalid JSON: ' + err.message);
    }
  };

  // Load from URL (supports ?data=URL parameter)
  const loadFromUrl = async (url) => {
    setIsLoadingUrl(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      if (!data.followers || !Array.isArray(data.followers)) {
        throw new Error('Invalid format: missing followers array');
      }
      await saveFollowerData(data);
      await processFollowerData(data);
    } catch (err) {
      console.error('Failed to load from URL:', err);
      alert('Failed to load from URL: ' + err.message);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // Generate demo battle data
  const generateDemoData = async () => {
    const demoNames = [
      'cryptowhale', 'moonshot_mike', 'degen_queen', 'nft_collector', 'eth_maxi',
      'btc_believer', 'sol_soldier', 'ape_holder', 'punk_owner', 'bayc_gang',
      'defi_degen', 'yield_farmer', 'liquidity_hunter', 'gas_optimizer', 'mev_searcher',
      'alpha_caller', 'ct_influencer', 'thread_guy', 'ratio_king', 'quote_tweet',
      'gm_poster', 'wagmi_warrior', 'ngmi_avoider', 'fud_fighter', 'hopium_dealer',
      'diamond_hands', 'paper_hands', 'whale_watcher', 'rug_detector', 'scam_hunter',
      'airdrop_farmer', 'testnet_grinder', 'bridge_user', 'chain_hopper', 'l2_maxi',
      'rollup_fan', 'zk_believer', 'privacy_chad', 'anon_trader', 'doxxed_dev',
      'community_mod', 'discord_admin', 'telegram_og', 'signal_group', 'alpha_chat',
      'nft_flipper', 'art_collector', 'pfp_enjoyer', 'metaverse_explorer', 'land_owner'
    ];

    const followers = demoNames.map((name, i) => ({
      username: name,
      displayName: name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      pfpUrl: null,
      pfpBase64: null
    }));

    const demoData = {
      account: 'demo_battle',
      totalFollowers: followers.length,
      followers: followers
    };

    await processFollowerData(demoData);
    console.log('🎮 Demo battle loaded with', followers.length, 'participants');
  };

  // Check for URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataUrl = params.get('data');
    if (dataUrl) {
      loadFromUrl(dataUrl);
    }
  }, []);

  // Handle audio file upload
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Keep refs in sync with state
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    enableTop5ResetRef.current = enableTop5Reset;
  }, [enableTop5Reset]);

  useEffect(() => {
    enableExtrasRef.current = enableExtras;
  }, [enableExtras]);

  useEffect(() => {
    loadedImagesRef.current = loadedImages;
    
    // When images change, redraw the initial grid if not running
    if (Object.keys(loadedImages).length > 0 && !isRunning && canvasRef.current) {
      // Small delay to ensure everything is ready
      setTimeout(() => {
        // Only draw grid if participants already exist - don't create new ones here
        if (participantsRef.current.length > 0) {
          drawInitialGrid();
        }
      }, 300);
    }
  }, [loadedImages]);

  // Generate unique color for each participant
  const generateColor = (id) => {
    const hue = (id * 137.508) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  // Proper Fisher-Yates shuffle for true randomness
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Draw ETH diamond logo
  const drawETHLogo = (ctx, x, y, size) => {
    const scale = size / 40; // Base size is 40
    
    ctx.save();
    ctx.translate(x, y);
    
    // Top half - upper diamond
    // Left side (darker)
    ctx.beginPath();
    ctx.moveTo(0, -20 * scale);
    ctx.lineTo(-12 * scale, 0);
    ctx.lineTo(0, -5 * scale);
    ctx.closePath();
    ctx.fillStyle = '#6B7DB3';
    ctx.fill();
    
    // Right side (lighter)
    ctx.beginPath();
    ctx.moveTo(0, -20 * scale);
    ctx.lineTo(12 * scale, 0);
    ctx.lineTo(0, -5 * scale);
    ctx.closePath();
    ctx.fillStyle = '#8A9DC9';
    ctx.fill();
    
    // Middle section (darkest)
    ctx.beginPath();
    ctx.moveTo(-12 * scale, 0);
    ctx.lineTo(0, -5 * scale);
    ctx.lineTo(12 * scale, 0);
    ctx.lineTo(0, 3 * scale);
    ctx.closePath();
    ctx.fillStyle = '#454A75';
    ctx.fill();
    
    // Bottom half - lower diamond
    // Left side
    ctx.beginPath();
    ctx.moveTo(0, 20 * scale);
    ctx.lineTo(-12 * scale, 0);
    ctx.lineTo(0, 3 * scale);
    ctx.closePath();
    ctx.fillStyle = '#6B7DB3';
    ctx.fill();
    
    // Right side (lighter)
    ctx.beginPath();
    ctx.moveTo(0, 20 * scale);
    ctx.lineTo(12 * scale, 0);
    ctx.lineTo(0, 3 * scale);
    ctx.closePath();
    ctx.fillStyle = '#8A9DC9';
    ctx.fill();
    
    ctx.restore();
  };

  // Draw Pepe the Frog
  const drawPepe = (ctx, x, y, scale = 1, lookAngle = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    // Head/face - main green shape (brighter green like reference)
    ctx.beginPath();
    ctx.ellipse(0, 2, 30, 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#3B8526'; // Bright Pepe green
    ctx.fill();
    ctx.strokeStyle = '#2D6B1E';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Chin/jaw area - slightly lighter
    ctx.beginPath();
    ctx.ellipse(0, 12, 22, 14, 0, 0, Math.PI);
    ctx.fillStyle = '#3B8526';
    ctx.fill();
    
    // Brow ridge - the iconic furrowed brow
    ctx.beginPath();
    ctx.moveTo(-28, -8);
    ctx.quadraticCurveTo(-14, -18, 0, -12);
    ctx.quadraticCurveTo(14, -18, 28, -8);
    ctx.lineTo(28, -4);
    ctx.quadraticCurveTo(14, -10, 0, -6);
    ctx.quadraticCurveTo(-14, -10, -28, -4);
    ctx.closePath();
    ctx.fillStyle = '#3B8526';
    ctx.fill();
    
    // Eye sockets (darker green behind eyes)
    ctx.fillStyle = '#2D6B1E';
    ctx.beginPath();
    ctx.ellipse(-12, -2, 12, 10, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(12, -2, 12, 10, -0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye whites - the distinctive Pepe eye shape
    // Left eye
    ctx.beginPath();
    ctx.ellipse(-12, -2, 10, 9, 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Right eye
    ctx.beginPath();
    ctx.ellipse(12, -2, 10, 9, -0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.stroke();
    
    // Pupils - looking towards target
    const pupilOffsetX = Math.cos(lookAngle) * 3;
    const pupilOffsetY = Math.sin(lookAngle) * 2;
    
    // Left pupil (black, oval)
    ctx.beginPath();
    ctx.ellipse(-12 + pupilOffsetX, -1 + pupilOffsetY, 5, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    // Right pupil
    ctx.beginPath();
    ctx.ellipse(12 + pupilOffsetX, -1 + pupilOffsetY, 5, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    // Eye reflections (the iconic double reflection)
    // Left eye reflections
    ctx.beginPath();
    ctx.arc(-13 + pupilOffsetX, -4 + pupilOffsetY, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-11 + pupilOffsetX, -1 + pupilOffsetY, 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Right eye reflections
    ctx.beginPath();
    ctx.arc(11 + pupilOffsetX, -4 + pupilOffsetY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(13 + pupilOffsetX, -1 + pupilOffsetY, 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Heavy eyelids (drooping from top) - key Pepe feature
    ctx.beginPath();
    ctx.moveTo(-24, -6);
    ctx.quadraticCurveTo(-12, 2, -2, -4);
    ctx.lineTo(-2, -12);
    ctx.quadraticCurveTo(-12, -8, -24, -12);
    ctx.closePath();
    ctx.fillStyle = '#3B8526';
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(24, -6);
    ctx.quadraticCurveTo(12, 2, 2, -4);
    ctx.lineTo(2, -12);
    ctx.quadraticCurveTo(12, -8, 24, -12);
    ctx.closePath();
    ctx.fillStyle = '#3B8526';
    ctx.fill();
    
    // Mouth area - the frown
    // Upper lip (red/orange)
    ctx.beginPath();
    ctx.moveTo(-20, 14);
    ctx.quadraticCurveTo(-10, 12, 0, 13);
    ctx.quadraticCurveTo(10, 12, 20, 14);
    ctx.quadraticCurveTo(10, 18, 0, 19);
    ctx.quadraticCurveTo(-10, 18, -20, 14);
    ctx.closePath();
    ctx.fillStyle = '#C65D3B'; // Red-orange lips
    ctx.fill();
    ctx.strokeStyle = '#8B4028';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Lower lip
    ctx.beginPath();
    ctx.moveTo(-18, 18);
    ctx.quadraticCurveTo(0, 24, 18, 18);
    ctx.quadraticCurveTo(0, 22, -18, 18);
    ctx.closePath();
    ctx.fillStyle = '#C65D3B';
    ctx.fill();
    
    // Mouth line (the frown)
    ctx.beginPath();
    ctx.moveTo(-16, 15);
    ctx.quadraticCurveTo(0, 17, 16, 15);
    ctx.strokeStyle = '#5C3325';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Nose hint (small nostril)
    ctx.beginPath();
    ctx.ellipse(-5, 10, 1.5, 1, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2D6B1E';
    ctx.fill();
    
    // Military helmet (tan/camo style like reference)
    ctx.beginPath();
    ctx.ellipse(0, -14, 34, 20, 0, Math.PI, Math.PI * 2);
    ctx.fillStyle = '#8B7355'; // Tan base
    ctx.fill();
    
    // Helmet front edge
    ctx.beginPath();
    ctx.moveTo(-34, -14);
    ctx.quadraticCurveTo(-30, -8, -26, -8);
    ctx.lineTo(26, -8);
    ctx.quadraticCurveTo(30, -8, 34, -14);
    ctx.strokeStyle = '#5C4A3D';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Helmet camo patches
    ctx.fillStyle = '#6B5D4D';
    ctx.beginPath();
    ctx.ellipse(-12, -22, 10, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(15, -20, 8, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Helmet band/strap
    ctx.fillStyle = '#4A4A4A';
    ctx.fillRect(-30, -16, 60, 3);
    
    // NVG mount on helmet
    ctx.fillStyle = '#3D3D3D';
    ctx.fillRect(-8, -30, 16, 10);
    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(-6, -32, 12, 6);
    
    ctx.restore();
  };

  // Draw tank cannon
  const drawTankCannon = (ctx, tank) => {
    if (!tank) return;
    
    const { angle, phase, progress, targetX, targetY, shellX, shellY, shellAngle } = tank;
    
    ctx.save();
    
    // Tank position (now mobile)
    const tankX = tank.tankX || CANVAS_SIZE / 2;
    const tankY = tank.tankY || CANVAS_SIZE - 30;
    
    // Draw tank body
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(tankX - 50, tankY - 15, 100, 30);
    
    // Tank treads
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(tankX - 55, tankY + 10, 110, 12);
    ctx.fillRect(tankX - 55, tankY - 22, 110, 8);
    
    // Tread details
    ctx.fillStyle = '#333';
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(tankX - 50 + i * 11, tankY + 11, 8, 10);
    }
    
    // Turret base
    ctx.beginPath();
    ctx.arc(tankX, tankY - 5, 28, 0, Math.PI * 2);
    ctx.fillStyle = '#3D4A3A'; // Military green to match Pepe's helmet
    ctx.fill();
    ctx.strokeStyle = '#2D3A2A';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Calculate barrel angle to target
    const barrelLength = 65;
    const barrelAngle = angle;
    
    // Draw barrel
    ctx.save();
    ctx.translate(tankX, tankY - 5);
    ctx.rotate(barrelAngle);
    
    // Barrel body
    ctx.fillStyle = '#4A5A4A';
    ctx.fillRect(0, -7, barrelLength, 14);
    
    // Barrel detail lines
    ctx.fillStyle = '#3D4A3A';
    ctx.fillRect(15, -7, 4, 14);
    ctx.fillRect(35, -7, 4, 14);
    
    // Barrel tip / muzzle brake
    ctx.fillStyle = '#2D3A2A';
    ctx.fillRect(barrelLength - 12, -9, 14, 18);
    
    // Muzzle flash during firing
    if (phase === 'firing' && progress < 0.2) {
      ctx.fillStyle = `rgba(255, 200, 50, ${1 - progress * 5})`;
      ctx.beginPath();
      ctx.moveTo(barrelLength + 2, 0);
      ctx.lineTo(barrelLength + 40, -25);
      ctx.lineTo(barrelLength + 55, 0);
      ctx.lineTo(barrelLength + 40, 25);
      ctx.closePath();
      ctx.fill();
      
      // Inner white flash
      ctx.fillStyle = `rgba(255, 255, 200, ${(1 - progress * 5) * 0.8})`;
      ctx.beginPath();
      ctx.moveTo(barrelLength + 2, 0);
      ctx.lineTo(barrelLength + 25, -12);
      ctx.lineTo(barrelLength + 35, 0);
      ctx.lineTo(barrelLength + 25, 12);
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.restore();
    
    // Draw Pepe poking out of turret hatch
    // Position him slightly behind/above the turret center
    const pepeOffsetX = -Math.cos(barrelAngle) * 15;
    const pepeOffsetY = -Math.sin(barrelAngle) * 15 - 25;
    
    // Hatch opening
    ctx.beginPath();
    ctx.ellipse(tankX + pepeOffsetX, tankY - 5 + pepeOffsetY + 20, 18, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    
    // Draw Pepe - he looks toward the target
    drawPepe(ctx, tankX + pepeOffsetX, tankY - 5 + pepeOffsetY, 0.7, barrelAngle);
    
    // Hatch lid (behind Pepe, slightly open)
    ctx.beginPath();
    ctx.ellipse(tankX + pepeOffsetX - 15, tankY - 5 + pepeOffsetY + 15, 16, 10, -0.5, 0, Math.PI);
    ctx.fillStyle = '#3D4A3A';
    ctx.fill();
    ctx.strokeStyle = '#2D3A2A';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw shell if in flight
    if (phase === 'firing' && shellX !== undefined) {
      // Use shell's current direction for trail
      const missileAngle = shellAngle !== undefined ? shellAngle : barrelAngle;
      
      // Shell trail
      const trailLength = 10;
      for (let i = 0; i < trailLength; i++) {
        const t = i / trailLength;
        const trailX = shellX - Math.cos(missileAngle) * i * 10;
        const trailY = shellY - Math.sin(missileAngle) * i * 10;
        ctx.beginPath();
        ctx.arc(trailX, trailY, 5 * (1 - t * 0.7), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 150, 50, ${0.9 * (1 - t)})`;
        ctx.fill();
      }
      
      // Shell body
      ctx.save();
      ctx.translate(shellX, shellY);
      ctx.rotate(missileAngle);
      
      // Shell shape
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffaa00';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(3, 0, 6, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffdd00';
      ctx.fill();
      
      ctx.restore();
    }
    
    // Draw explosion
    if (phase === 'exploding') {
      const explosionProgress = progress;
      const maxRadius = 90;
      const radius = maxRadius * Math.sin(explosionProgress * Math.PI);
      
      // Outer explosion
      ctx.beginPath();
      ctx.arc(targetX, targetY, radius, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(targetX, targetY, 0, targetX, targetY, radius);
      gradient.addColorStop(0, `rgba(255, 255, 200, ${0.95 * (1 - explosionProgress)})`);
      gradient.addColorStop(0.2, `rgba(255, 200, 50, ${0.9 * (1 - explosionProgress)})`);
      gradient.addColorStop(0.5, `rgba(255, 100, 20, ${0.7 * (1 - explosionProgress)})`);
      gradient.addColorStop(0.8, `rgba(200, 50, 0, ${0.5 * (1 - explosionProgress)})`);
      gradient.addColorStop(1, `rgba(50, 20, 0, ${0.2 * (1 - explosionProgress)})`);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Inner white flash
      if (explosionProgress < 0.3) {
        ctx.beginPath();
        ctx.arc(targetX, targetY, radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.3 - explosionProgress) * 3})`;
        ctx.fill();
      }
      
      // Shockwave ring
      if (explosionProgress > 0.1 && explosionProgress < 0.6) {
        const ringProgress = (explosionProgress - 0.1) / 0.5;
        ctx.beginPath();
        ctx.arc(targetX, targetY, radius * (0.8 + ringProgress * 0.4), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 200, 100, ${0.6 * (1 - ringProgress)})`;
        ctx.lineWidth = 4 * (1 - ringProgress);
        ctx.stroke();
      }
      
      // Debris particles
      for (let i = 0; i < 16; i++) {
        const particleAngle = (i / 16) * Math.PI * 2 + explosionProgress * 3;
        const particleDist = radius * (0.4 + Math.sin(i * 1.5) * 0.4);
        const px = targetX + Math.cos(particleAngle) * particleDist;
        const py = targetY + Math.sin(particleAngle) * particleDist;
        ctx.beginPath();
        ctx.arc(px, py, 3 + Math.random() * 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${80 + Math.random() * 120}, 0, ${0.9 * (1 - explosionProgress)})`;
        ctx.fill();
      }
    }
    
    // Draw targeting laser during appearing phase (just the tank, no laser yet)
    if (phase === 'appearing') {
      // Tank is visible but not tracking yet - menacing presence
      // No targeting laser during this phase
    }
    
    // Draw targeting laser during tracking phase (softer, following)
    if (phase === 'tracking') {
      const flashIntensity = 0.25 + Math.sin(Date.now() / 150) * 0.15;
      
      // Softer tracking beam
      ctx.strokeStyle = `rgba(255, 150, 0, ${flashIntensity})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.moveTo(tankX + Math.cos(barrelAngle) * barrelLength, tankY - 5 + Math.sin(barrelAngle) * barrelLength);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Tracking reticle - orange, less aggressive
      const reticleSize = 30 + Math.sin(Date.now() / 200) * 5;
      ctx.strokeStyle = `rgba(255, 150, 0, ${flashIntensity + 0.1})`;
      ctx.lineWidth = 2;
      
      // Rotating dashed circle
      ctx.save();
      ctx.translate(targetX, targetY);
      ctx.rotate(Date.now() / 500);
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, reticleSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      
      // Small crosshair
      ctx.beginPath();
      ctx.moveTo(targetX - 8, targetY);
      ctx.lineTo(targetX + 8, targetY);
      ctx.moveTo(targetX, targetY - 8);
      ctx.lineTo(targetX, targetY + 8);
      ctx.stroke();
    }
    
    // Draw targeting laser during aiming phase (locked on, aggressive)
    if (phase === 'aiming') {
      const flashIntensity = 0.4 + Math.sin(Date.now() / 80) * 0.3;
      
      // Laser beam
      ctx.strokeStyle = `rgba(255, 0, 0, ${flashIntensity})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([15, 8]);
      ctx.beginPath();
      ctx.moveTo(tankX + Math.cos(barrelAngle) * barrelLength, tankY - 5 + Math.sin(barrelAngle) * barrelLength);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Target reticle - pulsing
      const reticleSize = 25 + Math.sin(Date.now() / 120) * 8;
      ctx.strokeStyle = `rgba(255, 0, 0, ${flashIntensity + 0.2})`;
      ctx.lineWidth = 3;
      
      // Outer circle
      ctx.beginPath();
      ctx.arc(targetX, targetY, reticleSize, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner circle
      ctx.beginPath();
      ctx.arc(targetX, targetY, reticleSize * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      
      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(targetX - reticleSize - 15, targetY);
      ctx.lineTo(targetX - reticleSize * 0.5, targetY);
      ctx.moveTo(targetX + reticleSize * 0.5, targetY);
      ctx.lineTo(targetX + reticleSize + 15, targetY);
      ctx.moveTo(targetX, targetY - reticleSize - 15);
      ctx.lineTo(targetX, targetY - reticleSize * 0.5);
      ctx.moveTo(targetX, targetY + reticleSize * 0.5);
      ctx.lineTo(targetX, targetY + reticleSize + 15);
      ctx.stroke();
      
      // Corner brackets
      const bracketSize = 12;
      ctx.lineWidth = 2;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(targetX - reticleSize, targetY - reticleSize + bracketSize);
      ctx.lineTo(targetX - reticleSize, targetY - reticleSize);
      ctx.lineTo(targetX - reticleSize + bracketSize, targetY - reticleSize);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(targetX + reticleSize - bracketSize, targetY - reticleSize);
      ctx.lineTo(targetX + reticleSize, targetY - reticleSize);
      ctx.lineTo(targetX + reticleSize, targetY - reticleSize + bracketSize);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(targetX - reticleSize, targetY + reticleSize - bracketSize);
      ctx.lineTo(targetX - reticleSize, targetY + reticleSize);
      ctx.lineTo(targetX - reticleSize + bracketSize, targetY + reticleSize);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(targetX + reticleSize - bracketSize, targetY + reticleSize);
      ctx.lineTo(targetX + reticleSize, targetY + reticleSize);
      ctx.lineTo(targetX + reticleSize, targetY + reticleSize - bracketSize);
      ctx.stroke();
    }
    
    ctx.restore();
  };

  // Create participants from follower data - ALL followers, each exactly once
  const createParticipants = () => {
    if (!followerData || followerData.followers.length === 0) {
      console.log('No follower data available');
      return [];
    }
    
    const followers = shuffleArray(followerData.followers);
    const randomIds = shuffleArray(Array.from({length: followers.length}, (_, i) => i));
    
    console.log(`Creating battle with ${followers.length} followers`);
    
    const participants = followers.map((follower, i) => ({
      id: randomIds[i],
      name: `@${follower.username}`,
      username: follower.username,
      displayName: follower.displayName,
      pfpUrl: follower.pfpUrl,
      x: 25 + Math.random() * (CANVAS_SIZE - 50),
      y: 60 + Math.random() * (CANVAS_SIZE - 85),
      vx: Math.cos(Math.random() * Math.PI * 2) * BASE_SPEED,
      vy: Math.sin(Math.random() * Math.PI * 2) * BASE_SPEED,
      health: BASE_HP,
      maxHealth: BASE_HP,
      alive: true,
      color: generateColor(randomIds[i]),
      emoji: getRandomEmoji(),
      size: 5,
      lastHitTime: 0,
      lastHitBy: null
    }));
    
    return participants;
  };

  // Get dynamic size based on remaining players - MUCH BIGGER for visibility
  // People need to find themselves and share!
  const getDynamicSize = (aliveCount) => {
    if (aliveCount <= 2) return 80;      // Final 2: HUGE
    if (aliveCount <= 5) return 70;      // Final 5: very big
    if (aliveCount <= 10) return 60;     // Final 10: big and clear
    if (aliveCount <= 20) return 50;     // Top 20: easily visible
    if (aliveCount <= 50) return 38;     // Top 50: clear
    if (aliveCount <= 100) return 30;    // Top 100: good size
    if (aliveCount <= 200) return 24;    // Still recognizable
    if (aliveCount <= 400) return 18;    // Can spot yourself
    if (aliveCount <= 700) return 14;    // Small but visible
    if (aliveCount <= 1000) return 12;   // Starting size ~1200 followers
    if (aliveCount <= 1500) return 10;
    if (aliveCount <= 2000) return 9;
    if (aliveCount <= 10000) return 4;
    return 2;
  };

  // Spatial grid for efficient collision detection
  const buildSpatialGrid = (particles, cellSize) => {
    const grid = new Map();
    
    for (const p of particles) {
      const cellX = Math.floor(p.x / cellSize);
      const cellY = Math.floor(p.y / cellSize);
      const key = `${cellX},${cellY}`;
      
      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key).push(p);
    }
    
    return grid;
  };

  const getNearbyCells = (grid, x, y, cellSize) => {
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    const nearby = [];
    
    // Check 3x3 grid of cells around particle
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        if (grid.has(key)) {
          nearby.push(...grid.get(key));
        }
      }
    }
    
    return nearby;
  };

  // Game loop
  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const participants = participantsRef.current;
    const currentTime = Date.now();
    
    // Draw the branded frame first
    drawFrame(ctx);
    
    // Set up arena clipping and offset
    ctx.save();
    ctx.beginPath();
    ctx.rect(ARENA_X, ARENA_Y, ARENA_SIZE, ARENA_SIZE);
    ctx.clip();
    ctx.translate(ARENA_X, ARENA_Y);
    
    // Clear arena area (black background)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const alive = participants.filter(p => p.alive);
    const aliveCount = alive.length;
    const size = getDynamicSize(aliveCount);

    // TOP 5 RESET (if enabled)
    if (enableTop5ResetRef.current && !hasResetRef.current && aliveCount === 5) {
      hasResetRef.current = true;
      resetCountdownRef.current = 90; // Longer countdown for the animation
      
      // Log who made it to final 5
      console.log('FINAL 5 SURVIVORS:', alive.map(p => p.username));
      
      // Reset all 5 to full health and reposition
      const final10Size = 60; // Final 10 size from getDynamicSize
      alive.forEach(p => {
        p.health = p.maxHealth;
        p.lastHitTime = 0;
        p.lastHitBy = null;
        p.size = final10Size; // Survivors at full size immediately
      });
      
      // Position survivors in upper area with shuffled X positions
      const positions = shuffleArray([0, 1, 2, 3, 4]);
      alive.forEach((p, index) => {
        const posIndex = positions[index];
        const spacing = CANVAS_SIZE / 6;
        p.x = spacing * (posIndex + 1);
        p.y = CANVAS_SIZE * 0.3; // Slightly lower than before
        p.vx = 0;
        p.vy = 0;
        p.isRespawned = false;
      });
      
      // Respawn 5 random dead followers below
      const aliveUsernames = new Set(alive.map(p => p.username));
      const deadParticipants = participantsRef.current.filter(p => !p.alive && !aliveUsernames.has(p.username));
      
      console.log(`RESPAWN POOL: ${deadParticipants.length} dead participants (excluding ${aliveUsernames.size} finalists)`);
      
      // Get unique usernames from dead participants
      const uniqueDeadByUsername = [];
      const seenUsernames = new Set();
      for (const p of deadParticipants) {
        if (p.username && !seenUsernames.has(p.username)) {
          seenUsernames.add(p.username);
          uniqueDeadByUsername.push(p);
        }
      }
      
      if (uniqueDeadByUsername.length >= 5) {
        // Use proper Fisher-Yates shuffle for true randomness
        const shuffled = shuffleArray(uniqueDeadByUsername);
        const respawned = shuffled.slice(0, 5);
        
        console.log('RESPAWNED 5:', respawned.map(p => p.username));
        
        // Shuffle positions for respawned too
        const respawnPositions = shuffleArray([0, 1, 2, 3, 4]);
        respawned.forEach((p, index) => {
          const posIndex = respawnPositions[index];
          const spacing = CANVAS_SIZE / 6;
          p.alive = true;
          p.health = p.maxHealth;
          p.lastHitTime = 0;
          p.lastHitBy = null;
          p.x = spacing * (posIndex + 1);
          p.y = CANVAS_SIZE * 0.7; // Slightly higher than before
          p.vx = 0;
          p.vy = 0;
          p.isRespawned = true;
          p.respawnProgress = 0; // Start small, grow to 1
          p.size = final10Size; // Target size (used after growth animation)
        });
      }
    }
    
    // POWER-UPS: Spawn 3 ETH logos when down to final 2 (only if Extras is enabled)
    if (enableExtrasRef.current && aliveCount === 2 && !hasSpawnedPowerUpsRef.current) {
      hasSpawnedPowerUpsRef.current = true;
      powerUpsRef.current = [];
      
      // Spawn 3 ETH power-ups at random positions
      for (let i = 0; i < 3; i++) {
        powerUpsRef.current.push({
          id: i,
          x: 50 + Math.random() * (CANVAS_SIZE - 100),
          y: 80 + Math.random() * (CANVAS_SIZE - 130),
          size: 20,
          active: true,
          rotation: Math.random() * 0.3 - 0.15 // Slight random tilt
        });
      }
      console.log('💎 3 ETH POWER-UPS SPAWNED for final 2!');
    }
    
    // TANK CANNON: Appears at 10 players, fires at healthiest if no kills in 5 seconds
    if (enableExtrasRef.current && aliveCount <= 10 && aliveCount > 1) {
      // Find player with most health
      let highestHealthPlayer = alive[0];
      for (const p of alive) {
        if (p.health > highestHealthPlayer.health) {
          highestHealthPlayer = p;
        }
      }
      
      // Initialize tank if not exists
      if (!tankRef.current) {
        const tankX = CANVAS_SIZE / 2;
        const tankY = CANVAS_SIZE - 30;
        const angle = Math.atan2(highestHealthPlayer.y - (tankY - 5), highestHealthPlayer.x - tankX);
        
        tankRef.current = {
          phase: 'appearing',
          startTime: Date.now(),
          tankX: tankX, // Tank's current X position
          tankY: tankY, // Tank's Y position (fixed)
          tankVx: 0, // Tank velocity
          targetX: highestHealthPlayer.x,
          targetY: highestHealthPlayer.y,
          targetPlayer: highestHealthPlayer,
          angle: angle,
          progress: 0,
          lastKillTime: Date.now(),
          lastKillCount: aliveCount
        };
        
        console.log(`🐸 PEPE TANK APPEARING...`);
      } else if (tankRef.current.phase === 'appearing') {
        // Wait 1 second before starting to track
        const elapsed = Date.now() - tankRef.current.startTime;
        if (elapsed >= 1000) {
          tankRef.current.phase = 'tracking';
          tankRef.current.startTime = Date.now();
          tankRef.current.lastKillTime = Date.now();
          tankRef.current.lastKillCount = aliveCount;
          console.log(`🎯 PEPE TANK NOW TRACKING: @${highestHealthPlayer.username} (${Math.round(highestHealthPlayer.health)} HP)`);
        }
      } else if (tankRef.current.phase === 'tracking') {
        const tank = tankRef.current;
        
        // Check if someone was killed (player count decreased)
        if (aliveCount < tank.lastKillCount) {
          tank.lastKillTime = Date.now();
          tank.lastKillCount = aliveCount;
          console.log(`💀 Kill detected! Resetting Pepe's 5s timer...`);
        }
        
        // Update target to whoever has most health
        tank.targetPlayer = highestHealthPlayer;
        tank.targetX = highestHealthPlayer.x;
        tank.targetY = highestHealthPlayer.y;
        
        // Move tank along bottom to follow target's X position
        const targetTankX = Math.max(60, Math.min(CANVAS_SIZE - 60, highestHealthPlayer.x));
        const tankSpeed = 2.5;
        if (Math.abs(tank.tankX - targetTankX) > tankSpeed) {
          tank.tankVx = tank.tankX < targetTankX ? tankSpeed : -tankSpeed;
          tank.tankX += tank.tankVx;
        } else {
          tank.tankVx = 0;
        }
        
        // Smoothly rotate barrel towards target
        const targetAngle = Math.atan2(highestHealthPlayer.y - (tank.tankY - 5), highestHealthPlayer.x - tank.tankX);
        
        // Smooth angle interpolation
        let angleDiff = targetAngle - tank.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        tank.angle += angleDiff * 0.1;
        
        // If no kill in 5 seconds, start firing!
        const timeSinceKill = Date.now() - tank.lastKillTime;
        if (timeSinceKill >= 5000) {
          tank.phase = 'aiming';
          tank.startTime = Date.now();
          tank.progress = 0;
          console.log(`⏰ 5 SECONDS NO KILL - PEPE FIRING at @${highestHealthPlayer.username} (${Math.round(highestHealthPlayer.health)} HP)!`);
        }
      }
    }
    
    // Update tank cannon state (aiming/firing/exploding phases)
    if (tankRef.current && tankRef.current.phase !== 'tracking' && tankRef.current.phase !== 'appearing') {
      const tank = tankRef.current;
      const elapsed = Date.now() - tank.startTime;
      
      // Tank still moves during aiming
      if (tank.targetPlayer && tank.targetPlayer.alive) {
        const targetTankX = Math.max(60, Math.min(CANVAS_SIZE - 60, tank.targetPlayer.x));
        const tankSpeed = 2.5;
        if (Math.abs(tank.tankX - targetTankX) > tankSpeed) {
          tank.tankX += tank.tankX < targetTankX ? tankSpeed : -tankSpeed;
        }
      }
      
      if (tank.phase === 'aiming') {
        // Aiming phase: 1 second of locked targeting
        tank.progress = Math.min(1, elapsed / 1000);
        
        // Keep tracking target position during aiming
        if (tank.targetPlayer && tank.targetPlayer.alive) {
          tank.targetX = tank.targetPlayer.x;
          tank.targetY = tank.targetPlayer.y;
          tank.angle = Math.atan2(tank.targetY - (tank.tankY - 5), tank.targetX - tank.tankX);
        }
        
        if (tank.progress >= 1) {
          // Fire!
          tank.phase = 'firing';
          tank.startTime = Date.now();
          tank.progress = 0;
          tank.shellX = tank.tankX + Math.cos(tank.angle) * 65;
          tank.shellY = (tank.tankY - 5) + Math.sin(tank.angle) * 65;
          console.log(`💥 PEPE FIRING at @${tank.targetPlayer?.username}!`);
        }
      } else if (tank.phase === 'firing') {
        // Shell flight: heat-seeking missile
        tank.progress = Math.min(1, elapsed / 500);
        
        // Heat-seeking: always update target position to current player position
        if (tank.targetPlayer && tank.targetPlayer.alive) {
          tank.targetX = tank.targetPlayer.x;
          tank.targetY = tank.targetPlayer.y;
        }
        
        // Move shell towards current target position (heat-seeking)
        const dx = tank.targetX - tank.shellX;
        const dy = tank.targetY - tank.shellY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Missile speed - fast enough to catch up
        const missileSpeed = 25;
        if (dist > missileSpeed) {
          tank.shellX += (dx / dist) * missileSpeed;
          tank.shellY += (dy / dist) * missileSpeed;
          // Update angle for trail effect
          tank.shellAngle = Math.atan2(dy, dx);
        } else {
          // Close enough - hit!
          tank.shellX = tank.targetX;
          tank.shellY = tank.targetY;
          
          // Impact!
          tank.phase = 'exploding';
          tank.startTime = Date.now();
          tank.progress = 0;
          
          // Hit the target - remove 50% of remaining health and speed up 19%
          if (tank.targetPlayer && tank.targetPlayer.alive) {
            const oldHealth = tank.targetPlayer.health;
            tank.targetPlayer.health = tank.targetPlayer.health * 0.5;
            
            // Speed up by 19%
            const speedBoost = 1.19;
            tank.targetPlayer.vx *= speedBoost;
            tank.targetPlayer.vy *= speedBoost;
            
            console.log(`🎯 PEPE HIT @${tank.targetPlayer.username}! Health: ${Math.round(oldHealth)} → ${Math.round(tank.targetPlayer.health)}, Speed +19%`);
          }
        }
      } else if (tank.phase === 'exploding') {
        // Explosion: 0.6 seconds
        tank.progress = Math.min(1, elapsed / 600);
        
        if (tank.progress >= 1) {
          // Go back to tracking, reset kill timer
          tank.phase = 'tracking';
          tank.startTime = Date.now();
          tank.lastKillTime = Date.now();
          tank.lastKillCount = participantsRef.current.filter(p => p.alive).length;
          console.log(`🐸 PEPE RESUMING TRACKING...`);
        }
      }
    }
    
    // Remove tank when only 1 player left
    if (tankRef.current && aliveCount <= 1) {
      tankRef.current = null;
    }
    
    // If we're in countdown mode, show the respawn reveal with growth animation
    if (resetCountdownRef.current > 0) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      
      // Get all alive (should be 10 now - 5 survivors + 5 respawned)
      const currentAlive = participantsRef.current.filter(p => p.alive);
      
      // Update respawn progress for expanding animation
      let allExpanded = true;
      currentAlive.forEach(p => {
        if (p.isRespawned) {
          if (p.respawnProgress < 1) {
            p.respawnProgress = Math.min(1, p.respawnProgress + 0.018); // Slower, more dramatic
            allExpanded = false;
          }
        }
      });
      
      currentAlive.forEach(p => {
        // Respawned grow from tiny to full, survivors stay at full size
        const displaySize = p.isRespawned ? size * p.respawnProgress : size;
        
        if (displaySize < 2) return; // Don't draw if too small
        
        // Draw profile picture using pre-rendered canvas
        const imgData = p.username ? loadedImagesRef.current[p.username] : null;
        if (imgData && imgData.complete) {
          ctx.drawImage(imgData.color, p.x - displaySize, p.y - displaySize, displaySize * 2, displaySize * 2);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, displaySize, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, displaySize, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw health bar
        const barWidth = displaySize * 3;
        const barHeight = 4;
        const barX = p.x - barWidth / 2;
        const barY = p.y + displaySize + 5;
        ctx.fillStyle = '#222';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Show username
        if (p.username) {
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${Math.max(10, displaySize * 0.4)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`@${p.username}`, p.x, p.y - displaySize - 5);
        }
      });
      
      // Once all respawned are fully expanded, start the battle
      if (allExpanded) {
        // Set their size to full so no growth happens during battle
        currentAlive.forEach(p => {
          if (p.isRespawned) {
            p.size = size; // Lock in at full size
          }
          // Give everyone random velocity to start battle
          const angle = Math.random() * Math.PI * 2;
          p.vx = Math.cos(angle) * BASE_SPEED;
          p.vy = Math.sin(angle) * BASE_SPEED;
        });
        resetCountdownRef.current = 0; // End countdown, start battle
      }
      
      setPlayersLeft(currentAlive.length);
      
      // CONTINUE THE LOOP - use ref instead of state
      if (isRunningRef.current) {
        animationRef.current = requestAnimationFrame(gameLoop);
      }
      ctx.restore(); // Must restore before returning!
      return;
    }

    // Update alive count
    setPlayersLeft(aliveCount);

    // Mass culling ONLY at very high counts (50k+) - for normal battles, let them fight
    // For 1000-2000 players, they can fight naturally
    if (aliveCount > 5000) {
      const cullRate = aliveCount > 40000 ? 0.10 :
                       aliveCount > 20000 ? 0.08 :
                       aliveCount > 10000 ? 0.05 :
                       0.02;
      
      const toKill = Math.max(1, Math.ceil(aliveCount * cullRate));
      let killed = 0;
      
      // Randomly kill participants
      for (const p of alive) {
        if (killed >= toKill) break;
        if (Math.random() < 0.5) {
          p.health = 0;
          p.alive = false;
          eliminationOrderRef.current.push(p.username);
          killed++;
        }
      }
    }

    // Check for winner - but keep drawing
    if (aliveCount === 1) {
      if (!winner) {
        const winnerPlayer = alive[0];
        setWinner(winnerPlayer);
        console.log('🏆 WINNER:', winnerPlayer.username);
      }
      
      // Draw the winner in the center - BIGGER for larger arena
      const w = alive[0];
      const centerX = CANVAS_SIZE / 2;
      const centerY = CANVAS_SIZE / 2;
      const winnerSize = 100;

      // Start winner celebration animation
      if (!winnerStartTimeRef.current) {
        winnerStartTimeRef.current = Date.now();
        
        // Create falling PFPs from ALL fallen participants
        confettiRef.current = [];
        const fallen = participantsRef.current.filter(p => !p.alive);
        
        // Use ALL fallen participants
        const shuffled = shuffleArray([...fallen]);
        
        // Spread them out over time by staggering Y positions
        // More participants = more spread
        const staggerHeight = Math.min(2000, shuffled.length * 2);
        
        shuffled.forEach((p, i) => {
          const imgData = p.username ? loadedImagesRef.current[p.username] : null;
          confettiRef.current.push({
            x: Math.random() * CANVAS_SIZE,
            y: -30 - Math.random() * staggerHeight, // Stagger based on count
            vx: (Math.random() - 0.5) * 1.5,
            vy: Math.random() * 2.0 + 1.5, // Faster fall so they all get through
            size: 16 + Math.random() * 8, // 16-24px
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 3,
            imgData: imgData,
            color: p.color
          });
        });
      }
      
      const elapsed = Date.now() - winnerStartTimeRef.current;
      const pfpFallDuration = 4000; // PFPs fall for 4 seconds
      const totalDuration = 6000; // Total animation 6 seconds
      
      // Clear arena
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      
      // Only show falling PFPs during first phase
      if (elapsed < pfpFallDuration) {
        // Update and draw falling PFPs
        confettiRef.current.forEach(c => {
          c.x += c.vx;
          c.y += c.vy;
          c.vy += 0.05; // Gravity
          c.rotation += c.rotationSpeed;
          
          // Wrap horizontally
          if (c.x < -c.size) c.x = CANVAS_SIZE + c.size;
          if (c.x > CANVAS_SIZE + c.size) c.x = -c.size;
          
          // Only draw if on screen
          if (c.y > -c.size && c.y < CANVAS_SIZE + c.size) {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rotation * Math.PI / 180);
            
            // Draw PFP using pre-rendered canvas
            if (c.imgData && c.imgData.complete) {
              ctx.drawImage(c.imgData.color, -c.size, -c.size, c.size * 2, c.size * 2);
            } else {
              // Fallback to colored circle
              ctx.beginPath();
              ctx.arc(0, 0, c.size, 0, Math.PI * 2);
              ctx.fillStyle = c.color;
              ctx.fill();
            }
            
            ctx.restore();
          }
        });
      }
      
      // Pulsing glow effect
      const pulse = Math.sin(elapsed / 150) * 0.3 + 0.7;
      const glowSize = winnerSize + 20 + Math.sin(elapsed / 200) * 10;
      
      // Outer glow rings
      for (let i = 3; i >= 0; i--) {
        const ringSize = glowSize + i * 15;
        const alpha = (0.3 - i * 0.07) * pulse;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 204, 0, ${alpha})`;
        ctx.fill();
      }
      
      // Winner circle with golden border
      ctx.beginPath();
      ctx.arc(centerX, centerY, winnerSize, 0, Math.PI * 2);
      ctx.fillStyle = w.color;
      ctx.fill();
      
      // Profile picture
      const winnerImgData = w.username ? loadedImagesRef.current[w.username] : null;
      if (winnerImgData && winnerImgData.complete) {
        ctx.drawImage(winnerImgData.color, centerX - winnerSize, centerY - winnerSize, winnerSize * 2, winnerSize * 2);
      } else {
        ctx.font = '80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(w.emoji, centerX, centerY);
      }
      
      // Animated golden border
      ctx.beginPath();
      ctx.arc(centerX, centerY, winnerSize, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 204, 0, ${pulse})`;
      ctx.lineWidth = 6 + Math.sin(elapsed / 100) * 2;
      ctx.stroke();
      
      // Bouncing crown
      const crownBounce = Math.abs(Math.sin(elapsed / 300)) * 15;
      ctx.font = 'bold 70px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👑', centerX, centerY - 130 - crownBounce);
      
      // Sparkles around winner
      for (let i = 0; i < 8; i++) {
        const angle = (elapsed / 1000 + i * Math.PI / 4) % (Math.PI * 2);
        const sparkleX = centerX + Math.cos(angle) * (winnerSize + 50);
        const sparkleY = centerY + Math.sin(angle) * (winnerSize + 50);
        const sparkleSize = 10 + Math.sin(elapsed / 100 + i) * 5;
        ctx.font = `${sparkleSize}px Arial`;
        ctx.fillText('✨', sparkleX, sparkleY);
      }
      
      // Winner text with scale animation
      const textScale = Math.min(1, elapsed / 500); // Scale up over 0.5s
      ctx.fillStyle = '#ffcc00';
      ctx.font = `bold ${36 * textScale}px Arial`;
      ctx.fillText('WINNER!', centerX, centerY + 130);
      ctx.font = `bold ${28 * textScale}px Arial`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${w.name}`, centerX, centerY + 170);
      
      // Restore context
      ctx.restore();
      
      // Continue animation loop for celebration duration
      if (elapsed < totalDuration) {
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      // Auto-stop recording after celebration
      if (mediaRecorderRef.current && isRecordingRef.current) {
        setTimeout(() => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
          }
        }, 500);
      }
      
      // Stop running
      setIsRunning(false);
      isRunningRef.current = false;
      return;
    }

    if (aliveCount === 0) {
      ctx.restore();
      setIsRunning(false);
      isRunningRef.current = false;
      return;
    }

    // Dynamic speed based on player count
    // Scales based on percentage to maintain similar pacing regardless of follower count
    const getGameSpeed = (count, total) => {
      // Calculate percentage remaining
      const pctRemaining = count / total;

      // Final stages - fixed speeds
      if (count <= 2) return 1.2;
      if (count <= 5) return 1.0;
      if (count <= 10) return 0.85;
      if (count <= 20) return 0.7;

      // Scale based on percentage - keep it consistent, don't speed up in middle
      if (pctRemaining > 0.9) return 0.3;       // Start: very calm
      if (pctRemaining > 0.8) return 0.3;       // 80-90%: same
      if (pctRemaining > 0.6) return 0.32;      // 60-80%: barely faster
      if (pctRemaining > 0.4) return 0.32;      // 40-60%: same
      if (pctRemaining > 0.2) return 0.35;      // 20-40%: slight increase
      if (pctRemaining > 0.1) return 0.4;       // 10-20%
      return 0.5;                                // Under 10% (but above 20 players)
    };
    
    const gameSpeed = getGameSpeed(aliveCount, participantsRef.current.length);

    // Shuffle alive array to randomize processing order each frame
    // This prevents any bias from iteration order
    const shuffledAlive = shuffleArray([...alive]);

    // Update positions
    shuffledAlive.forEach(p => {
      // Smooth size transition - interpolate towards target size
      const targetSize = size;
      if (!p.size) p.size = targetSize; // Initialize if not set
      
      // Smoothly grow/shrink towards target (0.08 = 8% per frame, faster growth)
      const sizeDiff = targetSize - p.size;
      p.size += sizeDiff * 0.08;
      
      // Use current interpolated size for physics
      const currentSize = p.size;
      
      p.x += p.vx * gameSpeed;
      p.y += p.vy * gameSpeed;

      // Track positions for victory path (sample every 5 frames to save memory)
      if (frameCountRef.current % 5 === 0 && p.username) {
        if (!pathTrackingRef.current[p.username]) {
          pathTrackingRef.current[p.username] = [];
        }
        pathTrackingRef.current[p.username].push({ x: p.x, y: p.y });
      }

      // Wall bounces
      if (p.x - currentSize < 0) {
        p.x = currentSize;
        p.vx = Math.abs(p.vx);
      } else if (p.x + currentSize > CANVAS_SIZE) {
        p.x = CANVAS_SIZE - currentSize;
        p.vx = -Math.abs(p.vx);
      }

      if (p.y - currentSize < 0) {
        p.y = currentSize;
        p.vy = Math.abs(p.vy);
      } else if (p.y + currentSize > CANVAS_SIZE) {
        p.y = CANVAS_SIZE - currentSize;
        p.vy = -Math.abs(p.vy);
      }
      
      // Safe zone around "Players Left" text at top center
      const textZoneLeft = CANVAS_SIZE / 2 - 180;
      const textZoneRight = CANVAS_SIZE / 2 + 180;
      const textZoneBottom = 55;
      
      if (p.y - size < textZoneBottom && p.x > textZoneLeft && p.x < textZoneRight) {
        p.y = textZoneBottom + size;
        p.vy = Math.abs(p.vy);
      }
      
      // Safe zone around tank when it's active (follows tank position)
      if (tankRef.current) {
        const tankX = tankRef.current.tankX || CANVAS_SIZE / 2;
        const tankY = tankRef.current.tankY || CANVAS_SIZE - 30;
        const tankZoneWidth = 80;  // Half-width of protected area
        const tankZoneHeight = 70; // Height of protected area from bottom
        
        const tankLeft = tankX - tankZoneWidth;
        const tankRight = tankX + tankZoneWidth;
        const tankTop = CANVAS_SIZE - tankZoneHeight;
        
        // Check if player is in tank zone
        if (p.x > tankLeft - size && p.x < tankRight + size && p.y > tankTop - size) {
          // Push player out of tank zone
          const centerX = tankX;
          const centerY = tankTop - 20;
          
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 0) {
            // Push away from tank center
            const pushStrength = 5;
            p.x += (dx / dist) * pushStrength;
            p.y += (dy / dist) * pushStrength;
            
            // Bounce velocity away
            if (Math.abs(dx) > Math.abs(dy)) {
              p.vx = dx > 0 ? Math.abs(p.vx) : -Math.abs(p.vx);
            } else {
              p.vy = -Math.abs(p.vy); // Push up
            }
          }
          
          // Hard clamp to stay above tank zone
          if (p.y + size > tankTop) {
            p.y = tankTop - size;
            p.vy = -Math.abs(p.vy);
          }
        }
      }
    });

    // Collision detection and combat using spatial grid
    // Skip frames aggressively at high counts for smooth animation
    frameCountRef.current++;
    const skipCollisions = aliveCount > 2000 ? (frameCountRef.current % 3 !== 0) :
                           aliveCount > 1500 ? (frameCountRef.current % 2 !== 0) :
                           aliveCount > 1000 ? (frameCountRef.current % 2 !== 0) : false;
    
    if (!skipCollisions) {
      const cellSize = Math.max(size * 4, 8);
      const grid = buildSpatialGrid(shuffledAlive, cellSize);
      const checkedPairs = new Set();

    for (const p1 of shuffledAlive) {
      const nearby = getNearbyCells(grid, p1.x, p1.y, cellSize);
      
      for (const p2 of nearby) {
        if (p1.id === p2.id) continue; // Skip self
        
        // Use sorted IDs for pair key to avoid checking same pair twice
        const [lowId, highId] = p1.id < p2.id ? [p1.id, p2.id] : [p2.id, p1.id];
        const pairKey = `${lowId}-${highId}`;
        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);
        
        // FAIRNESS: Randomly assign which is "first" and "second" to remove any ordering bias
        let first, second;
        if (Math.random() < 0.5) {
          first = p1;
          second = p2;
        } else {
          first = p2;
          second = p1;
        }

        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = first.size + second.size;

        if (dist < minDist && dist > 0) {
          // Check hit cooldown - can't hit same opponent within 300ms
          const canFirstHitSecond = !first.lastHitBy || first.lastHitBy !== second.id || (currentTime - first.lastHitTime) > 300;
          const canSecondHitFirst = !second.lastHitBy || second.lastHitBy !== first.id || (currentTime - second.lastHitTime) > 300;
          
          if (!canFirstHitSecond && !canSecondHitFirst) {
            // Both on cooldown, just separate and bounce hard
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            // Strong separation
            first.x -= nx * (overlap * 0.5 + 3);
            first.y -= ny * (overlap * 0.5 + 3);
            second.x += nx * (overlap * 0.5 + 3);
            second.y += ny * (overlap * 0.5 + 3);
            
            // Bounce velocities
            first.vx -= nx * 2;
            first.vy -= ny * 2;
            second.vx += nx * 2;
            second.vy += ny * 2;
            continue;
          }
          
          // Separate them first to prevent overlap
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          first.x -= nx * overlap * 0.5;
          first.y -= ny * overlap * 0.5;
          second.x += nx * overlap * 0.5;
          second.y += ny * overlap * 0.5;
          
          // In final 10, collisions boost speed to create more action
          if (aliveCount <= 10) {
            const speedBoost = 1.15;
            first.vx *= speedBoost;
            first.vy *= speedBoost;
            second.vx *= speedBoost;
            second.vy *= speedBoost;
            
            // Cap max speed so it doesn't get crazy
            const maxSpeed = BASE_SPEED * 3;
            const s1 = Math.sqrt(first.vx * first.vx + first.vy * first.vy);
            const s2 = Math.sqrt(second.vx * second.vx + second.vy * second.vy);
            if (s1 > maxSpeed) {
              first.vx = (first.vx / s1) * maxSpeed;
              first.vy = (first.vy / s1) * maxSpeed;
            }
            if (s2 > maxSpeed) {
              second.vx = (second.vx / s2) * maxSpeed;
              second.vy = (second.vy / s2) * maxSpeed;
            }
          }

          // Determine attacker based on speed
          const speed1 = Math.sqrt(first.vx * first.vx + first.vy * first.vy);
          const speed2 = Math.sqrt(second.vx * second.vx + second.vy * second.vy);

          let attacker, defender;
          
          // Need 35% speed advantage to be clear attacker
          if (speed1 > speed2 * 1.35) {
            attacker = first;
            defender = second;
          } else if (speed2 > speed1 * 1.35) {
            attacker = second;
            defender = first;
          } else {
            // Similar speeds - glancing blow
            const pctRemaining = aliveCount / participantsRef.current.length;
            let grazeMult;
            
            // Final stages - fixed multipliers
            if (aliveCount <= 2) grazeMult = 1.1;
            else if (aliveCount <= 5) grazeMult = 1.05;
            else if (aliveCount <= 10) grazeMult = 1.0;
            else if (aliveCount <= 20) grazeMult = 0.95;
            else if (pctRemaining > 0.9) grazeMult = 1.2;
            else if (pctRemaining > 0.8) grazeMult = 1.15;
            else if (pctRemaining > 0.6) grazeMult = 1.1;
            else if (pctRemaining > 0.4) grazeMult = 1.05;
            else if (pctRemaining > 0.2) grazeMult = 1.0;
            else grazeMult = 0.95;
            
            // After respawn, increase damage for faster finale
            if (hasResetRef.current) {
              grazeMult *= 1.25;
            }
            
            const grazeDamage = 1.5 * grazeMult;
            
            // Check if both would die from this glancing blow
            if (first.health <= grazeDamage && second.health <= grazeDamage) {
              // Prevent simultaneous death - only kill one
              if (first.health < second.health) {
                first.health = 0;
                first.alive = false;
                eliminationOrderRef.current.push(first.username);
              } else if (second.health < first.health) {
                second.health = 0;
                second.alive = false;
                eliminationOrderRef.current.push(second.username);
              } else {
                // Same health - faster one survives, random if same speed
                if (speed1 > speed2 || (speed1 === speed2 && Math.random() > 0.5)) {
                  second.health = 0;
                  second.alive = false;
                  eliminationOrderRef.current.push(second.username);
                  first.health -= grazeDamage;
                } else {
                  first.health = 0;
                  first.alive = false;
                  eliminationOrderRef.current.push(first.username);
                  second.health -= grazeDamage;
                }
              }
            } else {
              // Normal glancing blow - both take damage
              if (canFirstHitSecond) {
                second.health -= grazeDamage;
                second.lastHitTime = currentTime;
                second.lastHitBy = first.id;
                if (second.health <= 0) {
                  second.health = 0;
                  second.alive = false;
                  eliminationOrderRef.current.push(second.username);
                }
              }
              if (canSecondHitFirst) {
                first.health -= grazeDamage;
                first.lastHitTime = currentTime;
                first.lastHitBy = second.id;
                if (first.health <= 0) {
                  first.health = 0;
                  first.alive = false;
                  eliminationOrderRef.current.push(first.username);
                }
              }
            }

            // Bounce - strong ping pong effect
            const bounceForce = 2.5;
            first.vx -= nx * bounceForce;
            first.vy -= ny * bounceForce;
            second.vx += nx * bounceForce;
            second.vy += ny * bounceForce;
            
            // Extra separation push
            first.x -= nx * 3;
            first.y -= ny * 3;
            second.x += nx * 3;
            second.y += ny * 3;
            continue;
          }

          // Attacker deals damage but takes a little too
          // Speed ratio has less impact on damage now
          const speedRatio = Math.max(speed1, speed2) / Math.min(speed1, speed2);
          const baseDamage = 4.5 + speedRatio * 0.5; // 5-6 damage range (was 4-7)
          
          // Attacker's health affects damage output (wounded = weaker)
          // But reduce this advantage in end game so low-health players have a chance
          const attackerHealthPct = attacker.health / attacker.maxHealth;
          let healthMultiplier;
          if (aliveCount <= 10) {
            // End game: minimal health advantage (70%-100%)
            healthMultiplier = 0.7 + (attackerHealthPct * 0.3);
          } else if (aliveCount <= 50) {
            // Late game: reduced health advantage (50%-100%)
            healthMultiplier = 0.5 + (attackerHealthPct * 0.5);
          } else {
            // Early/mid game: normal health advantage (40%-100%)
            healthMultiplier = 0.4 + (attackerHealthPct * 0.6);
          }
          
          // Scale damage based on percentage - moderate damage for longer battles
          const pctRemaining = aliveCount / participantsRef.current.length;
          let damageMultiplier;
          
          // Final stages - fixed multipliers
          if (aliveCount <= 2) damageMultiplier = 1.1;
          else if (aliveCount <= 5) damageMultiplier = 1.05;
          else if (aliveCount <= 10) damageMultiplier = 1.0;
          else if (aliveCount <= 20) damageMultiplier = 0.95;
          // Scale based on percentage - lower damage for longer battles
          else if (pctRemaining > 0.9) damageMultiplier = 1.2;    // Start
          else if (pctRemaining > 0.8) damageMultiplier = 1.15;   // 80-90%
          else if (pctRemaining > 0.6) damageMultiplier = 1.1;    // 60-80% (reduced)
          else if (pctRemaining > 0.4) damageMultiplier = 1.05;   // 40-60% (reduced)
          else if (pctRemaining > 0.2) damageMultiplier = 1.0;    // 20-40%
          else damageMultiplier = 0.95;                            // Building to finale
          
          // After respawn (Top 10 reset), increase damage for faster final battles
          if (hasResetRef.current) {
            damageMultiplier *= 1.25;
          }
          
          const damage = baseDamage * damageMultiplier * healthMultiplier;
          const recoilDamage = 1 * damageMultiplier;

          // Check if this would kill both - prevent mutual kill
          const defenderWouldDie = defender.health - damage <= 0;
          const attackerWouldDie = attacker.health - recoilDamage <= 0;
          
          if (defenderWouldDie && attackerWouldDie) {
            // Only defender dies, attacker survives with 1 HP
            defender.health = 0;
            defender.alive = false;
            eliminationOrderRef.current.push(defender.username);
            // Track kill for victory path
            if (attacker.username) {
              if (!killTrackingRef.current[attacker.username]) {
                killTrackingRef.current[attacker.username] = [];
              }
              killTrackingRef.current[attacker.username].push({ 
                x: defender.x, 
                y: defender.y, 
                victim: defender.username 
              });
            }
            attacker.health = 1;
          } else {
            defender.health -= damage;
            defender.lastHitTime = currentTime;
            defender.lastHitBy = attacker.id;
            
            attacker.health -= recoilDamage;
            
            if (defender.health <= 0) {
              defender.health = 0;
              defender.alive = false;
              eliminationOrderRef.current.push(defender.username);
              // Track kill for victory path
              if (attacker.username) {
                if (!killTrackingRef.current[attacker.username]) {
                  killTrackingRef.current[attacker.username] = [];
                }
                killTrackingRef.current[attacker.username].push({ 
                  x: defender.x, 
                  y: defender.y, 
                  victim: defender.username 
                });
              }
            }
            
            if (attacker.health <= 0) {
              attacker.health = 0;
              attacker.alive = false;
              eliminationOrderRef.current.push(attacker.username);
              // Track kill for victory path (defender got the kill in this case)
              if (defender.username && defender.alive === false) {
                // Actually defender died too, so no kill credit here
              }
            }
          }

          // Knockback - both get pushed apart like ping pong balls
          // Stronger knockback in final stages for more dynamic movement
          const knockback = aliveCount <= 5 ? 4.0 : aliveCount <= 10 ? 3.5 : 2.5;
          attacker.vx -= (defender === second ? 1 : -1) * nx * knockback * 0.5;
          attacker.vy -= (defender === second ? 1 : -1) * ny * knockback * 0.5;
          defender.vx += (defender === second ? 1 : -1) * nx * knockback;
          defender.vy += (defender === second ? 1 : -1) * ny * knockback;
          
          // Extra separation push
          first.x -= nx * 3;
          first.y -= ny * 3;
          second.x += nx * 3;
          second.y += ny * 3;

          // Normalize velocities - but preserve higher speeds in final 10
          const newSpeed1 = Math.sqrt(first.vx * first.vx + first.vy * first.vy);
          const newSpeed2 = Math.sqrt(second.vx * second.vx + second.vy * second.vy);
          
          // After collision, speed builds up progressively in final stages
          // Start with lower minimum, collisions add speed that's preserved
          const minSpeed = aliveCount <= 2 ? BASE_SPEED * 1.0 : 
                          aliveCount <= 5 ? BASE_SPEED * 0.9 : 
                          aliveCount <= 10 ? BASE_SPEED * 0.8 : BASE_SPEED * 0.7;
          const maxSpeed = BASE_SPEED * 3.0;
          
          if (newSpeed1 > 0) {
            const targetSpeed1 = Math.max(minSpeed, Math.min(maxSpeed, newSpeed1));
            first.vx = (first.vx / newSpeed1) * targetSpeed1;
            first.vy = (first.vy / newSpeed1) * targetSpeed1;
          }
          if (newSpeed2 > 0) {
            const targetSpeed2 = Math.max(minSpeed, Math.min(maxSpeed, newSpeed2));
            second.vx = (second.vx / newSpeed2) * targetSpeed2;
            second.vy = (second.vy / newSpeed2) * targetSpeed2;
          }
        }
      }
    }
    } // end skipCollisions check

    // Draw participants - use pre-rendered circular canvases
    // Always use color now - performance comes from pre-rendered canvases
    const useGrayscale = false;
    const skipHealthBars = aliveCount > 500;
    const skipBorders = aliveCount > 1000;

    alive.forEach(p => {
      // Try to draw pre-rendered profile picture
      const imgData = p.username ? loadedImagesRef.current[p.username] : null;
      if (imgData && imgData.complete) {
        // Use pre-rendered circular canvas (no clipping needed!)
        const canvas = useGrayscale ? imgData.gray : imgData.color;
        ctx.drawImage(canvas, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        // No border - cleaner look
      } else {
        // Colored circle fallback
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = useGrayscale ? '#666' : p.color;
        ctx.fill();

        if (aliveCount <= 500) {
          ctx.font = `${p.size * 1.2}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.emoji, p.x, p.y);
        }
      }

      // Health bar - skip at high counts for performance
      if (!skipHealthBars) {
        const barWidth = p.size * 2;
        const barHeight = 4;
        const barX = p.x - barWidth / 2;
        const barY = p.y + p.size + 5;

        ctx.fillStyle = '#222';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const healthPct = p.health / p.maxHealth;
        ctx.fillStyle = healthPct > 0.5 ? 'rgba(34, 197, 94, 0.6)' : healthPct > 0.25 ? 'rgba(234, 179, 8, 0.6)' : 'rgba(239, 68, 68, 0.6)';
        ctx.fillRect(barX, barY, barWidth * healthPct, barHeight);
      }
      
      // Show username above PFP
      // With Top 5 reset: show after reset when 10 or fewer
      // Without Top 5 reset: show at 15 or fewer with fade-in effect
      const shouldShowUsername = p.username && (
        (hasResetRef.current && aliveCount <= 10) ||
        (!enableTop5ResetRef.current && aliveCount <= 15)
      );
      
      if (shouldShowUsername) {
        // Initialize username opacity if not set
        if (p.usernameOpacity === undefined) {
          p.usernameOpacity = 0;
        }
        // Smoothly fade in (0.02 per frame = ~50 frames to full)
        p.usernameOpacity = Math.min(1, p.usernameOpacity + 0.02);
        
        // Calculate font size with growth effect
        const targetFontSize = Math.max(10, p.size * 0.4);
        if (p.usernameFontSize === undefined) {
          p.usernameFontSize = targetFontSize * 0.3; // Start small
        }
        // Smoothly grow font
        p.usernameFontSize += (targetFontSize - p.usernameFontSize) * 0.05;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${p.usernameOpacity})`;
        ctx.font = `bold ${p.usernameFontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`@${p.username}`, p.x, p.y - p.size - 5);
      }
      
      // Check power-up collisions for this participant
      powerUpsRef.current.forEach(powerUp => {
        if (powerUp.active) {
          const dx = p.x - powerUp.x;
          const dy = p.y - powerUp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < p.size + powerUp.size) {
            // Collected! Add health
            powerUp.active = false;
            p.health = Math.min(p.maxHealth, p.health + 30); // +30 HP
            console.log(`💎 ${p.username} collected ETH power-up! +30 HP`);
          }
        }
      });
    });
    
    // Draw active power-ups (ETH logos)
    powerUpsRef.current.forEach(powerUp => {
      if (powerUp.active) {
        // Pulsing glow effect
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        const glowSize = powerUp.size + 10 + Math.sin(Date.now() / 150) * 5;
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(powerUp.x, powerUp.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(107, 125, 179, ${0.3 * pulse})`;
        ctx.fill();
        
        // Inner glow
        ctx.beginPath();
        ctx.arc(powerUp.x, powerUp.y, powerUp.size + 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(138, 157, 201, ${0.4 * pulse})`;
        ctx.fill();
        
        // Draw the ETH diamond
        ctx.save();
        if (powerUp.rotation) {
          ctx.translate(powerUp.x, powerUp.y);
          ctx.rotate(powerUp.rotation);
          ctx.translate(-powerUp.x, -powerUp.y);
        }
        drawETHLogo(ctx, powerUp.x, powerUp.y, powerUp.size * 2);
        ctx.restore();
      }
    });
    
    // Draw tank cannon if active
    if (tankRef.current) {
      drawTankCannon(ctx, tankRef.current);
    }

    // UI overlay (only if not showing winner)
    if (aliveCount > 1) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`Players Left: ${aliveCount}`, CANVAS_SIZE / 2, 10);
    }

    // Restore context (end arena clipping/offset)
    ctx.restore();

    setPlayersLeft(aliveCount);

    // ALWAYS continue the loop if running - use ref instead of state
    if (isRunningRef.current) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  };

  const startBattle = () => {
    participantsRef.current = createParticipants();
    
    setWinner(null);
    setPlayersLeft(participantsRef.current.length);
    setIsRunning(true);
    isRunningRef.current = true;
    hasResetRef.current = false;
    resetCountdownRef.current = 0;
    eliminationOrderRef.current = [];
    powerUpsRef.current = [];
    hasSpawnedPowerUpsRef.current = false;
    tankRef.current = null;
    hasTankFiredRef.current = false;
    winnerStartTimeRef.current = null;
    confettiRef.current = [];
  };

  const togglePause = () => {
    const newState = !isRunning;
    setIsRunning(newState);
    isRunningRef.current = newState; // Also set the ref!
  };

  const drawInitialGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Draw frame first
    drawFrame(ctx);
    
    // Set up arena area
    ctx.save();
    ctx.beginPath();
    ctx.rect(ARENA_X, ARENA_Y, ARENA_SIZE, ARENA_SIZE);
    ctx.clip();
    ctx.translate(ARENA_X, ARENA_Y);
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    const count = participantsRef.current.length;
    if (count === 0) {
      ctx.restore();
      return;
    }
    
    const gridSize = Math.ceil(Math.sqrt(count));
    const cellSize = CANVAS_SIZE / gridSize;
    const pfpSize = cellSize * 0.45; // Leave some padding
    
    participantsRef.current.forEach((p, i) => {
      const gridX = i % gridSize;
      const gridY = Math.floor(i / gridSize);
      const x = gridX * cellSize + cellSize / 2;
      const y = gridY * cellSize + cellSize / 2;
      
      // Draw PFP using pre-rendered canvas, otherwise colored circle
      const imgData = p.username ? loadedImagesRef.current[p.username] : null;
      if (imgData && imgData.complete) {
        ctx.drawImage(imgData.color, x - pfpSize, y - pfpSize, pfpSize * 2, pfpSize * 2);
        // No border - cleaner look
      } else {
        // Fallback to colored circle
        ctx.beginPath();
        ctx.arc(x, y, pfpSize, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
    });
    
    ctx.restore(); // End arena clipping
  };

  const reset = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    hasResetRef.current = false;
    winnerStartTimeRef.current = null;
    confettiRef.current = [];
    tankRef.current = null;
    hasTankFiredRef.current = false;
    powerUpsRef.current = [];
    hasSpawnedPowerUpsRef.current = false;
    // Reset path tracking
    pathTrackingRef.current = {};
    killTrackingRef.current = {};
    setShowVictoryPath(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    participantsRef.current = createParticipants();
    setWinner(null);
    setPlayersLeft(participantsRef.current.length);
    setVideoBlob(null);
    
    // Draw initial grid with small delay to ensure images are ready
    setTimeout(drawInitialGrid, 100);
  };

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    recordedChunksRef.current = [];
    const videoStream = canvas.captureStream(60); // 60 fps for smoother video
    
    // Try MP4 first (better for X), fallback to webm
    let mimeType = 'video/webm;codecs=vp9';
    if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
      mimeType = 'video/webm;codecs=h264';
    }
    
    const mediaRecorder = new MediaRecorder(videoStream, { 
      mimeType,
      videoBitsPerSecond: 10000000 // 10 Mbps for better quality
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      setVideoBlob(blob);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    isRecordingRef.current = true;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const downloadVideo = () => {
    if (!videoBlob) return;
    const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'mp4';
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `battle-royale-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Draw victory path visualization
  const drawVictoryPath = (style) => {
    if (!winner || !victoryPathCanvasRef.current) return;
    
    const canvas = victoryPathCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const path = pathTrackingRef.current[winner.username] || [];
    const kills = killTrackingRef.current[winner.username] || [];
    
    if (path.length === 0) return;
    
    // Dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    if (style === 'clean') {
      // CLEAN STYLE - Just the gradient path
      for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1];
        const curr = path[i];
        const progress = i / path.length;
        
        // Color transitions from blue to purple to pink to red
        const r = Math.floor(50 + progress * 205);
        const g = Math.floor(100 - progress * 80);
        const b = Math.floor(255 - progress * 155);
        
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
    } else {
      // DETAILED STYLE - Gradient path + heat + skulls + markers
      
      // Draw heat map layer first
      path.forEach((point, i) => {
        const progress = i / path.length;
        const r = Math.floor(50 + progress * 205);
        const g = Math.floor(100 - progress * 80);
        const b = Math.floor(255 - progress * 155);
        
        const intensity = 0.06;
        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 25);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${intensity})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(point.x - 25, point.y - 25, 50, 50);
      });
      
      // Draw path with gradient color evolution and glow
      for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1];
        const curr = path[i];
        const progress = i / path.length;
        
        const r = Math.floor(50 + progress * 205);
        const g = Math.floor(100 - progress * 80);
        const b = Math.floor(255 - progress * 155);
        
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
      
      ctx.shadowBlur = 0;
      
      // Kill markers - skull emojis with glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffcc00';
      ctx.font = '28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      kills.forEach(kill => {
        ctx.fillText('💀', kill.x, kill.y);
      });
      ctx.shadowBlur = 0;
      
      // Start marker - green glow
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00ff88';
      ctx.beginPath();
      ctx.arc(path[0].x, path[0].y, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff88';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('START', path[0].x, path[0].y - 22);
      
      // End marker - gold crown with glow
      const end = path[path.length - 1];
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#ffcc00';
      ctx.beginPath();
      ctx.arc(end.x, end.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#ffcc00';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = '36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('👑', end.x, end.y - 30);
      
      // Title
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PATH TO VICTORY', CANVAS_SIZE / 2, 30);
      ctx.font = '16px Arial';
      ctx.fillStyle = '#888';
      ctx.fillText(`${winner.name} • ${kills.length} eliminations`, CANVAS_SIZE / 2, 55);
    }
  };

  // Effect to redraw victory path when style changes
  useEffect(() => {
    if (showVictoryPath && winner) {
      drawVictoryPath(victoryPathStyle);
    }
  }, [showVictoryPath, victoryPathStyle, winner]);

  // Download victory path as image
  const downloadVictoryPath = () => {
    if (!victoryPathCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `victory-path-${winner?.username || 'winner'}-${Date.now()}.png`;
    link.href = victoryPathCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  const shareToX = () => {
    // X doesn't support direct video upload via URL, so we open compose with text
    // User will need to attach the downloaded video
    const text = encodeURIComponent(`🏆 Follower Battle Royale!\n\nWinner: ${winner?.name || 'TBD'}\n\n#BattleRoyale`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  useEffect(() => {
    if (isRunning) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    reset();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">PFP WAR</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Controls</h2>

              <div className="space-y-4">
                {/* Follower Data Upload */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {followerData
                      ? `✅ ${followerData.followers.length} followers (@${followerData.account})`
                      : 'Load Follower Data'
                    }
                  </label>

                  {/* Upload file button */}
                  <label className="w-full bg-purple-600 hover:bg-purple-700 rounded px-4 py-3 font-semibold flex items-center justify-center gap-2 cursor-pointer mb-2">
                    <Upload size={20} />
                    {followerData ? 'Load Different File' : 'Upload JSON'}
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        handleFileUpload(e);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>

                  {/* Load @HoloisAlpha followers - primary action */}
                  <button
                    onClick={() => loadFromUrl('/followers.json')}
                    disabled={isLoadingUrl}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 rounded px-4 py-3 font-semibold flex items-center justify-center gap-2 mb-2"
                  >
                    {isLoadingUrl ? '⏳ Loading...' : '🚀 @HoloisAlpha (2,568 followers)'}
                  </button>

                  {/* Paste JSON button - great for mobile */}
                  <button
                    onClick={() => setShowPasteModal(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 rounded px-4 py-3 font-semibold flex items-center justify-center gap-2 mb-2"
                  >
                    📋 Paste JSON
                  </button>

                  {/* Demo battle button */}
                  <button
                    onClick={generateDemoData}
                    className="w-full bg-gray-700 hover:bg-gray-600 rounded px-4 py-3 font-semibold flex items-center justify-center gap-2"
                  >
                    🎮 Demo Battle (50 players)
                  </button>

                  {isLoadingUrl && (
                    <p className="text-xs text-yellow-400 mt-2">
                      ⏳ Loading from URL...
                    </p>
                  )}
                  {Object.keys(loadedImages).length > 0 && (
                    <p className="text-xs text-green-400 mt-2">
                      🖼️ {Object.keys(loadedImages).length} profile pics loaded
                    </p>
                  )}
                  {followerData && (
                    <button
                      onClick={() => {
                        localStorage.removeItem('followerData');
                        setFollowerData(null);
                        setLoadedImages({});
                        participantsRef.current = [];
                        alert('Cache cleared! Please re-upload your JSON file.');
                      }}
                      className="text-xs text-gray-500 hover:text-red-400 mt-2"
                    >
                      Clear cached data
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Top 5 Reset</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEnableTop5Reset(false)}
                      className={`flex-1 px-3 py-2 rounded text-sm font-semibold ${
                        !enableTop5Reset ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      OFF
                    </button>
                    <button
                      onClick={() => setEnableTop5Reset(true)}
                      className={`flex-1 px-3 py-2 rounded text-sm font-semibold ${
                        enableTop5Reset ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      ON
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {enableTop5Reset ? 'Final 5 reset with full health' : 'Battle to the end'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Extras</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEnableExtras(false)}
                      className={`flex-1 px-3 py-2 rounded text-sm font-semibold ${
                        !enableExtras ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      OFF
                    </button>
                    <button
                      onClick={() => setEnableExtras(true)}
                      className={`flex-1 px-3 py-2 rounded text-sm font-semibold ${
                        enableExtras ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      ON
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {enableExtras ? '🐸 Tank @ 10, ETH @ 2' : 'No extras'}
                  </p>
                </div>
              </div>
            </div>

            {/* Recording & Export */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Record & Share</h2>
              <div className="space-y-3">
                {!isRecording ? (
                  <button
                    onClick={() => { startRecording(); startBattle(); }}
                    disabled={isRunning}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded px-4 py-3 font-semibold flex items-center justify-center gap-2"
                  >
                    🔴 Record Battle
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="w-full bg-red-800 hover:bg-red-900 rounded px-4 py-3 font-semibold flex items-center justify-center gap-2 animate-pulse"
                  >
                    ⏹️ Stop Recording
                  </button>
                )}

                {videoBlob && (
                  <>
                    <button
                      onClick={downloadVideo}
                      className="w-full bg-green-600 hover:bg-green-700 rounded px-4 py-3 font-semibold flex items-center justify-center gap-2"
                    >
                      ⬇️ Download Video
                    </button>
                    <button
                      onClick={shareToX}
                      className="w-full bg-black hover:bg-gray-900 border border-gray-600 rounded px-4 py-3 font-semibold flex items-center justify-center gap-2"
                    >
                      𝕏 Share to X
                    </button>
                  </>
                )}

                {/* Victory Path Visualization */}
                {winner && pathTrackingRef.current[winner.username]?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => setShowVictoryPath(!showVictoryPath)}
                      className="w-full bg-purple-600 hover:bg-purple-700 rounded px-4 py-3 font-semibold flex items-center justify-center gap-2"
                    >
                      🗺️ {showVictoryPath ? 'Hide' : 'View'} Victory Path
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Canvas with hover controls */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-4">
              {/* Victory Path View */}
              {showVictoryPath && winner ? (
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                  {/* Style Toggle */}
                  <div className="flex justify-center gap-2 mb-4">
                    <button
                      onClick={() => setVictoryPathStyle('clean')}
                      className={`px-4 py-2 rounded font-semibold transition-all ${
                        victoryPathStyle === 'clean' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Clean
                    </button>
                    <button
                      onClick={() => setVictoryPathStyle('detailed')}
                      className={`px-4 py-2 rounded font-semibold transition-all ${
                        victoryPathStyle === 'detailed' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Detailed
                    </button>
                  </div>
                  
                  <canvas
                    ref={victoryPathCanvasRef}
                    width={CANVAS_SIZE}
                    height={CANVAS_SIZE}
                    className="w-full rounded"
                  />
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={downloadVictoryPath}
                      className="flex-1 bg-green-600 hover:bg-green-700 rounded px-4 py-2 font-semibold"
                    >
                      ⬇️ Download Path Image
                    </button>
                    <button
                      onClick={() => setShowVictoryPath(false)}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-4 py-2 font-semibold"
                    >
                      ← Back to Battle
                    </button>
                  </div>
                </div>
              ) : (
              <div className="relative" style={{ maxWidth: '600px', margin: '0 auto' }}>
                {/* Canvas - tap to start/pause */}
                <canvas
                  ref={canvasRef}
                  width={FRAME_WIDTH}
                  height={FRAME_HEIGHT}
                  className="w-full rounded cursor-pointer"
                  onClick={() => {
                    // If winner exists, do nothing (game is over)
                    if (winner) return;
                    // If not started yet, start the battle
                    if (!isRunning && playersLeft === (followerData?.followers.length || participantsRef.current.length)) {
                      startBattle();
                    } else {
                      // Toggle pause
                      togglePause();
                    }
                  }}
                />

                {/* Tap to Start overlay - shown before game starts */}
                {!isRunning && !winner && playersLeft === (followerData?.followers.length || participantsRef.current.length) && participantsRef.current.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded pointer-events-none">
                    <div className="text-center">
                      <div className="text-6xl mb-4">⚔️</div>
                      <p className="text-2xl font-bold text-white">Tap to Start</p>
                      <p className="text-gray-300 mt-2">{playersLeft} players ready</p>
                    </div>
                  </div>
                )}

                {/* Paused overlay - shown when game is paused mid-battle */}
                {!isRunning && !winner && playersLeft > 0 && playersLeft < (followerData?.followers.length || participantsRef.current.length) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white mb-6">⏸️ Paused</p>
                      <p className="text-gray-300 mb-6">{playersLeft} players remaining</p>
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePause(); }}
                          className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-2"
                        >
                          <Play size={24} /> Resume
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); reset(); }}
                          className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-2"
                        >
                          <RotateCcw size={24} /> Restart
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Winner overlay with replay option */}
                {winner && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2"
                    >
                      <RotateCcw size={20} /> New Battle
                    </button>
                  </div>
                )}

                {/* Progress bar at bottom - always visible during game */}
                {isRunning && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="w-full bg-gray-700/50 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${((followerData?.followers.length || playersLeft) - playersLeft) / (followerData?.followers.length || 1) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Paste JSON Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-bold mb-4">Paste Follower JSON</h3>
            <p className="text-sm text-gray-400 mb-4">
              Paste your follower data JSON below. Format should include a "followers" array.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder='{"account": "username", "followers": [{"username": "user1", ...}]}'
              className="w-full h-48 bg-gray-900 border border-gray-700 rounded p-3 text-sm font-mono text-white resize-none focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handlePasteSubmit}
                className="flex-1 bg-purple-600 hover:bg-purple-700 rounded px-4 py-3 font-semibold"
              >
                Load Data
              </button>
              <button
                onClick={() => { setShowPasteModal(false); setPasteText(''); }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 rounded px-4 py-3 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BattleSimulator;
