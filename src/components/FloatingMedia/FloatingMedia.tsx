// import React, { useRef, useEffect, useState, useCallback } from 'react';
// import { useSelector } from 'react-redux';
// import { tileToPixel, ensureTilePosition, pixelToTile, TILE_SIZE } from '../../lib/helper';
// import type { User } from '@/types/types';
// import { useLiveKit } from '@/LiveKit/LiveKitContext/Context';
// import type { RootState } from '@/Redux';

// interface FloatingMediaOverlaysProps {
//   camera: { x: number; y: number };
//   viewport: { width: number; height: number };
// }

// interface PlayerMediaOverlayProps {
//   user: User;
//   camera: { x: number; y: number };
//   viewport: { width: number; height: number };
//   videoTrack?: any;
//   audioTrack?: any;
// }

// // Individual player media overlay component
// const PlayerMediaOverlay: React.FC<PlayerMediaOverlayProps> = ({
//   user,
//   camera,
//   viewport,
//   videoTrack,
//   audioTrack
// }) => {
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const audioRef = useRef<HTMLAudioElement>(null);
//   const [isVideoReady, setIsVideoReady] = useState(false);

//   // Responsive video sizing based on device type
//   const getVideoSize = useCallback(() => {
//     const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
//                      window.innerWidth <= 768;
    
//     if (isMobile) {
//       return {
//         VIDEO_SIZE: 64,        // Mobile: 2x tile size
//         VIDEO_OFFSET_Y: -76,   // Adjusted for mobile
//         NAME_OFFSET_Y: -8,
//       };
//     } else {
//       return {
//         VIDEO_SIZE: 120,       // Desktop: KumoSpace-like size (3.75x tile size)
//         VIDEO_OFFSET_Y: -132,  // Adjusted for desktop
//         NAME_OFFSET_Y: -8,
//       };
//     }
//   }, []);

//   const { VIDEO_SIZE, VIDEO_OFFSET_Y, NAME_OFFSET_Y } = getVideoSize();

//   // Calculate screen position from tile coordinates
//   const getScreenPosition = useCallback(() => {
//     let tilePos = ensureTilePosition({ x: user.x, y: user.y });
//     if (!tilePos) tilePos = pixelToTile({ x: user.x, y: user.y });

//     const pixelPos = tileToPixel(tilePos);
//     const screenX = pixelPos.x - camera.x;
//     const screenY = pixelPos.y - camera.y;

//     return { screenX, screenY };
//   }, [user.x, user.y, camera.x, camera.y]);

//   const { screenX, screenY } = getScreenPosition();

//   // Check if visible (but don't return early - need to run all hooks first)
//   const BUFFER = 100;
//   const isVisible = !(
//     screenX + TILE_SIZE < -BUFFER ||
//     screenX > viewport.width + BUFFER ||
//     screenY + TILE_SIZE < -BUFFER ||
//     screenY > viewport.height + BUFFER
//   );

//   // Debug logging
//   useEffect(() => {
//     console.log(`🎥 User ${user.username} tracks:`, {
//       hasVideoTrack: !!videoTrack,
//       hasAudioTrack: !!audioTrack,
//       videoTrack,
//       audioTrack
//     });
//   }, [videoTrack, audioTrack, user.username]);

//   // Attach video track
//   useEffect(() => {
//     if (videoTrack && videoRef.current) {
//       try {
//         console.log(`🎬 Attaching video track for ${user.username}:`, videoTrack);
//         videoTrack.attach(videoRef.current);
//         setIsVideoReady(true);
//       } catch (error) {
//         console.error(`❌ Failed to attach video track for ${user.username}:`, error);
//       }

//       return () => {
//         try {
//           videoTrack.detach(videoRef.current);
//         } catch (error) {
//           console.error(`❌ Failed to detach video track for ${user.username}:`, error);
//         }
//         setIsVideoReady(false);
//       };
//     } else {
//       console.log(`⚠️ No video track for ${user.username}:`, { videoTrack, hasVideoRef: !!videoRef.current });
//       setIsVideoReady(false);
//     }
//   }, [videoTrack, user.username]);

//   // Attach audio track
//   useEffect(() => {
//     if (audioTrack && audioRef.current) {
//       try {
//         console.log(`🎵 Attaching audio track for ${user.username}:`, audioTrack);
//         audioTrack.attach(audioRef.current);
//       } catch (error) {
//         console.error(`❌ Failed to attach audio track for ${user.username}:`, error);
//       }

//       return () => {
//         try {
//           audioTrack.detach(audioRef.current);
//         } catch (error) {
//           console.error(`❌ Failed to detach audio track for ${user.username}:`, error);
//         }
//       };
//     } else {
//       console.log(`⚠️ No audio track for ${user.username}:`, { audioTrack, hasAudioRef: !!audioRef.current });
//     }
//   }, [audioTrack, user.username]);

//   // Video overlay size - adjust these values to change size and positioning
// //   const VIDEO_SIZE = 80; // Increase this for larger video (was 48)
// //   const NAME_OFFSET_Y = -8; // Distance above avatar for name
// //   const VIDEO_OFFSET_Y = -92; // Distance above avatar for video (increased to accommodate larger video)

//   // Position calculations
//   const videoX = screenX + (TILE_SIZE - VIDEO_SIZE) / 2; // Center over avatar
//   const videoY = screenY + VIDEO_OFFSET_Y;
//   const nameX = screenX + TILE_SIZE / 2; // Center over avatar
//   const nameY = screenY + NAME_OFFSET_Y;

//   // Return null if not visible (after all hooks have run)
//   if (!isVisible) {
//     return null;
//   }

//   return (
//     <>
//       {/* Username Label */}
//       <div
//         style={{
//           position: 'absolute',
//           left: nameX,
//           top: nameY,
//           transform: 'translate(-50%, -100%)',
//           pointerEvents: 'none',
//           zIndex: 1000,
//         }}
//       >
//         <div
//           style={{
//             background: 'rgba(0, 0, 0, 0.7)',
//             color: 'white',
//             padding: '2px 6px',
//             borderRadius: '4px',
//             fontSize: '12px',
//             fontWeight: 'bold',
//             whiteSpace: 'nowrap',
//             textAlign: 'center',
//           }}
//         >
//           {user.username}
//         </div>
        
//         {/* Status dot */}
//         <div
//           style={{
//             position: 'absolute',
//             right: -12,
//             top: '50%',
//             transform: 'translateY(-50%)',
//             width: 8,
//             height: 8,
//             borderRadius: '50%',
//             backgroundColor: 
//               user.availability === 'idle' ? '#7CFC00' :
//               user.availability === 'away' ? '#FFD700' : '#EE4B2B',
//             border: '1px solid white',
//             boxShadow: '0 0 4px rgba(0,0,0,0.3)',
//           }}
//         />
//       </div>

//       {/* Video Overlay */}
//       {videoTrack && (
//         <div
//           style={{
//             position: 'absolute',
//             left: videoX,
//             top: videoY,
//             width: VIDEO_SIZE,
//             height: VIDEO_SIZE,
//             borderRadius: '8px',
//             overflow: 'hidden',
//             border: '2px solid rgba(255, 255, 255, 0.8)',
//             boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
//             background: '#000',
//             pointerEvents: 'none',
//             zIndex: 999,
//           }}
//         >
//           <video
//             ref={videoRef}
//             autoPlay
//             muted
//             playsInline
//             style={{
//               width: '100%',
//               height: '100%',
//               objectFit: 'cover',
//               display: isVideoReady ? 'block' : 'none',
//             }}
//           />
          
//           {/* Video loading state */}
//           {!isVideoReady && (
//             <div
//               style={{
//                 position: 'absolute',
//                 inset: 0,
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 background: 'rgba(0, 0, 0, 0.5)',
//                 color: 'white',
//                 fontSize: '10px',
//               }}
//             >
//               📹
//             </div>
//           )}

//           {/* Video disabled indicator */}
//           {!user.isVideoEnabled && (
//             <div
//               style={{
//                 position: 'absolute',
//                 inset: 0,
//                 background: 'rgba(0, 0, 0, 0.7)',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 color: 'white',
//                 fontSize: '14px',
//               }}
//             >
//               📵
//             </div>
//           )}
//         </div>
//       )}

//       {/* Hidden audio element */}
//       {audioTrack && (
//         <audio
//           ref={audioRef}
//           autoPlay
//           style={{ display: 'none' }}
//         />
//       )}
//     </>
//   );
// };

// // Main overlay container component
// const FloatingMediaOverlays: React.FC<FloatingMediaOverlaysProps> = ({
//   camera,
//   viewport
// }) => {
//   const { currentUser, usersInRoom } = useSelector(
//     (state: RootState) => state.roomState
//   );
//   const { participantsWithTracks } = useLiveKit();

//   // Debug logging
//   useEffect(() => {
//     console.log('🔍 FloatingMediaOverlays Debug:', {
//       currentUser: currentUser?.id,
//       usersInRoomCount: Object.keys(usersInRoom).length,
//       usersInRoom: Object.keys(usersInRoom),
//       participantsWithTracksCount: participantsWithTracks.size,
//       participantsWithTracks: Array.from(participantsWithTracks.keys()),
//     });
//   }, [currentUser, usersInRoom, participantsWithTracks]);

//   // Filter out current user and get remote users
//   const remoteUsers = Object.values(usersInRoom).filter(
//     (user) => user.id !== currentUser?.id
//   );

//   return (
//     <div
//       style={{
//         position: 'absolute',
//         inset: 0,
//         pointerEvents: 'none',
//         zIndex: 100,
//       }}
//     >
//       {remoteUsers.map((user) => {
//         // Get tracks for this user
//         const userTracks = participantsWithTracks.get(user.id);
//         const videoTrack = userTracks?.videoTracks[0];
//         const audioTrack = userTracks?.audioTracks[0];

//         console.log(`👤 Rendering overlay for ${user.username} (${user.id}):`, {
//           userTracks: !!userTracks,
//           hasVideoTrack: !!videoTrack,
//           hasAudioTrack: !!audioTrack,
//           videoTracksLength: userTracks?.videoTracks?.length || 0,
//           audioTracksLength: userTracks?.audioTracks?.length || 0,
//         });

//         return (
//           <PlayerMediaOverlay
//             key={user.id}
//             user={user}
//             camera={camera}
//             viewport={viewport}
//             videoTrack={videoTrack}
//             audioTrack={audioTrack}
//           />
//         );
//       })}
//     </div>
//   );
// };

// export default FloatingMediaOverlays;