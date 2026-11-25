import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AuthScreen } from "@/components/auth-screen";
import { ChatsScreen } from "@/components/chats-screen";
import { CreateRoomScreen } from "@/components/create-room-screen";
import { FlashRelay } from "@/components/flash-relay";
import { FriendsScreen } from "@/components/friends-screen";
import { InboxLayout } from "@/components/inbox-screen";
import { MatchScreen } from "@/components/match-screen";
import { MeScreen } from "@/components/me-screen";
import { MyRoomsScreen } from "@/components/my-rooms-screen";
import { ProfileScreen } from "@/components/profile-screen";
import { SetupScreen } from "@/components/setup-screen";
import { Shell } from "@/components/shell";
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

function RoomQueryRedirect() {
  const { roomId = "" } = useParams();
  return <Navigate to={`/?room=${encodeURIComponent(roomId)}`} replace />;
}

function ThreadQueryRedirect() {
  const { threadId = "" } = useParams();
  return <Navigate to={`/msg?thread=${encodeURIComponent(threadId)}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <FlashRelay />
      <Toaster position="top-right" offset={16} mobileOffset={{ top: 16, left: 16, right: 16 }} visibleToasts={1} />
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
          <Route index element={<ChatsScreen />} />
          <Route path="chats/new" element={<CreateRoomScreen />} />
          <Route path="room/:roomId" element={<RoomQueryRedirect />} />
          <Route path="profile/:userId" element={<ProfileScreen />} />
          <Route path="mine" element={<MyRoomsScreen />} />
          <Route path="match" element={<MatchScreen />} />
          <Route path="msg" element={<InboxLayout />} />
          <Route path="msg/:threadId" element={<ThreadQueryRedirect />} />
          <Route path="friends" element={<FriendsScreen />} />
          <Route path="you" element={<MeScreen />} />
          <Route path="rooms" element={<Navigate to="/mine" replace />} />
          <Route path="rooms/:roomId" element={<RoomQueryRedirect />} />
          <Route path="inbox" element={<Navigate to="/msg" replace />} />
          <Route path="inbox/:threadId" element={<ThreadQueryRedirect />} />
          <Route path="me" element={<Navigate to="/you" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
