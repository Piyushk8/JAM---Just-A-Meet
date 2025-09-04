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
  LocalVideoTrack,
  LocalAudioTrack,
  createLocalVideoTrack,
  createLocalAudioTrack,
  ConnectionState,
} from "livekit-client";

import { setLogLevel, LogLevel } from "livekit-client";

setLogLevel(LogLevel.warn);

type ManagerState =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "failed"
  | "disconnected";

interface TrackState {
  track?: LocalVideoTrack | LocalAudioTrack;
  isPublishing: boolean;
  isUnpublishing: boolean;
  element?: HTMLElement;
  lastError?: string;
}

class LiveKitManager {
  room: Room | null = null;
  private subscribedToTrackIDs: Set<string>;
  private pendingToSubscribeToTrackIDs: Set<string>;
  private static instance: LiveKitManager;

  public managerState: ManagerState = "disconnected";
  private videoState: TrackState = {
    isPublishing: false,
    isUnpublishing: false,
  };
  private audioState: TrackState = {
    isPublishing: false,
    isUnpublishing: false,
  };

  private videoOperationLock: Promise<unknown> = Promise.resolve();
  private audioOperationLock: Promise<unknown> = Promise.resolve();

  private trackSubscribedCallbacks: ((
    participantId: string,
    track: RemoteTrack,
    publication: RemoteTrackPublication
  ) => void)[] = [];
  private trackUnsubscribedCallbacks: ((
    participantId: string,
    track: RemoteTrack,
    publication: RemoteTrackPublication
  ) => void)[] = [];

  constructor() {
    this.subscribedToTrackIDs = new Set<string>();
    this.pendingToSubscribeToTrackIDs = new Set<string>();
  }

  public static getInstance(): LiveKitManager {
    if (LiveKitManager.instance) return LiveKitManager.instance;
    LiveKitManager.instance = new LiveKitManager();
    return LiveKitManager.instance;
  }

  async join(opts: {
    url: string;
    token: string;
    enableAudio?: boolean;
    enableVideo?: boolean;
  }) {
    const { url, token, enableAudio = true, enableVideo = false } = opts;
    if (this.managerState === "connecting") {
      throw new Error("Already connecting to room");
    }

    if (this.room && this.room.state === ConnectionState.Connected) {
      return this.room;
    }

    try {
      this.managerState = "connecting";

      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      });

      this.SetUpEventHandlers();

      // Warming up the connection early
      this.room.prepareConnection(url, token);

      await this.room.connect(url, token, {
        autoSubscribe: false,
      });
      console.log("connected to room", this.room.name);

      if (enableVideo) {
        try {
          await this.enableVideo();
        } catch (error) {
          console.warn("Failed to enable video on join:", error);
        }
      }

      // Publish local media
      const p = this.room.localParticipant;
      if (enableVideo || enableAudio) {
        try {
          if (enableVideo) await p.setCameraEnabled(true);
          if (enableAudio) await p.setMicrophoneEnabled(true);
        } catch (error) {
          console.warn("Failed to enable camera/microphone:", error);
        }
      }

      this.managerState = "connected";
      console.log("attempt complete", this.room);
      return this.room;
    } catch (error) {
      console.error("Error joining room:", error);
      this.managerState = "failed";
      await this.safeForceDisconnect();
      return null;
    }
  }

  // ----------- VIDEO  --------------
  async toggleVideo(enable: boolean): Promise<boolean> {
    return this.withVideoLock(async () => {
      try {
        if (enable) {
          await this.enableVideo();
          return true;
        } else {
          await this.disableVideo();
          return false;
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error("Video toggle failed:", error);
          this.videoState.lastError = error.message;
        }
        return !enable;
      }
    });
  }

  private async enableVideo(): Promise<void> {
    if (!this.room || this.videoState.track || this.videoState.isPublishing) {
      console.log("Video already enabled or enabling in progress");
      return;
    }

    this.videoState.isPublishing = true;
    this.videoState.lastError = undefined;

    try {
      // Creates track with timeout for local previews
      const track = await Promise.race([
        createLocalVideoTrack({
          resolution: VideoPresets.h720.resolution,
          facingMode: "user",
        }),
        this.createTimeoutPromise<LocalVideoTrack>(
          5000,
          "Video track creation timeout"
        ),
      ]);

      this.videoState.track = track;

      await this.room.localParticipant.publishTrack(track);

      // await this.createVideoPreview(track);
      // console.log("Video preview created");
    } catch (error) {
      console.error("Failed to enable video:", error);
      await this.safeCleanupVideoTrack();
      throw error;
    } finally {
      this.videoState.isPublishing = false;
    }
  }

  private async disableVideo(): Promise<void> {
    if (!this.videoState.track || this.videoState.isUnpublishing) return;

    this.videoState.isUnpublishing = true;

    try {
      // Safely detach elements from DOM
      await this.safeDetachTrack(this.videoState.track);

      if (this.room?.state === ConnectionState.Connected) {
        try {
          await Promise.race([
            this.room.localParticipant.unpublishTrack(this.videoState.track),
            this.createTimeoutPromise(3000, "Video unpublish timeout"),
          ]);
        } catch (err) {
          console.warn("Unpublish failed:", err);
        }
      }

      await this.safeStopTrack(this.videoState.track);
      this.videoState.track = undefined;
      this.videoState.element = undefined;
    } catch (error) {
      console.error("Error during video disable:", error);
    } finally {
      this.videoState.isUnpublishing = false;
    }
  }

  private async createVideoPreview(track: LocalVideoTrack): Promise<void> {
    try {
      const container = document.getElementById("livekit-container");
      if (!container) {
        console.warn("Video container not found");
        return;
      }

      const videoElement = track.attach() as HTMLVideoElement;
      if (!videoElement) {
        console.warn("Failed to attach video track");
        return;
      }

      videoElement.muted = true;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.style.width = "100%";
      videoElement.style.height = "100%";
      videoElement.style.objectFit = "cover";
      videoElement.style.borderRadius = "4px";
      videoElement.id = "local-video";

      videoElement.onloadedmetadata = () => {
        videoElement.play().catch((err) => {
          console.warn("Video autoplay blocked:", err);
        });
      };

      container.appendChild(videoElement);
      this.videoState.element = videoElement;
    } catch (error) {
      console.error("Error creating video preview:", error);
      throw error;
    }
  }

  // -------------------
  // MIC
  // -------------------
  async toggleAudio(enable: boolean): Promise<boolean> {
    return this.withAudioLock(async () => {
      try {
        if (enable) {
          await this.enableAudio();
          return true;
        } else {
          await this.disableAudio();
          return false;
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error("Audio toggle failed:", error);
          this.audioState.lastError = error.message;
        }
        return !enable;
      }
    });
  }

  async enableAudio() {
    if (!this.room || this.audioState.isPublishing || this.audioState.track) {
      console.log(
        "room doesnt exist or already published or publishing audio progress"
      );
      return;
    }

    try {
      this.audioState.isPublishing = true;
      this.audioState.lastError = undefined;

      const track = await Promise.race([
        createLocalAudioTrack(),
        this.createTimeoutPromise<LocalAudioTrack>(
          5000,
          "toggle audio timeout"
        ),
      ]);

      this.audioState.track = track;

      await Promise.race([
        this.room?.localParticipant.publishTrack(track),
        this.createTimeoutPromise(5000, "Audio track publish timeout"),
      ]);
    } catch (error) {
      console.error("Failed to enable audio:", error);
      await this.safeCleanupAudioTrack();
      throw error;
    } finally {
      this.audioState.isPublishing = false;
    }
  }

  private async disableAudio(): Promise<void> {
    if (!this.audioState.track || this.audioState.isUnpublishing) {
      return;
    }

    this.audioState.isUnpublishing = true;
    this.audioState.lastError = undefined;

    try {
      if (this.room && this.room.state === ConnectionState.Connected) {
        try {
          await Promise.race([
            this.room.localParticipant.unpublishTrack(this.audioState.track),
            this.createTimeoutPromise(3000, "Audio track unpublish timeout"),
          ]);
        } catch (unpublishError) {
          console.warn("Failed to unpublish audio track:", unpublishError);
        }
      }

      await this.safeStopTrack(this.audioState.track);
      this.audioState.track = undefined;
    } catch (error) {
      console.error("Failed to disable audio:", error);
    } finally {
      this.audioState.isUnpublishing = false;
    }
  }

  // -------------  SYNC LOGIC RESIDE HERE
  syncSubscriptions(entered: string[], left: string[]) {
    if (!this.room || this.room.state !== ConnectionState.Connected) {
      console.warn("Cannot sync subscriptions: room not connected");
      return;
    }

    try {
      for (const p of entered) this.subscribeIdentity(p);
      for (const p of left) this.unSubscribeIdentity(p);
    } catch (error) {
      console.error("Error syncing subscriptions:", error);
    }
  }

  private subscribeIdentity(identity: string) {
    if (!this.room || !identity) return;

    try {
      const p = this.findRemote(identity);
      if (!p) {
        this.pendingToSubscribeToTrackIDs.add(identity);
        return;
      }

      // Get all track publications and subscribe
      const publications = p.getTrackPublications();
      if (publications.length == 0) {
        this.pendingToSubscribeToTrackIDs.add(identity);
      }

      publications.forEach((pub) => {
        try {
          if ((pub as RemoteTrackPublication).isSubscribed) return;
          (pub as RemoteTrackPublication).setSubscribed(true);
        } catch (error) {
          console.error(
            `❌ Failed to subscribe to ${pub.kind} from ${identity}:`,
            error
          );
        }
      });

      this.subscribedToTrackIDs.add(identity);
    } catch (error) {
      console.error("Error in subscribeIdentity:", error);
    }
  }

  public forceRefreshAllSubscriptions() {
    if (!this.room) {
      return;
    }

    try {
      // Re-subscribe to all current remote participants
      this.room.remoteParticipants.forEach((participant) => {
        try {
          participant.getTrackPublications().forEach((pub) => {
            try {
              (pub as RemoteTrackPublication).setSubscribed(true);
            } catch (error) {
              console.error(`❌ Failed to re-subscribe to ${pub.kind}:`, error);
            }
          });

          this.subscribedToTrackIDs.add(participant.identity);
        } catch (error) {
          console.error(
            `Error refreshing subscription for ${participant.identity}:`,
            error
          );
        }
      });
    } catch (error) {
      console.error("Error in forceRefreshAllSubscriptions:", error);
    }
  }

  private unSubscribeIdentity(identity: string) {
    if (!this.room || !identity) return;

    try {
      if (!this.subscribedToTrackIDs.has(identity)) {
        return;
      }

      const p = this.findRemote(identity);
      if (!p) {
        this.pendingToSubscribeToTrackIDs.delete(identity);
        this.subscribedToTrackIDs.delete(identity);
        return;
      }

      p.getTrackPublications().forEach((pub) => {
        try {
          (pub as RemoteTrackPublication).setSubscribed(false);
        } catch (error) {
          console.warn(
            `Failed to unsubscribe from track from ${identity}:`,
            error
          );
        }
      });

      this.subscribedToTrackIDs.delete(identity);
    } catch (error) {
      console.error("Error in unSubscribeIdentity:", error);
    }
  }

  // just looks for users(remote) in the room
  private findRemote(identity: string): RemoteParticipant | undefined {
    if (!this.room || !identity) {
      return undefined;
    }

    try {
      // checks for this identity in all participants in the room
      for (const p of this.room.remoteParticipants.values()) {
        if (p.identity === identity) {
          return p;
        }
      }
      return undefined;
    } catch (error) {
      console.error("Error finding remote participant:", error);
      return undefined;
    }
  }

  // ----------------------  Event Handlers   ----- ---
  private SetUpEventHandlers() {
    if (!this.room) return;

    try {
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
        )
        .on(
          RoomEvent.ParticipantDisconnected,
          this.handleParticipantDisconnected
        )
        .on(RoomEvent.TrackPublished, this.handleTrackPublished);
    } catch (error) {
      console.error("Error setting up event handlers:", error);
    }
  }

  private handleTrackPublished = (
    RemoteTrackPublication: RemoteTrackPublication,
    remoteParticipant: RemoteParticipant
  ) => {
    try {
      if (this.room && this.managerState === "connected") {
        if (this.subscribedToTrackIDs.has(remoteParticipant.identity)) {
          this.subscribeIdentity(remoteParticipant.identity);
        }
      }
    } catch (error) {
      console.error("Error in handleTrackPublished:", error);
    }
  };

  private handleParticipantConnected = (p: RemoteParticipant) => {
    try {
      if (!this.room) return;

      console.log("Participant connected:", p.identity);

      if (this.pendingToSubscribeToTrackIDs.has(p.identity)) {
        console.log("Processing pending subscription for:", p.identity);
        this.subscribedToTrackIDs.add(p.identity);

        p.getTrackPublications().forEach((pub) => {
          try {
            (pub as RemoteTrackPublication).setSubscribed(true);
            console.log(
              `Auto-subscribed to ${pub.kind} track from ${p.identity}`
            );
          } catch (error) {
            console.warn(
              `Failed to auto-subscribe to track from ${p.identity}:`,
              error
            );
          }
        });

        this.pendingToSubscribeToTrackIDs.delete(p.identity);
      }
    } catch (error) {
      console.error("Error in handleParticipantConnected:", error);
    }
  };

  private handleParticipantDisconnected = (p: RemoteParticipant) => {
    try {
      console.log("Participant disconnected:", p.identity);
      this.subscribedToTrackIDs.delete(p.identity);
      this.pendingToSubscribeToTrackIDs.delete(p.identity);
    } catch (error) {
      console.error("Error in handleParticipantDisconnected:", error);
    }
  };

  onTrackSubscribed(
    cb: (
      participantId: string,
      track: RemoteTrack,
      publication: RemoteTrackPublication
    ) => void
  ) {
    this.trackSubscribedCallbacks.push(cb);
  }

  onTrackUnsubscribed(
    cb: (
      participantId: string,
      track: RemoteTrack,
      publication: RemoteTrackPublication
    ) => void
  ) {
    this.trackUnsubscribedCallbacks.push(cb);
  }

  private handleTrackSubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    try {
      if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
        this.trackSubscribedCallbacks.forEach((cb) => {
          try {
            cb(participant.identity, track, publication);
          } catch (error) {
            console.warn("Error in track subscribed callback:", error);
          }
        });
      }
    } catch (error) {
      console.error("Error in handleTrackSubscribed:", error);
    }
  };

  private handleTrackUnsubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    try {
      console.log(
        `Track unsubscribed: ${track.kind} from ${participant.identity}`
      );
      this.trackUnsubscribedCallbacks.forEach((cb) => {
        try {
          cb(participant.identity, track, publication);
        } catch (error) {
          console.warn("Error in track unsubscribed callback:", error);
        }
      });
    } catch (error) {
      console.error("Error in handleTrackUnsubscribed:", error);
    }
  };

  private handleLocalTrackUnpublished = (
    publication: LocalTrackPublication,
    participant: LocalParticipant
  ) => {
    // Just detach the track from elements
    publication.track?.detach();
  };

  private handleActiveSpeakersChanged = () => {
    try {
      // update UI for active speakers if you want
    } catch (error) {
      console.error("Error in handleActiveSpeakersChanged:", error);
    }
  };

  private handleDisconnected = () => {
    try {
      console.log("disconnected from room");
      this.managerState = "disconnected";
      this.subscribedToTrackIDs.clear();
      this.pendingToSubscribeToTrackIDs.clear();
    } catch (error) {
      console.error("Error in handleDisconnected:", error);
    }
  };

  private handleAudioPlaybackStatusChanged = () => {
    try {
      if (!this.room) return;
      if (!this.room.canPlaybackAudio) {
        const btn = document.createElement("button");
        btn.textContent = "Click to enable audio";
        btn.onclick = () => this.room?.startAudio().then(() => btn.remove());
        document.body.appendChild(btn);
      }
    } catch (error) {
      console.error("Error in handleAudioPlaybackStatusChanged:", error);
    }
  };

  // -- utility tools
  private createTimeoutPromise<T>(ms: number, message: string): Promise<T> {
    return new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  async cleanup(): Promise<void> {
    try {
      await Promise.race([
        Promise.all([this.videoOperationLock, this.audioOperationLock]),
        this.createTimeoutPromise(3000, "Cleanup timeout"),
      ]);
    } catch {
      console.warn("Timeout waiting for operations to complete during cleanup");
    }

    await this.forceCleanupTracks();
  }

  async cleanupTracks(): Promise<void> {
    await this.forceCleanupTracks();
  }

  // Explicitly leave/disconnect room
  async leaveRoom(): Promise<void> {
    await this.forceCleanupTracks();
    await this.safeForceDisconnect();
    this.subscribedToTrackIDs.clear();
    this.pendingToSubscribeToTrackIDs.clear();
    this.managerState = "disconnected";
  }

  private async forceCleanupTracks(): Promise<void> {
    // Cleanup video
    await this.safeCleanupVideoTrack();
    // Cleanup audio
    await this.safeCleanupAudioTrack();
    this.videoState = { isPublishing: false, isUnpublishing: false };
    this.audioState = { isPublishing: false, isUnpublishing: false };
  }

  private async safeCleanupVideoTrack(): Promise<void> {
    if (this.videoState.track) {
      try {
        await this.safeStopTrack(this.videoState.track);
      } catch (error) {
        console.warn("Error stopping video track:", error);
      }
      this.videoState.track = undefined;
    }
    this.videoState.element = undefined;
  }

  private async safeCleanupAudioTrack(): Promise<void> {
    if (this.audioState.track) {
      try {
        await this.safeStopTrack(this.audioState.track);
      } catch (error) {
        console.warn("Error stopping audio track:", error);
      }
      this.audioState.track = undefined;
    }
  }

  private async safeForceDisconnect(): Promise<void> {
    if (this.room) {
      try {
        this.room.disconnect();
      } catch (error) {
        console.warn("Error disconnecting room:", error);
      }
      this.room = null;
    }
  }

  private async safeDetachTrack(
    track: LocalVideoTrack | LocalAudioTrack
  ): Promise<void> {
    try {
      if (track && typeof track.detach === "function") {
        const elements = track.detach();
        if (Array.isArray(elements)) {
          elements.forEach((element) => {
            try {
              if (element && element.parentNode) {
                element.parentNode.removeChild(element);
              }
            } catch (removeError) {
              console.warn("Error removing track element:", removeError);
            }
          });
        }
      }
    } catch (detachError) {
      console.warn("Error detaching track:", detachError);
    }
  }

  private async safeStopTrack(
    track: LocalVideoTrack | LocalAudioTrack
  ): Promise<void> {
    try {
      if (track && typeof track.stop === "function") {
        track.stop();
      }
    } catch (stopError) {
      console.warn("Error stopping track:", stopError);
    }
  }
  /**
   * @param operation utility function that just adds a chain of promises to the 'videoOperationLock'
   * as multiple operation triggered can be challenging to handle so this handles each new call after previous one finishes
   * (otherwise causes concurrency issues between existing operations)
   * @returns Promise<T> - return promise of same operation passed
   */
  private async withVideoLock<T>(operation: () => Promise<T>): Promise<T> {
    this.videoOperationLock = this.videoOperationLock.then(async () => {
      try {
        return await operation();
      } catch (error) {
        console.error("Error in video operation:", error);
        throw error;
      }
    });
    return this.videoOperationLock as Promise<T>;
  }

  private async withAudioLock<T>(operation: () => Promise<T>): Promise<T> {
    this.audioOperationLock = this.audioOperationLock.then(async () => {
      try {
        return await operation();
      } catch (error) {
        console.error("Error in audio operation:", error);
        throw error;
      }
    });
    return this.audioOperationLock as Promise<T>;
  }
}

export const liveKitManager = LiveKitManager.getInstance();
