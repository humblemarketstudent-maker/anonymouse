import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthScreen } from "@/components/auth-screen";
import { FlashRelay } from "@/components/flash-relay";
import { FeedScreen } from "@/components/feed-screen";
import { FriendsScreen } from "@/components/friends-screen";
import { InboxHome, InboxLayout } from "@/components/inbox-screen";
import { MeScreen } from "@/components/me-screen";
import { RoomScreen } from "@/components/room-screen";
import { RoomsScreen } from "@/components/rooms-screen";
import { SetupScreen } from "@/components/setup-screen";
import { Shell } from "@/components/shell";
import { ThreadScreen } from "@/components/thread-screen";
import { Toaster } from "@/components/ui/sonner";
import { useFloor } from "@/hooks/use-floor";

function PublicOnly({ children }: { children: ReactNode }) {
  const { session, me } = useFloor();
  if (session && me) return <Navigate to="/" replace />;
  if (session && !me) return <Navigate to="/setup" replace />;
  return children;
}

function SetupOnly({ children }: { children: ReactNode }) {
  const { session, me } = useFloor();
  if (!session) return <Navigate to="/enter" replace />;
  if (me) return <Navigate to="/" replace />;
  return children;
}

function AppOnly({ children }: { children: ReactNode }) {
  const { session, me } = useFloor();
  if (!session) return <Navigate to="/enter" replace />;
  if (!me) return <Navigate to="/setup" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <FlashRelay />
      <Toaster position="top-right" offset={16} visibleToasts={2} />
      <Routes>
        <Route
          path="/enter"
          element={
            <PublicOnly>
              <AuthScreen />
            </PublicOnly>
          }
        />
        <Route
          path="/setup"
          element={
            <SetupOnly>
              <SetupScreen />
            </SetupOnly>
          }
        />
        <Route
          element={
            <AppOnly>
              <Shell />
            </AppOnly>
          }
        >
          <Route index element={<FeedScreen />} />
          <Route path="rooms" element={<RoomsScreen />} />
          <Route path="rooms/:roomId" element={<RoomScreen />} />
          <Route path="inbox" element={<InboxLayout />}>
            <Route index element={<InboxHome />} />
            <Route path=":threadId" element={<ThreadScreen />} />
          </Route>
          <Route path="friends" element={<FriendsScreen />} />
          <Route path="me" element={<MeScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
