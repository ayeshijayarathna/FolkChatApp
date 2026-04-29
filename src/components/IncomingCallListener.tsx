import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { callSignaling } from '../services/callSignaling.service';

function getChatId(a: string, b: string) { return [a, b].sort().join('_'); }

export default function IncomingCallListener() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const handledCallsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = callSignaling.listenForIncoming(user.uid, (call) => {
      if (!call || !call.id) return;
      if (handledCallsRef.current.has(call.id)) return;
      handledCallsRef.current.add(call.id);

      const screen = call.callType === 'video' ? 'VideoCall' : 'VoiceCall';
      navigation.navigate(screen, {
        userId: call.callerId,
        userName: call.callerName,
        userAvatar: call.callerAvatar,
        chatId: getChatId(user.uid, call.callerId),
        isIncoming: true,
        callId: call.id,
        channelName: call.channelName,
      });
    });

    return () => unsub();
  }, [user?.uid, navigation]);

  return null;
}