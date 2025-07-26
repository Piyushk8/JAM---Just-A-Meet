// import { Socket } from 'socket.io-client';

// export interface PeerConnection {
//   userId: string;
//   username: string;
//   connection: RTCPeerConnection;
//   localStream?: MediaStream;
//   remoteStream?: MediaStream;
//   audioElement?: HTMLAudioElement;
//   videoElement?: HTMLVideoElement;
//   distance: number;
//   audioLevel: number;
// }

// export class WebRTCManager {
//   private socket: Socket;
//   private localStream: MediaStream | null = null;
//   private peers: Map<string, PeerConnection> = new Map();
//   private isAudioEnabled = false;
//   private isVideoEnabled = false;
  
//   private rtcConfiguration: RTCConfiguration = {
//     iceServers: [
//       { urls: 'stun:stun.l.google.com:19302' },
//       { urls: 'stun:stun1.l.google.com:19302' }
//     ]
//   };

//   constructor(socket: Socket) {
//     this.socket = socket;
//     this.setupSocketListeners();
//   }

//   private setupSocketListeners() {
//     this.socket.on('webrtc-offer', this.handleOffer.bind(this));
//     this.socket.on('webrtc-answer', this.handleAnswer.bind(this));
//     this.socket.on('webrtc-ice-candidate', this.handleIceCandidate.bind(this));
//     this.socket.on('proximity-entered', this.handleProximityEntered.bind(this));
//     this.socket.on('proximity-left', this.handleProximityLeft.bind(this));
//     this.socket.on('audio-level-updated', this.handleAudioLevelUpdate.bind(this));
//     this.socket.on('user-left', this.handleUserLeft.bind(this));
//   }

//   async initializeMedia(audio: boolean = true, video: boolean = false): Promise<MediaStream | null> {
//     try {
//       this.localStream = await navigator.mediaDevices.getUserMedia({
//         audio: audio,
//         video: video
//       });

//       this.isAudioEnabled = audio;
//       this.isVideoEnabled = video;

//       // Emit media state to server
//       this.socket.emit('media-state-changed', {
//         isAudioEnabled: this.isAudioEnabled,
//         isVideoEnabled: this.isVideoEnabled
//       });

//       return this.localStream;
//     } catch (error) {
//       console.error('Failed to get user media:', error);
//       return null;
//     }
//   }

//   async toggleAudio(): Promise<boolean> {
//     if (this.localStream) {
//       const audioTrack = this.localStream.getAudioTracks()[0];
//       if (audioTrack) {
//         audioTrack.enabled = !audioTrack.enabled;
//         this.isAudioEnabled = audioTrack.enabled;
//       }
//     } else if (!this.isAudioEnabled) {
//       // Initialize audio if not already done
//       await this.initializeMedia(true, this.isVideoEnabled);
//     }

//     this.socket.emit('media-state-changed', {
//       isAudioEnabled: this.isAudioEnabled,
//       isVideoEnabled: this.isVideoEnabled
//     });

//     return this.isAudioEnabled;
//   }

//   async toggleVideo(): Promise<boolean> {
//     if (this.localStream) {
//       const videoTrack = this.localStream.getVideoTracks()[0];
//       if (videoTrack) {
//         videoTrack.enabled = !videoTrack.enabled;
//         this.isVideoEnabled = videoTrack.enabled;
//       }
//     } else if (!this.isVideoEnabled) {
//       await this.initializeMedia(this.isAudioEnabled, true);
//     }

//     this.socket.emit('media-state-changed', {
//       isAudioEnabled: this.isAudioEnabled,
//       isVideoEnabled: this.isVideoEnabled
//     });

//     return this.isVideoEnabled;
//   }

//   private async handleProximityEntered(user: { id: string; username: string; distance: number }) {
//     console.log(`Creating peer connection with ${user.username}`);
//     await this.createPeerConnection(user.id, user.username, user.distance);
//   }

//   private handleProximityLeft(user: { id: string }) {
//     console.log(`Removing peer connection with user ${user.id}`);
//     this.removePeerConnection(user.id);
//   }

//   private handleAudioLevelUpdate(data: { userId: string; audioLevel: number }) {
//     const peer = this.peers.get(data.userId);
//     if (peer) {
//       peer.audioLevel = data.audioLevel;
//       this.updateAudioVolume(peer);
//     }
//   }

//   private handleUserLeft(userId: string) {
//     this.removePeerConnection(userId);
//   }

//   private async createPeerConnection(userId: string, username: string, distance: number) {
//     if (this.peers.has(userId)) return;

//     const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
//     const peer: PeerConnection = {
//       userId,
//       username,
//       connection: peerConnection,
//       distance,
//       audioLevel: 1.0
//     };

//     // Add local stream to peer connection
//     if (this.localStream) {
//       this.localStream.getTracks().forEach(track => {
//         peerConnection.addTrack(track, this.localStream!);
//       });
//     }

//     // Handle remote stream
//     peerConnection.ontrack = (event) => {
//       const [remoteStream] = event.streams;
//       peer.remoteStream = remoteStream;
//       this.setupRemoteAudio(peer);
//     };

//     // Handle ICE candidates
//     peerConnection.onicecandidate = (event) => {
//       if (event.candidate) {
//         this.socket.emit('webrtc-ice-candidate', {
//           targetUserId: userId,
//           candidate: event.candidate
//         });
//       }
//     };

//     this.peers.set(userId, peer);

//     // Create and send offer
//     try {
//       const offer = await peerConnection.createOffer();
//       await peerConnection.setLocalDescription(offer);
      
//       this.socket.emit('webrtc-offer', {
//         targetUserId: userId,
//         offer
//       });
//     } catch (error) {
//       console.error('Error creating offer:', error);
//     }
//   }

//   private async handleOffer(data: { fromUserId: string; fromUsername: string; offer: RTCSessionDescriptionInit }) {
//     const { fromUserId, fromUsername, offer } = data;
    
//     if (this.peers.has(fromUserId)) return;

//     const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
//     const peer: PeerConnection = {
//       userId: fromUserId,
//       username: fromUsername,
//       connection: peerConnection,
//       distance: 0,
//       audioLevel: 1.0
//     };

//     // Add local stream
//     if (this.localStream) {
//       this.localStream.getTracks().forEach(track => {
//         peerConnection.addTrack(track, this.localStream!);
//       });
//     }

//     // Handle remote stream
//     peerConnection.ontrack = (event) => {
//       const [remoteStream] = event.streams;
//       peer.remoteStream = remoteStream;
//       this.setupRemoteAudio(peer);
//     };

//     // Handle ICE candidates
//     peerConnection.onicecandidate = (event) => {
//       if (event.candidate) {
//         this.socket.emit('webrtc-ice-candidate', {
//           targetUserId: fromUserId,
//           candidate: event.candidate
//         });
//       }
//     };

//     this.peers.set(fromUserId, peer);

//     try {
//       await peerConnection.setRemoteDescription(offer);
//       const answer = await peerConnection.createAnswer();
//       await peerConnection.setLocalDescription(answer);
      
//       this.socket.emit('webrtc-answer', {
//         targetUserId: fromUserId,
//         answer
//       });
//     } catch (error) {
//       console.error('Error handling offer:', error);
//     }
//   }

//   private async handleAnswer(data: { fromUserId: string; answer: RTCSessionDescriptionInit }) {
//     const { fromUserId, answer } = data;
//     const peer = this.peers.get(fromUserId);
    
//     if (peer) {
//       try {
//         await peer.connection.setRemoteDescription(answer);
//       } catch (error) {
//         console.error('Error setting remote description:', error);
//       }
//     }
//   }

//   private async handleIceCandidate(data: { fromUserId: string; candidate: RTCIceCandidateInit }) {
//     const { fromUserId, candidate } = data;
//     const peer = this.peers.get(fromUserId);
    
//     if (peer) {
//       try {
//         await peer.connection.addIceCandidate(candidate);
//       } catch (error) {
//         console.error('Error adding ICE candidate:', error);
//       }
//     }
//   }

//   private setupRemoteAudio(peer: PeerConnection) {
//     if (!peer.remoteStream) return;

//     // Create audio element for remote stream
//     const audioElement = document.createElement('audio');
//     audioElement.srcObject = peer.remoteStream;
//     audioElement.autoplay = true;
//     audioElement.playsInline = true;
    
//     // Set initial volume based on distance
//     this.updateAudioVolume(peer);
    
//     peer.audioElement = audioElement;
//     document.body.appendChild(audioElement);
//   }

//   private updateAudioVolume(peer: PeerConnection) {
//     if (peer.audioElement) {
//       // Apply spatial audio based on distance
//       peer.audioElement.volume = Math.max(0, Math.min(1, peer.audioLevel));
//     }
//   }

//   private removePeerConnection(userId: string) {
//     const peer = this.peers.get(userId);
//     if (peer) {
//       // Close peer connection
//       peer.connection.close();
      
//       // Remove audio element
//       if (peer.audioElement) {
//         peer.audioElement.remove();
//       }
      
//       // Remove video element if exists
//       if (peer.videoElement) {
//         peer.videoElement.remove();
//       }
      
//       this.peers.delete(userId);
//     }
//   }

//   getConnectedPeers(): PeerConnection[] {
//     return Array.from(this.peers.values());
//   }

//   getLocalStream(): MediaStream | null {
//     return this.localStream;
//   }

//   isAudioActive(): boolean {
//     return this.isAudioEnabled;
//   }

//   isVideoActive(): boolean {
//     return this.isVideoEnabled;
//   }

//   cleanup() {
//     // Close all peer connections
//     this.peers.forEach((peer) => {
//       this.removePeerConnection(peer.userId);
//     });

//     // Stop local stream
//     if (this.localStream) {
//       this.localStream.getTracks().forEach(track => track.stop());
//       this.localStream = null;
//     }
//   }
// }