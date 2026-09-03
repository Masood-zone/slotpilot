import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type BookingSessionStore = {
  selectedUserId?: string;
  setSelectedUserId: (selectedUserId?: string) => void;
};

export const useBookingSessionStore = create<BookingSessionStore>()(
  persist(
    (set) => ({
      selectedUserId: undefined,
      setSelectedUserId: (selectedUserId) => set({ selectedUserId }),
    }),
    {
      name: "booking-session-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedUserId: state.selectedUserId,
      }),
    },
  ),
);
