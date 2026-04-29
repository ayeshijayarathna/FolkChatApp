import firestore from '@react-native-firebase/firestore';

export type CallStatus = 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed';
export type CallType = 'voice' | 'video';

export interface CallDoc {
  id?: string;
  channelName: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  callType: CallType;
  status: CallStatus;
  createdAt: any;
  endedAt?: any;
  duration?: number;
}

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

class CallSignalingService {
  private callsRef = firestore().collection('calls');
  private notifRef = firestore().collection('notifications');

  async initiateCall(call: Omit<CallDoc, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const ref = await this.callsRef.add({
      ...call,
      status: 'ringing' as CallStatus,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    try {
      await this.notifRef.add({
        toUserId: call.receiverId,
        fromUserId: call.callerId,
        fromUserName: call.callerName,
        fromUserAvatar: call.callerAvatar,
        type: call.callType === 'video' ? 'incoming_video_call' : 'incoming_voice_call',
        callId: ref.id,
        message: `${call.callerName} is ${call.callType === 'video' ? 'video calling' : 'calling'} you`,
        read: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch { }

    return ref.id;
  }

  async acceptCall(callId: string): Promise<void> {
    await this.callsRef.doc(callId).update({ status: 'accepted' });
  }

  async declineCall(callId: string): Promise<void> {
    await this.callsRef.doc(callId).update({
      status: 'declined',
      endedAt: firestore.FieldValue.serverTimestamp(),
    });
  }

  async endCall(callId: string, duration: number = 0): Promise<void> {
    await this.callsRef.doc(callId).update({
      status: 'ended',
      endedAt: firestore.FieldValue.serverTimestamp(),
      duration,
    });

    try {
      const snap = await this.callsRef.doc(callId).get();
      const call = snap.data() as CallDoc | undefined;
      if (call && duration > 0) {
        await this.notifRef.add({
          toUserId: call.receiverId,
          fromUserId: call.callerId,
          fromUserName: call.callerName,
          fromUserAvatar: call.callerAvatar,
          type: call.callType === 'video' ? 'video_call_ended' : 'voice_call_ended',
          callId,
          message: `${call.callType === 'video' ? 'Video' : 'Voice'} call - ${fmtDuration(duration)}`,
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch { }
  }

  async markMissed(callId: string): Promise<void> {
    try {
      await this.callsRef.doc(callId).update({
        status: 'missed',
        endedAt: firestore.FieldValue.serverTimestamp(),
      });

      const snap = await this.callsRef.doc(callId).get();
      const call = snap.data() as CallDoc | undefined;
      if (call) {
        await this.notifRef.add({
          toUserId: call.receiverId,
          fromUserId: call.callerId,
          fromUserName: call.callerName,
          fromUserAvatar: call.callerAvatar,
          type: call.callType === 'video' ? 'missed_video_call' : 'missed_voice_call',
          callId,
          message: `Missed ${call.callType === 'video' ? 'video' : 'voice'} call from ${call.callerName}`,
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch { }
  }

  listenToCall(callId: string, callback: (call: CallDoc | null) => void) {
    return this.callsRef.doc(callId).onSnapshot(
      snap => callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as CallDoc) : null),
      () => callback(null),
    );
  }

  listenForIncoming(userId: string, callback: (call: CallDoc | null) => void) {
    return this.callsRef
      .where('receiverId', '==', userId)
      .where('status', '==', 'ringing')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .onSnapshot(
        snap => {
          if (snap.empty) { callback(null); return; }
          const doc = snap.docs[0];
          const data = doc.data();
          const created = data.createdAt?.toDate?.() || new Date(0);
          if (Date.now() - created.getTime() > 60000) {
            callback(null);
            return;
          }
          callback({ id: doc.id, ...data } as CallDoc);
        },
        () => callback(null),
      );
  }
}

export const callSignaling = new CallSignalingService();