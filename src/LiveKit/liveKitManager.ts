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
  LocalVideoTrack,
  LocalAudioTrack,
  createLocalVideoTrack,
  createLocalAudioTrack,
  ConnectionState,
} from "livekit-client";

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

  private localVideoTrack?: LocalVideoTrack;
  private localAudioTrack?: LocalAudioTrack;
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
      console.log("Already connected to room");
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
      //warming up the connection early

      this.room.prepareConnection(url, token);

      await this.room.connect(url, token, {
        autoSubscribe: false,
      });
      console.log("connected to room", this.room.name);

      if (enableVideo) this.enableVideo();
      //? if(enableAudio) this.enableAudio()

      // publish local media
      const p = this.room.localParticipant;
      if (enableVideo || enableAudio) {
        if (enableVideo) await p.setCameraEnabled(true);
        if (enableAudio) await p.setMicrophoneEnabled(true);
      }
      this.managerState = "connected";
      return this.room;
    } catch (error) {
      console.log("error joining room");
      this.managerState = "failed";
      //? this.forceDisconnect()
      return null;
    }
  }

  async toggleVideo(enable: boolean): Promise<boolean> {
    return this.withVideoLock(async () => {
      // if (!this.canPerformOperation()) {
      //   console.warn(
      //     "Cannot toggle video: not connected or operation in progress"
      //   );
      //   return !enable;
      // }

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
      console.log("Creating video track...");

      // Creates track with timeout (sometimes causes timeout issus otherwise)
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
      console.log("Video track created successfully");

      console.log("Publishing video track...");
      this.room.localParticipant.publishTrack(track),
        console.log("Video track published successfully");

      await this.createVideoPreview(track);
      console.log("Video preview created");
    } catch (error) {
      console.error("Failed to enable video:", error);

      // Cleanup on failure
      if (this.videoState.track) {
        try {
          this.videoState.track.stop();
        } catch (cleanupError) {
          console.warn("Error stopping track during cleanup:", cleanupError);
        }
        this.videoState.track = undefined;
      }

      throw error;
    } finally {
      this.videoState.isPublishing = false;
    }
  }

  private async disableVideo(): Promise<void> {
    if (!this.videoState.track || this.videoState.isUnpublishing) {
      console.log("No video track to disable or disable in progress");
      return;
    }

    this.videoState.isUnpublishing = true;
    this.videoState.lastError = undefined;

    try {
      console.log("Disabling video...");

      this.removeVideoPreview();

      // Detach track elements from dom
      if (this.videoState.track) {
        try {
          const elements = this.videoState.track.detach();
          elements.forEach((el) => {
            try {
              if (el.parentNode) {
                el.parentNode.removeChild(el);
              }
            } catch (err) {
              console.warn("Error removing video element:", err);
            }
          });
        } catch (detachError) {
          console.warn("Error detaching video elements:", detachError);
        }

        if (this.room && this.room.state === ConnectionState.Connected) {
          try {
            console.log("Unpublishing video track...");
            this.room.localParticipant.unpublishTrack(this.videoState.track),
              console.log("Video track unpublished successfully");
          } catch (unpublishError) {
            console.warn("Failed to unpublish video track:", unpublishError);
          }
        }

        try {
          this.videoState.track.stop();
          console.log("Video track stopped");
        } catch (stopError) {
          console.warn("Error stopping video track:", stopError);
        }

        this.videoState.track = undefined;
      }

      console.log("Video disabled successfully");
    } catch (error) {
      console.error("Failed to disable video:", error);
      throw error;
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
          this.handleAutoplayBlocked(container);
        });
      };

      // Clears container for previous node and adds new node video
      this.clearContainer(container);
      container.appendChild(videoElement);
      this.videoState.element = videoElement;
    } catch (error) {
      console.error("Error creating video preview:", error);
      throw error;
    }
  }

  private removeVideoPreview(): void {
    if (this.videoState.element) {
      try {
        if (this.videoState.element instanceof HTMLVideoElement) {
          this.videoState.element.pause();
          this.videoState.element.srcObject = null;
        }
        if (this.videoState.element.parentNode) {
          this.videoState.element.parentNode.removeChild(
            this.videoState.element
          );
        }
      } catch (error) {
        console.warn("Error removing video preview:", error);
      }
      this.videoState.element = undefined;
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
          await this.disableVideo();
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
    }
    try {
      this.audioState.isPublishing = true;
      this.audioState.lastError = undefined;

      const track = await Promise.race([
        createLocalAudioTrack(),
        this.createTimeoutPromise<LocalAudioTrack>(500, "toggle audio timeout"),
      ]);

      this.audioState.track = track;

      await Promise.race([
        this.room?.localParticipant.publishTrack(track),
        this.createTimeoutPromise(5000, "Audio track publish timeout"),
      ]);

      console.log("audio successfully enabled");
    } catch (error) {
      if (this.audioState.track) {
        try {
          this.audioState.track.stop();
        } catch (error) {
          console.warn("error cleanup on failed enable audio");
        } finally {
          this.audioState.isPublishing = false;
        }
      }
    }
  }

  private async disableAudio(): Promise<void> {
    if (!this.audioState.track || this.audioState.isUnpublishing) {
      console.log("No audio track to disable or disable in progress");
      return;
    }

    this.audioState.isUnpublishing = true;
    this.audioState.lastError = undefined;

    try {
      console.log("Disabling audio...");

      if (this.room && this.room.state === ConnectionState.Connected) {
        try {
          await Promise.race([
            this.room.localParticipant.unpublishTrack(this.audioState.track),
            this.createTimeoutPromise(5000, "Audio track unpublish timeout"),
          ]);
          console.log("Audio track unpublished successfully");
        } catch (unpublishError) {
          console.warn("Failed to unpublish audio track:", unpublishError);
        }
      }

      try {
        this.audioState.track.stop();
        console.log("Audio track stopped");
      } catch (stopError) {
        console.warn("Error stopping audio track:", stopError);
      }

      this.audioState.track = undefined;
      console.log("Audio disabled successfully");
    } catch (error) {
      console.error("Failed to disable audio:", error);
      throw error;
    } finally {
      this.audioState.isUnpublishing = false;
    }
  }

  async cleanup(): Promise<void> {
    console.log("Starting LiveKit cleanup...");
    this.managerState = "disconnected";

    // Wait for any pending operations to complete or timeout
    try {
      await Promise.race([
        //Add in audio operation too
        Promise.all([this.videoOperationLock]),
        this.createTimeoutPromise(3000, "Cleanup timeout"),
      ]);
    } catch (error) {
      console.warn("Timeout waiting for operations to complete during cleanup");
    }

    // Force cleanup of tracks
    await this.forceCleanupTracks();

    // Disconnect room
    await this.forceDisconnect();

    // Clear state
    this.subscribedToTrackIDs.clear();
    this.pendingToSubscribeToTrackIDs.clear();

    console.log("LiveKit cleanup completed");
  }

  private async forceCleanupTracks(): Promise<void> {
    // Cleanup video
    if (this.videoState.track) {
      try {
        this.videoState.track.stop();
      } catch (error) {
        console.warn("Error stopping video track:", error);
      }
      this.videoState.track = undefined;
    }
    this.removeVideoPreview();

    // Cleanup audio
    if (this.audioState.track) {
      try {
        this.audioState.track.stop();
      } catch (error) {
        console.warn("Error stopping audio track:", error);
      }
      this.audioState.track = undefined;
    }

    // Reset states
    this.videoState = { isPublishing: false, isUnpublishing: false };
    this.audioState = { isPublishing: false, isUnpublishing: false };
  }

  private async forceDisconnect(): Promise<void> {
    if (this.room) {
      try {
        this.room.disconnect();
      } catch (error) {
        console.warn("Error disconnecting room:", error);
      }
      this.room = null;
    }
  }

  syncSubscriptions(entered: string[], left: string[]) {
    console.log("thisroom", this.room);
    if (!this.room) return;
    console.log("connecting users in livekit", entered, left);
    for (const p of entered) this.subscribeIdentity(p);
    for (const p of left) this.unSubscribeIdentity(p);
    // console.log("sync end")
  }

  //  This first checks for identity in the room in case it has not joined in and sends to pending queue
  private subscribeIdentity(identity: string) {
    if (!this.room || !identity) return;
    console.log("subscribing to this identity", identity);
    if (this.subscribedToTrackIDs.has(identity)) return;
    const p = this.findRemote(identity);
    console.log("new remote user added", p);
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
  //  This first checks for identity in the room in case it has not joined in and sends to pending queue
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

  // just llooks for users(remote) in the room
  private findRemote(identity: string): RemoteParticipant | undefined {
    if (!this.room || !identity) return; // Only return if room or identity is missing

    // checks for this identity in all participants in the room
    for (const p of this.room.remoteParticipants.values()) {
      console.log("all parts", p, identity);
      if (p.identity == identity) return p;
    }
    return undefined;
  }

  // --- Event Handlers ---
  private SetUpEventHandlers() {
    if (!this.room) return;

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
    this.room.on(
      RoomEvent.TrackSubscribed,
      (track, publication, participant) => {
        console.log(
          "[LiveKit] Subscribed to track:",
          track.kind,
          "from",
          participant.identity
        );
      }
    );

    this.room.on(
      RoomEvent.TrackUnsubscribed,
      (track, publication, participant) => {
        console.log(
          "[LiveKit] Unsubscribed from track:",
          track.kind,
          "from",
          participant.identity
        );
      }
    );
  }

  // ---- event handlers ----
  //  This subs to users who are now connected to us first checks the pending queue and subs then delete from the queue
  private handleParticipantConnected = (p: RemoteParticipant) => {
    if (!this.room) return;

    if (this.pendingToSubscribeToTrackIDs.has(p.identity)) {
      this.subscribedToTrackIDs.add(p.identity);
      p.getTrackPublications().forEach((pub) =>
        (pub as RemoteTrackPublication).setSubscribed(true)
      );
      this.pendingToSubscribeToTrackIDs.delete(p.identity);
    }
  };

  // this allows us to attach the video and audio components to our screen
  private handleTrackSubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
      const el = track.attach();
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
      const btn = document.createElement("button");
      btn.textContent = "Click to enable audio";
      btn.onclick = () => this.room?.startAudio().then(() => btn.remove());
      document.body.appendChild(btn);
    }
  };

  // -- utility tools
  private createTimeoutPromise<T>(ms: number, message: string): Promise<T> {
    return new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  private handleAutoplayBlocked(container: HTMLElement): void {
    const playButton = document.createElement("button");
    playButton.textContent = "▶️ Play Video";
    playButton.style.position = "absolute";
    playButton.style.top = "50%";
    playButton.style.left = "50%";
    playButton.style.transform = "translate(-50%, -50%)";
    playButton.style.zIndex = "10";
    playButton.style.background = "rgba(0,0,0,0.8)";
    playButton.style.color = "white";
    playButton.style.border = "none";
    playButton.style.padding = "8px 16px";
    playButton.style.borderRadius = "4px";
    playButton.style.cursor = "pointer";

    playButton.onclick = () => {
      const videoElement = container.querySelector(
        "#local-video"
      ) as HTMLVideoElement;
      if (videoElement) {
        videoElement
          .play()
          .then(() => {
            playButton.remove();
          })
          .catch((error) => {
            console.error("Failed to play video:", error);
          });
      }
    };

    container.style.position = "relative";
    container.appendChild(playButton);
  }

  private clearContainer(container: HTMLElement): void {
    try {
      // Only clear local video, preserve remote participants
      const localVideo = container.querySelector("#local-video");
      if (localVideo) {
        localVideo.remove();
      }
    } catch (error) {
      console.warn("Error clearing container:", error);
    }
  }

  /**
   *
   * @param operation utitlity function that just adds a chain of promises to the 'videoOperationLock'
   * as multiple operation triggered can be challeng9ing to handle so this handles each new call after previous one finishes
   * (otherwise causes concurrency issues between existing operations)
   * @returns Promise<T> - return promise of same ooperation passed
   */
  private async withVideoLock<T>(operation: () => Promise<T>): Promise<T> {
    this.videoOperationLock = this.videoOperationLock.then(async () => {
      return await operation();
    });
    return this.videoOperationLock as Promise<T>;
  }
  private async withAudioLock<T>(operation: () => Promise<T>): Promise<T> {
    this.audioOperationLock = this.audioOperationLock.then(async () => {
      return await operation();
    });
    return this.videoOperationLock as Promise<T>;
  }
}

export const liveKitManager = LiveKitManager.getInstance();
