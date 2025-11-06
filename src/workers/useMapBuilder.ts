// useMapBuilder.ts
import type { InteractableObject, InteractablesMap, SpatialChunk } from "@/Interactables/coreDS";
import { useEffect, useRef, useState } from "react";

type CollisionMap = { width: number; height: number; tiles: boolean[] };
type Interactable = any;

export function useMapBuilder(mapData: any | null) {
  const workerRef = useRef<Worker | null>(null);
  const [loading, setLoading] = useState(false);
  const [collisionMap, setCollisionMap] = useState<CollisionMap | null>(null);
  const [interactables, setInteractables] = useState<Interactable[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapData) {
      setCollisionMap(null);
      setInteractables(null);
      return;
    }

    setLoading(true);
    setError(null);
    setCollisionMap(null);
    setInteractables(null);

    // Create worker (bundle / import via blob for simple setup)
    // If using bundler: `new Worker(new URL('./mapWorker.ts', import.meta.url))`
    try {
      // Fallback: create worker via blob if bundler not configured
      const workerCode = `(${(function () {
        /* the worker code string is injected at build time; but for clarity we instruct to use a compiled worker file */
      }).toString()})();`;
      // Instead of blob trick here, prefer bundler configured worker import:
      // workerRef.current = new Worker(new URL('./mapWorker.ts', import.meta.url), { type: "module" });

      // --- production: use bundler worker import ---
      // @ts-ignore - bundler will provide proper worker import
      workerRef.current = new Worker(new URL("./mapWorker.ts", import.meta.url), { type: "module" });

      workerRef.current.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg) return;
        if (msg.type === "progress") {
          optional: console.log("worker:", msg.message, msg.percent);
          return;
        }
        if (msg.type === "error") {
          setError(msg.error || "Unknown worker error");
          setLoading(false);
          return;
        }
        if (msg.type === "built") {
          const payload = msg.payload;
          setCollisionMap(payload.collisionMap);
          setInteractables(payload.interactables.objects || []);
          setLoading(false);
        }
      };

      workerRef.current.onerror = (err) => {
        setError(String(err?.message || err));
        setLoading(false);
      };

      // post build request
      workerRef.current.postMessage({ type: "buildMap", mapData });
    } catch (err: any) {
      setError(String(err?.message || err));
      setLoading(false);
    }

    return () => {
      if (workerRef.current) {
        try {
          workerRef.current.postMessage({ type: "terminate" });
          workerRef.current.terminate();
        } catch (e) {
          // ignore
        }
        workerRef.current = null;
      }
    };
  }, [mapData]);

  return { loading, collisionMap, interactables, error };
}
/**
 * Converts worker-returned array of interactables
 * into the full InteractablesMap structure expected by InteractionManager.
 */
export function convertWorkerInteractablesToMap(interactables: any[]): InteractablesMap {
  const objects = new Map<string, InteractableObject>();
  const tileToObjects = new Map<string, Set<string>>();
  const spatialGrid = new Map<string, SpatialChunk>();

  const CHUNK_SIZE = 10; // 👈 adjust based on your spatial granularity

  for (const obj of interactables) {
    const newObj: InteractableObject = {
      id: obj.id,
      type: obj.type,
      tiles: new Set(obj.tiles),
      bounds: obj.bounds,
      metadata: obj.metadata,
      interactionRange: obj.interactionRange ?? 1,
    };

    objects.set(obj.id, newObj);

    for (const tileKey of obj.tiles) {
      if (!tileToObjects.has(tileKey)) {
        tileToObjects.set(tileKey, new Set());
      }
      tileToObjects.get(tileKey)!.add(obj.id);

      // Compute which spatial chunk this tile belongs to
      const [tx, ty] = tileKey.split(",").map(Number);
      const cx = Math.floor(tx / CHUNK_SIZE);
      const cy = Math.floor(ty / CHUNK_SIZE);
      const chunkKey = `${cx},${cy}`;

      let chunk = spatialGrid.get(chunkKey);
      if (!chunk) {
        chunk = { id: chunkKey, objects: new Set<string>() } as SpatialChunk;
        spatialGrid.set(chunkKey, chunk);
      }
      chunk.objects.add(obj.id);
    }
  }

  return { objects, tileToObjects, spatialGrid, chunkSize: CHUNK_SIZE };
}
