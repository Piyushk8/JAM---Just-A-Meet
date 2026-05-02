import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "motion/react";
import { X, Wrench } from "lucide-react";
import type { RootState } from "../Redux";
import {
  closeComputer,
  closeVendingMachine,
  closeWhiteBoard,
} from "../Redux/misc";

const InteractableModal: React.FC = () => {
  const dispatch = useDispatch();
  const { isComputer, isVendingMachineOpen, isWhiteBoardOpen } = useSelector(
    (state: RootState) => state.miscSlice
  );

  const isOpen = isComputer || isVendingMachineOpen || isWhiteBoardOpen;

  const handleClose = () => {
    if (isComputer) dispatch(closeComputer());
    if (isVendingMachineOpen) dispatch(closeVendingMachine());
    if (isWhiteBoardOpen) dispatch(closeWhiteBoard());
  };

  let title = "Interactable";
  let description = "This object will do something awesome.";

  if (isComputer) {
    title = "Computer Terminal";
    description = "Access the company intranet, play mini-games, or manage your virtual desk.";
  } else if (isVendingMachineOpen) {
    title = "Vending Machine";
    description = "Grab a virtual snack, share a coffee with a coworker, or buy a new avatar accessory.";
  } else if (isWhiteBoardOpen) {
    title = "Collaborative Whiteboard";
    description = "Draw, brainstorm, and share ideas in real-time with everyone in the room.";
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden relative"
          >
            {/* Header pattern */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-20 pointer-events-none" />

            <div className="relative p-6 pb-8 flex flex-col items-center text-center">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 text-blue-600 shadow-sm border border-blue-100">
                <Wrench className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                {title}
              </h2>
              <p className="text-slate-500 text-[15px] leading-relaxed mb-6">
                {description}
              </p>

              <div className="w-full py-3 px-4 bg-slate-50 rounded-xl border border-slate-200/60">
                <p className="text-sm font-semibold text-blue-600 tracking-wide uppercase">
                  Coming Soon!
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  We are building this feature right now.
                </p>
              </div>

              <button
                onClick={handleClose}
                className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl transition-colors active:scale-[0.98]"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InteractableModal;
