import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/services/api/errors";
import { useSessionQueries } from "@/services/session/session-queries";
import { useUsersQuery } from "@/services/users/use-users";
import type { BotStatus, BotUser } from "@/services/users/users.types";
import { useBookingSessionStore } from "@/store/booking-session-store";

function statusBadge(status: BotStatus) {
  if (status === "RUNNING") return <Badge>Running</Badge>;
  if (status === "QUEUED") return <Badge variant="secondary">Queued</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function getSessionEvent(user: BotUser) {
  if (user.queue.startedAt) {
    return `Running since ${new Date(user.queue.startedAt).toLocaleTimeString()}`;
  }

  if (user.queue.enqueuedAt) {
    return `Queued since ${new Date(user.queue.enqueuedAt).toLocaleTimeString()}`;
  }

  if (user.queue.finishedAt) {
    return `Finished at ${new Date(user.queue.finishedAt).toLocaleTimeString()}`;
  }

  return user.lastMessage || "No recent activity";
}

function BookingsPage() {
  const {
    data: usersQuery,
    isPending,
    isError,
    error,
    refetch,
  } = useUsersQuery();
  const { startSessionMutation, stopSessionMutation } = useSessionQueries();

  const users = usersQuery;
  const selectedUserId = useBookingSessionStore(
    (state) => state.selectedUserId,
  );
  const setSelectedUserId = useBookingSessionStore(
    (state) => state.setSelectedUserId,
  );
  const [pendingById, setPendingById] = useState<
    Record<string, "starting" | "stopping" | undefined>
  >({});

  const activeSessions = useMemo(
    () =>
      (users ?? []).filter(
        (user) => user.status === "QUEUED" || user.status === "RUNNING",
      ),
    [users],
  );

  const selectedUser = useMemo(
    () => users?.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  useEffect(() => {
    if (!users) return;

    if (selectedUserId && !users.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(undefined);
      return;
    }

    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, setSelectedUserId, users]);

  const startOne = async (user: BotUser) => {
    const sessionId = user.id;
    setPendingById((m) => ({ ...m, [sessionId]: "starting" }));

    try {
      await startSessionMutation.mutateAsync(sessionId);

      toast.success("Session started", {
        description: `Queued user ${user.config?.email || user.id}`,
      });
    } catch (error) {
      toast.error("Failed to start session", {
        description: getApiErrorMessage(error),
      });
    } finally {
      setPendingById((m) => ({ ...m, [sessionId]: undefined }));
    }
  };

  const startSelected = async () => {
    if (!selectedUser) return;
    await startOne(selectedUser);
  };

  const stopOne = async (sessionId: string) => {
    const session = activeSessions.find((s) => s.id === sessionId);
    if (!session) return;

    setPendingById((m) => ({ ...m, [sessionId]: "stopping" }));

    try {
      const data = await stopSessionMutation.mutateAsync(sessionId);

      toast.success("Session stopped", {
        description:
          `${session.config?.email || session.id} ` +
          `(was running: ${String(data.wasRunning)})`,
      });
    } catch (error) {
      toast.error("Failed to stop session", {
        description: getApiErrorMessage(error),
      });
    } finally {
      setPendingById((m) => ({ ...m, [sessionId]: undefined }));
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          Start and manage concurrent booking appointment hunting sessions per
          user.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle className="text-xl">Start a session</CardTitle>
          <CardDescription>
            Select a user, then click "Start booking hunt" to start their
            session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </div>
          ) : isError ? (
            <div className="rounded-md border p-4 text-sm">
              <div className="font-medium">Failed to load users</div>
              <div className="mt-1 text-muted-foreground">
                {getApiErrorMessage(error)}
              </div>
              <div className="mt-3">
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => refetch()}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : users?.length === 0 ? (
            <div className="rounded-md border p-6 text-center">
              <div className="text-sm font-medium">No users found</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Create at least one user before starting sessions.
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <div className="text-sm font-medium">User</div>
                <Select
                  value={selectedUserId}
                  onValueChange={(v) => setSelectedUserId(v)}
                >
                  <SelectTrigger
                    className="w-full cursor-pointer"
                    size="default"
                  >
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((u) => (
                      <SelectItem
                        key={u.id}
                        value={u.id}
                        className="cursor-pointer"
                      >
                        <div className="flex w-full items-center justify-between gap-3">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {u.config?.displayName || "(No name)"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {u.config?.email || u.id}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {u.id.slice(0, 8)}...
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                {selectedUser ? (
                  <Button
                    size="lg"
                    className="cursor-pointer"
                    onClick={startSelected}
                    disabled={pendingById[selectedUser.id] === "starting"}
                  >
                    {pendingById[selectedUser.id] === "starting"
                      ? "Starting..."
                      : "Start booking hunt"}
                  </Button>
                ) : (
                  <Button size="lg" disabled>
                    Start booking hunt
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
        {selectedUser ? (
          <CardFooter className="border-t justify-between">
            <div className="text-sm text-muted-foreground">
              Selected:{" "}
              <span className="font-medium text-foreground">
                {selectedUser.config?.email || selectedUser.id}
              </span>
            </div>
          </CardFooter>
        ) : null}
      </Card>

      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sessions</h2>
          <div className="text-sm text-muted-foreground">
            {activeSessions.length} active
          </div>
        </div>

        {activeSessions.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No sessions yet</CardTitle>
              <CardDescription>
                Start a booking hunt to show active sessions here.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeSessions.map((user) => (
              <Card key={user.id} className="overflow-hidden">
                <CardHeader className="border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {user.config?.displayName || "Booking session"}
                      </CardTitle>
                      <CardDescription>
                        {user.config?.email || user.id}
                      </CardDescription>
                    </div>
                    {statusBadge(user.status)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Session id
                      </div>
                      <div className="text-sm font-mono">{user.id}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Last event
                      </div>
                      <div className="text-sm">{getSessionEvent(user)}</div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Enqueued
                      </div>
                      <div className="text-sm">
                        {user.queue.enqueuedAt
                          ? new Date(user.queue.enqueuedAt).toLocaleString()
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Started
                      </div>
                      <div className="text-sm">
                        {user.queue.startedAt
                          ? new Date(user.queue.startedAt).toLocaleString()
                          : "-"}
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="border-t justify-end gap-2">
                  <Button
                    variant="destructive"
                    size="lg"
                    className="cursor-pointer"
                    onClick={() => stopOne(user.id)}
                    disabled={pendingById[user.id] !== undefined}
                  >
                    {pendingById[user.id] === "stopping"
                      ? "Stopping..."
                      : "Stop"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingsPage;
