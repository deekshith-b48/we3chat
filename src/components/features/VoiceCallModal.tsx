'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX,
  Settings,
  Users,
  Maximize,
  Minimize,
  X,
  ScreenShare,
  ScreenShareOff
} from 'lucide-react';

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Array<{
    id: string;
    name: string;
    avatar: string;
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
    isSpeaking: boolean;
  }>;
  isIncoming?: boolean;
  caller?: {
    name: string;
    avatar: string;
  };
}

export function VoiceCallModal({ 
  isOpen, 
  onClose, 
  participants, 
  isIncoming = false,
  caller 
}: VoiceCallModalProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [showSettings, setShowSettings] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const callStartTime = useRef<number>(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize media streams
  useEffect(() => {
    if (isOpen && !isIncoming) {
      initializeMedia();
    }
  }, [isOpen, isIncoming]);

  // Update call duration
  useEffect(() => {
    if (isConnected && callStartTime.current) {
      durationInterval.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
      }, 1000);
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [isConnected]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to access media devices:', error);
    }
  };

  const handleAnswer = () => {
    setIsConnected(true);
    callStartTime.current = Date.now();
    initializeMedia();
  };

  const handleReject = () => {
    onClose();
  };

  const handleEndCall = () => {
    setIsConnected(false);
    setCallDuration(0);
    
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    remoteStreams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    
    onClose();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = async () => {
    if (isVideoEnabled) {
      if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        videoTracks.forEach(track => track.stop());
      }
      setIsVideoEnabled(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        
        if (localStream) {
          const videoTracks = stream.getVideoTracks();
          videoTracks.forEach(track => {
            localStream.addTrack(track);
          });
        }
        setIsVideoEnabled(true);
      } catch (error) {
        console.error('Failed to enable video:', error);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(true);
      } catch (error) {
        console.error('Failed to start screen sharing:', error);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getParticipantGridClass = () => {
    const count = participants.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 bg-black z-50 ${isFullscreen ? '' : 'flex items-center justify-center p-4'}`}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`bg-slate-900 text-white ${isFullscreen ? 'w-full h-full' : 'w-full max-w-4xl h-[600px]'} rounded-lg overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    {isConnected ? formatDuration(callDuration) : 'Call'}
                  </span>
                </div>
                {isConnected && (
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{participants.length + 1}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Area */}
            <div className="flex-1 relative">
              {!isConnected && isIncoming ? (
                // Incoming Call Screen
                <div className="flex flex-col items-center justify-center h-full space-y-6">
                  <div className="relative">
                    <img
                      src={caller?.avatar || 'https://ui-avatars.com/api/?name=Caller&background=3b82f6&color=fff'}
                      alt={caller?.name || 'Caller'}
                      className="w-32 h-32 rounded-full object-cover"
                    />
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">
                      {caller?.name || 'Unknown Caller'}
                    </h2>
                    <p className="text-slate-400">Incoming call</p>
                  </div>
                </div>
              ) : isConnected ? (
                // Connected Call Screen
                <div className="h-full relative">
                  {/* Remote Participants */}
                  <div className={`grid ${getParticipantGridClass()} gap-2 h-full p-4`}>
                    {participants.map((participant) => (
                      <div
                        key={participant.id}
                        className={`relative bg-slate-800 rounded-lg overflow-hidden ${
                          participant.isSpeaking ? 'ring-2 ring-green-500' : ''
                        }`}
                      >
                        {participant.isVideoEnabled ? (
                          <video
                            ref={(el) => {
                              if (el) remoteVideoRefs.current.set(participant.id, el);
                            }}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <img
                              src={participant.avatar}
                              alt={participant.name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          </div>
                        )}
                        
                        <div className="absolute bottom-2 left-2 flex items-center space-x-2">
                          <span className="text-sm font-medium">{participant.name}</span>
                          {!participant.isAudioEnabled && (
                            <MicOff className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Local Video */}
                  {isVideoEnabled && (
                    <div className="absolute top-4 right-4 w-48 h-36 bg-slate-800 rounded-lg overflow-hidden">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 text-xs">
                        You {isMuted && <MicOff className="w-3 h-3 inline text-red-500" />}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Call Connecting Screen
                <div className="flex flex-col items-center justify-center h-full space-y-6">
                  <div className="relative">
                    <img
                      src="https://ui-avatars.com/api/?name=Connecting&background=3b82f6&color=fff"
                      alt="Connecting"
                      className="w-32 h-32 rounded-full object-cover"
                    />
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Connecting...</h2>
                    <p className="text-slate-400">Please wait</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-6 bg-slate-800/50 backdrop-blur-sm">
              {!isConnected && isIncoming ? (
                // Incoming Call Controls
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={handleReject}
                    className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleAnswer}
                    className="p-4 bg-green-500 hover:bg-green-600 rounded-full transition-colors"
                  >
                    <Phone className="w-6 h-6" />
                  </button>
                </div>
              ) : isConnected ? (
                // Connected Call Controls
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full transition-colors ${
                      isMuted 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-slate-600 hover:bg-slate-500'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                  
                  <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full transition-colors ${
                      isVideoEnabled 
                        ? 'bg-slate-600 hover:bg-slate-500' 
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                  </button>
                  
                  <button
                    onClick={toggleScreenShare}
                    className={`p-4 rounded-full transition-colors ${
                      isScreenSharing 
                        ? 'bg-blue-500 hover:bg-blue-600' 
                        : 'bg-slate-600 hover:bg-slate-500'
                    }`}
                  >
                    {isScreenSharing ? <ScreenShareOff className="w-6 h-6" /> : <ScreenShare className="w-6 h-6" />}
                  </button>
                  
                  <button
                    onClick={handleEndCall}
                    className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                // Outgoing Call Controls
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={handleEndCall}
                    className="p-4 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, x: 300 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 300 }}
                  className="absolute top-0 right-0 w-80 h-full bg-slate-800 p-6"
                >
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Call Settings</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Microphone Volume
                        </label>
                        <div className="flex items-center space-x-3">
                          <VolumeX className="w-4 h-4" />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume}
                            onChange={(e) => setVolume(Number(e.target.value))}
                            className="flex-1"
                          />
                          <Volume2 className="w-4 h-4" />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Camera
                        </label>
                        <select className="w-full p-2 bg-slate-700 rounded-lg">
                          <option>Default Camera</option>
                          <option>External Camera</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Microphone
                        </label>
                        <select className="w-full p-2 bg-slate-700 rounded-lg">
                          <option>Default Microphone</option>
                          <option>External Microphone</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Speaker
                        </label>
                        <select className="w-full p-2 bg-slate-700 rounded-lg">
                          <option>Default Speaker</option>
                          <option>Headphones</option>
                          <option>External Speaker</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
