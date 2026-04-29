import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Image, Vibration, BackHandler,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { agoraCallService } from '../../services/agora.service';
import { callSignaling } from '../../services/callSignaling.service';

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function initials(name: string) { return (name || 'U').charAt(0).toUpperCase(); }

type CallState = 'connecting' | 'ringing' | 'connected' | 'ended';
type EndReason = 'declined' | 'ended' | 'missed';

export default function VoiceCallScreen({ navigation, route }: any) {
  const { isDark } = useTheme();
  const { user, userProfile } = useAuthStore();
  const {
    userId: otherUserId, userName, userAvatar, chatId,
    isIncoming = false, callId: incomingCallId, channelName: incomingChannel,
  } = route.params || {};

  const [callState, setCallState] = useState<CallState>(isIncoming ? 'ringing' : 'connecting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callId, setCallId] = useState<string | null>(incomingCallId || null);

  const callStateRef = useRef<CallState>(isIncoming ? 'ringing' : 'connecting');
  const callIdRef = useRef<string | null>(incomingCallId || null);
  const timerRef = useRef<any>(null);
  const callStartRef = useRef<number>(0);
  const channelRef = useRef<string>(incomingChannel || `call_${chatId}_${Date.now()}`);
  const callDocUnsubRef = useRef<(() => void) | null>(null);
  const ringTimeoutRef = useRef<any>(null);
  const hasEndedRef = useRef<boolean>(false);

  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { callIdRef.current = callId; }, [callId]);

  const fullGradient = isDark
    ? ['#1A1008', '#2A1C0E', '#3A2814', '#4A341C']
    : ['#FFC58A', '#FFD9A8', '#FFEAC8', '#FFF6E5'];

  const textColor       = isDark ? '#FFF6E5' : '#3D2817';
  const mutedColor      = isDark ? '#D4BCA0' : '#8A6E50';
  const labelColor      = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(61,40,23,0.6)';

  const avatarRingColor   = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(212,101,26,0.30)';
  const avatarFallbackBg  = '#FFB87A';
  const decorColor        = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(212,101,26,0.10)';

  const pillBg          = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.7)';
  const pillTextColor   = isDark ? '#FFF6E5' : '#3D2817';

  const controlBtnBg          = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.85)';
  const controlBtnBgActive    = isDark ? 'rgba(255,255,255,0.35)' : '#D4651A';
  const controlBtnBorder      = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(212,101,26,0.20)';
  const controlIconColor      = isDark ? '#fff' : '#3D2817';
  const controlIconColorActive = '#fff';
  const controlLabelColor     = isDark ? 'rgba(255,255,255,0.85)' : '#5C3D2E';

  const cleanup = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
    if (callDocUnsubRef.current) { callDocUnsubRef.current(); callDocUnsubRef.current = null; }
    Vibration.cancel();
  };

  const startAgoraCall = async () => {
    const ok = await agoraCallService.requestPermissions('voice');
    if (!ok) { endCall('declined'); return; }

    agoraCallService.initEngine('voice', {
      onUserJoined: () => {
        if (ringTimeoutRef.current) {
          clearTimeout(ringTimeoutRef.current);
          ringTimeoutRef.current = null;
        }
        setCallState('connected');
        callStateRef.current = 'connected';
        callStartRef.current = Date.now();
        Vibration.cancel();
        timerRef.current = setInterval(() => {
          setDuration(Math.floor((Date.now() - callStartRef.current) / 1000));
        }, 1000);
      },
      onUserOffline: () => endCall('ended'),
      onError: () => { },
    });

    const myUid = parseInt((user?.uid || '0').replace(/\D/g, '').slice(-9) || '0', 10) || Math.floor(Math.random() * 100000);
    try {
      await agoraCallService.joinChannel(channelRef.current, myUid);
      agoraCallService.setSpeakerphone(false);
    } catch { }
  };

  const initiateCall = async () => {
    if (!user?.uid) return;
    try {
      const newCallId = await callSignaling.initiateCall({
        channelName: channelRef.current,
        callerId: user.uid,
        callerName: userProfile?.name || 'User',
        callerAvatar: userProfile?.avatarUrl || '',
        receiverId: otherUserId,
        receiverName: userName,
        receiverAvatar: userAvatar || '',
        callType: 'voice',
      });
      setCallId(newCallId);
      callIdRef.current = newCallId;

      callDocUnsubRef.current = callSignaling.listenToCall(newCallId, (call) => {
        if (!call) return;
        if (call.status === 'accepted' && callStateRef.current !== 'connected') {
          startAgoraCall();
        } else if (call.status === 'declined' || call.status === 'ended' || call.status === 'missed') {
          endCall(call.status as EndReason);
        }
      });

      ringTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === 'connecting' || callStateRef.current === 'ringing') {
          if (callIdRef.current) callSignaling.markMissed(callIdRef.current).catch(() => { });
          endCall('missed');
        }
      }, 30000);
    } catch {
      endCall('ended');
    }
  };

  const acceptCall = async () => {
    if (!callIdRef.current) return;
    Vibration.cancel();
    await callSignaling.acceptCall(callIdRef.current);
    await startAgoraCall();
  };

  const endCall = async (reason: EndReason = 'ended') => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;

    setCallState('ended');
    callStateRef.current = 'ended';
    cleanup();
    await agoraCallService.leave();

    const finalCallId = callIdRef.current;
    if (finalCallId) {
      try {
        if (reason === 'declined') await callSignaling.declineCall(finalCallId);
        else if (reason === 'missed') { /* already handled */ }
        else if (duration > 0) await callSignaling.endCall(finalCallId, duration);
        else await callSignaling.declineCall(finalCallId);
      } catch { }
    }
    setTimeout(() => navigation.goBack(), 600);
  };

  useEffect(() => {
    if (isIncoming) {
      Vibration.vibrate([0, 1000, 500], true);
      if (incomingCallId) {
        callDocUnsubRef.current = callSignaling.listenToCall(incomingCallId, (call) => {
          if (!call) return;
          if (call.status === 'declined' || call.status === 'ended' || call.status === 'missed') {
            endCall(call.status as EndReason);
          }
        });
      }
    } else {
      initiateCall();
    }
    const back = BackHandler.addEventListener('hardwareBackPress', () => { endCall('ended'); return true; });
    return () => {
      cleanup();
      agoraCallService.leave();
      back.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusText = () => {
    switch (callState) {
      case 'connecting': return 'Calling...';
      case 'ringing':    return 'Incoming call';
      case 'connected':  return fmtDuration(duration);
      case 'ended':      return 'Call ended';
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <LinearGradient
        colors={fullGradient}
        locations={[0, 0.30, 0.70, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={[styles.decorCircle1, { backgroundColor: decorColor }]} />
      <View style={[styles.decorCircle2, { backgroundColor: decorColor }]} />

      <View style={styles.topArea}>
        <Text style={[styles.callTypeLabel, { color: labelColor }]}>VOICE CALL</Text>
        <View style={[styles.statusPill, { backgroundColor: pillBg }]}>
          <View style={[styles.statusDot, callState === 'connected' && styles.statusDotLive]} />
          <Text style={[styles.statusText, { color: pillTextColor }]}>{statusText()}</Text>
        </View>
      </View>

      <View style={styles.avatarArea}>
        <View style={[styles.avatarRing, { borderColor: avatarRingColor }]}>
          {userAvatar ? <Image source={{ uri: userAvatar }} style={styles.avatar} /> : (
            <View style={[styles.avatar, { backgroundColor: avatarFallbackBg, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.avatarInitial}>{initials(userName)}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.userName, { color: textColor }]}>{userName || 'Unknown'}</Text>
        <Text style={[styles.userSub, { color: mutedColor }]}>
          {callState === 'connected' ? 'Connected' : callState === 'ringing' ? 'Wants to talk to you' : 'FolkChat Voice Call'}
        </Text>
      </View>

      <View style={styles.controlsArea}>
        {callState === 'ringing' && isIncoming ? (
          <View style={styles.incomingRow}>
            <TouchableOpacity style={[styles.bigBtn, styles.declineBtn]} onPress={() => endCall('declined')} activeOpacity={0.85}>
              <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bigBtn, styles.acceptBtn]} onPress={acceptCall} activeOpacity={0.85}>
              <Ionicons name="call" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={[
                  styles.controlBtn,
                  { backgroundColor: isMuted ? controlBtnBgActive : controlBtnBg, borderColor: controlBtnBorder },
                ]}
                onPress={() => { setIsMuted(!isMuted); agoraCallService.setMuted(!isMuted); }} activeOpacity={0.8}>
                <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color={isMuted ? controlIconColorActive : controlIconColor} />
                <Text style={[styles.controlLabel, { color: controlLabelColor }]}>{isMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.controlBtn,
                  { backgroundColor: isSpeaker ? controlBtnBgActive : controlBtnBg, borderColor: controlBtnBorder },
                ]}
                onPress={() => { setIsSpeaker(!isSpeaker); agoraCallService.setSpeakerphone(!isSpeaker); }} activeOpacity={0.8}>
                <Ionicons name={isSpeaker ? 'volume-high' : 'volume-medium'} size={24} color={isSpeaker ? controlIconColorActive : controlIconColor} />
                <Text style={[styles.controlLabel, { color: controlLabelColor }]}>Speaker</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: controlBtnBg, borderColor: controlBtnBorder }]}
                activeOpacity={0.8}>
                <Ionicons name="keypad" size={24} color={controlIconColor} />
                <Text style={[styles.controlLabel, { color: controlLabelColor }]}>Keypad</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.bigBtn, styles.hangupBtn]} onPress={() => endCall('ended')} activeOpacity={0.85}>
              <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  decorCircle1: { position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: 110 },
  decorCircle2: { position: 'absolute', bottom: 200, left: -80, width: 180, height: 180, borderRadius: 90 },
  topArea: { paddingTop: 70, alignItems: 'center', gap: 12 },
  callTypeLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 3 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFB87A' },
  statusDotLive: { backgroundColor: '#27AE60' },
  statusText: { fontSize: 13, fontWeight: '600' },
  avatarArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  avatarRing: {
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 4, padding: 8,
    shadowColor: '#FFB87A', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 80 },
  avatarInitial: { fontSize: 64, color: '#fff', fontWeight: '800' },
  userName: { fontSize: 28, fontWeight: '800', letterSpacing: -0.3, marginTop: 12 },
  userSub: { fontSize: 14, fontWeight: '500' },
  controlsArea: { paddingHorizontal: 24, paddingBottom: 60, gap: 28 },
  controlRow: { flexDirection: 'row', justifyContent: 'space-evenly', gap: 16 },
  controlBtn: {
    width: 76, height: 76, borderRadius: 38,
    justifyContent: 'center', alignItems: 'center', gap: 4,
    borderWidth: 1,
  },
  controlLabel: { fontSize: 10, fontWeight: '600', position: 'absolute', bottom: -22 },
  bigBtn: {
    width: 70, height: 70, borderRadius: 35,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  hangupBtn: { backgroundColor: '#E74C3C', shadowColor: '#E74C3C' },
  acceptBtn: { backgroundColor: '#27AE60', shadowColor: '#27AE60' },
  declineBtn: { backgroundColor: '#E74C3C', shadowColor: '#E74C3C' },
  incomingRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 40 },
});