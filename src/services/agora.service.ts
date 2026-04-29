import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcConnection,
  IRtcEngineEventHandler,
} from 'react-native-agora';
import { PermissionsAndroid, Platform } from 'react-native';
import { AGORA_APP_ID } from '../config/keys';

export type CallType = 'voice' | 'video';

export interface CallEvents {
  onUserJoined?: (uid: number) => void;
  onUserOffline?: (uid: number) => void;
  onJoinChannelSuccess?: (channel: string, uid: number) => void;
  onLeaveChannel?: () => void;
  onError?: (err: number, msg: string) => void;
  onConnectionStateChanged?: (state: number, reason: number) => void;
}

class AgoraCallService {
  private engine: IRtcEngine | null = null;
  private currentChannel: string = '';
  private events: CallEvents = {};

  /*permissions*/
  async requestPermissions(callType: CallType): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    const perms = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
    if (callType === 'video') perms.push(PermissionsAndroid.PERMISSIONS.CAMERA);
    try {
      const granted = await PermissionsAndroid.requestMultiple(perms);
      return Object.values(granted).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
    } catch {
      return false;
    }
  }

  /*initialize engine*/
  initEngine(callType: CallType, events: CallEvents = {}) {
    this.events = events;
    if (this.engine) return;

    this.engine = createAgoraRtcEngine();
    this.engine.initialize({
      appId: AGORA_APP_ID,
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
    });

    if (callType === 'video') {
      this.engine.enableVideo();
      this.engine.startPreview();
    } else {
      this.engine.disableVideo();
    }
    this.engine.enableAudio();

    const handler: IRtcEngineEventHandler = {
      onJoinChannelSuccess: (conn: RtcConnection, _elapsed: number) => {
        this.events.onJoinChannelSuccess?.(conn.channelId || '', conn.localUid || 0);
      },
      onUserJoined: (_conn: RtcConnection, uid: number) => {
        this.events.onUserJoined?.(uid);
      },
      onUserOffline: (_conn: RtcConnection, uid: number) => {
        this.events.onUserOffline?.(uid);
      },
      onLeaveChannel: () => {
        this.events.onLeaveChannel?.();
      },
      onError: (err: number, msg: string) => {
        console.log('[Agora] Error:', err, msg);
        this.events.onError?.(err, msg);
      },
      onConnectionStateChanged: (_conn: RtcConnection, state: number, reason: number) => {
        this.events.onConnectionStateChanged?.(state, reason);
      },
    };
    this.engine.registerEventHandler(handler);
  }

  async joinChannel(channelName: string, uid: number = 0): Promise<void> {
    if (!this.engine) throw new Error('Engine not initialized');
    this.currentChannel = channelName;
    await this.engine.joinChannel('', channelName, uid, {
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    });
  }

  /*toggle mute */
  setMuted(muted: boolean) {
    this.engine?.muteLocalAudioStream(muted);
  }

  /*video on,off*/
  setVideoEnabled(enabled: boolean) {
    this.engine?.muteLocalVideoStream(!enabled);
  }

  /*switch font camara */
  switchCamera() {
    this.engine?.switchCamera();
  }

  /*speaker */
  setSpeakerphone(enabled: boolean) {
    this.engine?.setEnableSpeakerphone(enabled);
  }

  /*leave chanel*/
  async leave(): Promise<void> {
    try {
      await this.engine?.leaveChannel();
      this.engine?.release();
    } catch { }
    this.engine = null;
    this.currentChannel = '';
    this.events = {};
  }

  getEngine() { return this.engine; }
  getChannel() { return this.currentChannel; }
}

export const agoraCallService = new AgoraCallService();