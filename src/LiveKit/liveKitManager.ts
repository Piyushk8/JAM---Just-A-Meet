// lib/livekitManager.ts
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
  type LocalParticipant,
  type LocalTrackPublication,
} from "livekit-client";

export class LiveKitManager {
  room: Room | null = null;
  private subscribedToTrackIDs: Set<string>;
  private pendingToSubscribeToTrackIDs: Set<string>;
  constructor() {
    this.subscribedToTrackIDs = new Set<string>();
    this.pendingToSubscribeToTrackIDs = new Set<string>();
  }
  async join(opts: {
    url: string;
    token: string;
    enableAudio?: boolean;
    enableVideo?: boolean;
  }) {
    const { url, token, enableAudio = true, enableVideo = false } = opts;

    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    });

    // (optional) warm up the connection early
    this.room.prepareConnection(url, token);

    // wire events
    this.room
      .on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed)
      .on(RoomEvent.ParticipantConnected, this.handleParticipantConnected)
      .on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed)
      .on(RoomEvent.ActiveSpeakersChanged, this.handleActiveSpeakersChanged)
      .on(RoomEvent.Disconnected, this.handleDisconnected)
      .on(RoomEvent.LocalTrackUnpublished, this.handleLocalTrackUnpublished)
      .on(
        RoomEvent.AudioPlaybackStatusChanged,
        this.handleAudioPlaybackStatusChanged
      );
    // this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    //   console.log(
    //     "[LiveKit] Subscribed to track:",
    //     track.kind,
    //     "from",
    //     participant.identity
    //   );
    // });

    // this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
    //   console.log(
    //     "[LiveKit] Unsubscribed from track:",
    //     track.kind,
    //     "from",
    //     participant.identity
    //   );
    // });

    this.room.on(
      RoomEvent.TrackSubscribed,
      (track, publication, participant) => {
        const el = track.attach();
        document.getElementById("livekit-container")?.appendChild(el);
      }
    );

    await this.room.connect(url, token, {
      autoSubscribe: false,
    });
    console.log("connected to room", this.room.name);

    // publish local media
    const p = this.room.localParticipant;
    if (enableVideo || enableAudio) {
      // you can also do: await this.room.localParticipant.enableCameraAndMicrophone();
      if (enableVideo) await p.setCameraEnabled(true);
      if (enableAudio) await p.setMicrophoneEnabled(true);
    }

    return this.room;
  }

  toggleAudio() {
    if (!this.room) return false;
    const lp = this.room.localParticipant;
    lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled);
    return lp.isMicrophoneEnabled;
  }

  toggleVideo() {
    if (!this.room) return false;
    const lp = this.room.localParticipant;
    lp.setCameraEnabled(!lp.isCameraEnabled);
    return lp.isCameraEnabled;
  }

  cleanup() {
    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }
  }
  syncSubscriptions(entered: string[], left: string[]) {
    if (!this.room) return;
    for (const p of entered) this.subscribeIdentity(p);
    for (const p of left) this.unSubscribeIdentity(p);
  }

  private subscribeIdentity(identity: string) {
    if (!this.room || !identity) return;
    if (this.subscribedToTrackIDs.has(identity)) return;
    // look for the identity in room incase it has not joined the room yet it will be sent to pending
    const p = this.findRemote(identity);
    if (!p) {
      this.pendingToSubscribeToTrackIDs.add(identity);
      return;
    }

    //gets the Track Publications (audio,video etc) and attach the subscription to all of them
    p.getTrackPublications().forEach((pub) => {
      (pub as RemoteTrackPublication).setSubscribed(true);
    });
    // adds to subscription set for tracking
    this.subscribedToTrackIDs.add(identity);
  }
  private unSubscribeIdentity(identity: string) {
    if (!this.room || !identity) return;
    if (!this.subscribedToTrackIDs.has(identity)) return;
    const p = this.findRemote(identity);
    if (!p) {
      this.pendingToSubscribeToTrackIDs.delete(identity);
      return;
    }
    p.getTrackPublications().forEach((pub) => {
      (pub as RemoteTrackPublication).setSubscribed(false);
    });
    this.subscribedToTrackIDs.delete(identity);
  }

  private findRemote(identity: string): RemoteParticipant | undefined {
    if (!this.room || !identity) return; // Only return if room or identity is missing

    // checks for this identity in all participants in the room
    for (const p of this.room.remoteParticipants.values()) {
      console.log("all parts",p,identity)
      if (p.identity == identity) return p;
    }
    return undefined;
  }

  // ---- event handlers ----
  private handleParticipantConnected(p: RemoteParticipant) {
    if (!this.room) return;

    if (this.pendingToSubscribeToTrackIDs.has(p.identity)) {
      this.subscribedToTrackIDs.add(p.identity);
      p.getTrackPublications().forEach((p) =>
        (p as RemoteTrackPublication).setSubscribed(true)
      );
      this.pendingToSubscribeToTrackIDs.delete(p.identity);
    }
  }
  private handleTrackSubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
      const el = track.attach(); // creates <video>/<audio> for you
      document.getElementById("livekit-container")?.appendChild(el);
    }
  };

  private handleTrackUnsubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    track.detach().forEach((el) => el.remove());
  };

  private handleLocalTrackUnpublished = (
    publication: LocalTrackPublication,
    participant: LocalParticipant
  ) => {
    publication.track?.detach().forEach((el) => el.remove());
  };

  private handleActiveSpeakersChanged = () => {
    // update UI for active speakers if you want
  };

  private handleDisconnected = () => {
    console.log("disconnected from room");
  };

  private handleAudioPlaybackStatusChanged = () => {
    if (!this.room) return;
    if (!this.room.canPlaybackAudio) {
      // Must call startAudio() from a user gesture
      const btn = document.createElement("button");
      btn.textContent = "Click to enable audio";
      btn.onclick = () => this.room?.startAudio().then(() => btn.remove());
      document.body.appendChild(btn);
    }
  };
}
