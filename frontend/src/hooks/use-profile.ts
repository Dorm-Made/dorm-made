import { useState, useEffect, useCallback } from "react";
import { userService, eventService } from "@/services";
import { User, Event } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";

interface UseProfileReturn {
  user: User | null;
  loading: boolean;
  isEditing: boolean;
  editingUser: User | null;
  saving: boolean;
  userEvents: Event[];
  loadingEvents: boolean;
  setIsEditing: (editing: boolean) => void;
  updateEditingUser: (updates: Partial<User>) => void;
  handleSave: (userId: string) => Promise<void>;
  handleCancel: () => void;
  loadUser: (userId: string) => Promise<void>;
  isOwnProfile: () => boolean;
  refreshUserEvents: () => Promise<void>;
}

export function useProfile(userId?: string): UseProfileReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const { toast } = useToast();

  const loadUserEvents = useCallback(async (targetUserId: string) => {
    try {
      setLoadingEvents(true);
      const events = await eventService.getUserEvents(targetUserId);
      setUserEvents(events);
    } catch (error) {
      console.error("Error loading user events:", getErrorMessage(error));
      setUserEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const loadUser = useCallback(
    async (targetUserId: string) => {
      if (!targetUserId) return;

      try {
        setLoading(true);
        const userData = await userService.getUser(targetUserId);
        setUser(userData);
        setEditingUser({ ...userData });
        await loadUserEvents(userData.id);
      } catch (error) {
        const currentUserStr = localStorage.getItem("currentUser");
        if (currentUserStr) {
          try {
            const currentUser = JSON.parse(currentUserStr);
            if (currentUser.id === targetUserId) {
              setUser(currentUser);
              setEditingUser({ ...currentUser });
              await loadUserEvents(currentUser.id);
              return;
            }
          } catch (e) {
            console.error("Error parsing currentUser from localStorage:", e);
          }
        }

        toast({
          title: "Erro",
          description: getErrorMessage(error, "Não foi possível carregar o perfil do usuário"),
          variant: "destructive",
          duration: 1500,
        });
      } finally {
        setLoading(false);
      }
    },
    [toast, loadUserEvents],
  );

  const handleSave = useCallback(
    async (targetUserId: string) => {
      if (!editingUser || !targetUserId) return;

      try {
        setSaving(true);
        const updatedUser = await userService.updateUser(targetUserId, {
          university: editingUser.university || null,
          description: editingUser.description || null,
          profile_picture: editingUser.profile_picture || null,
        });

        setUser(updatedUser);
        setEditingUser({ ...updatedUser });
        setIsEditing(false);

        localStorage.setItem("currentUser", JSON.stringify(updatedUser));

        toast({
          title: "Sucesso!",
          description: "Perfil atualizado com sucesso",
          className: "bg-green-500 text-white border-green-600",
          duration: 1500,
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: getErrorMessage(error, "Não foi possível atualizar o perfil"),
          variant: "destructive",
          duration: 1500,
        });
      } finally {
        setSaving(false);
      }
    },
    [editingUser, toast],
  );

  const handleCancel = useCallback(() => {
    if (user) {
      setEditingUser({ ...user });
    }
    setIsEditing(false);
  }, [user]);

  const updateEditingUser = useCallback((updates: Partial<User>) => {
    setEditingUser((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const isOwnProfile = useCallback(() => {
    const currentUserStr = localStorage.getItem("currentUser");
    if (currentUserStr && user) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        return currentUser.id === user.id;
      } catch (e) {
        return false;
      }
    }
    return false;
  }, [user]);

  useEffect(() => {
    if (userId) {
      loadUser(userId);
    } else {
      const currentUserStr = localStorage.getItem("currentUser");
      if (currentUserStr) {
        try {
          const currentUser = JSON.parse(currentUserStr);
          setUser(currentUser);
          setEditingUser({ ...currentUser });
          loadUserEvents(currentUser.id);
        } catch (e) {
          console.error("Error parsing currentUser:", e);
        }
      }
      setLoading(false);
    }
  }, [userId, loadUser, loadUserEvents]);

  const refreshUserEvents = useCallback(async () => {
    if (user?.id) {
      await loadUserEvents(user.id);
    }
  }, [user?.id, loadUserEvents]);

  return {
    user,
    loading,
    isEditing,
    editingUser,
    saving,
    userEvents,
    loadingEvents,
    setIsEditing,
    updateEditingUser,
    handleSave,
    handleCancel,
    loadUser,
    isOwnProfile,
    refreshUserEvents,
  };
}
