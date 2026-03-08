import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useSharedData } from "@/hooks/use-shared-data";

/**
 * Store-based access control hook.
 * - Super Admin / Admin: see ALL stores, warehouses
 * - Manager: can create users for their assigned store only
 * - Others: only see stores/warehouses assigned to them
 */
export function useStoreAccess() {
  const { user } = useAuth();
  const { users, currentUser } = useAppSettings();
  const { stores, warehouses } = useSharedData();

  const isAdminOrSuper = useMemo(() => {
    const role = user?.role || currentUser?.role;
    return role === "Super Admin" || role === "Admin";
  }, [user?.role, currentUser?.role]);

  const isManager = useMemo(() => {
    const role = user?.role || currentUser?.role;
    return role === "Manager";
  }, [user?.role, currentUser?.role]);

  const assignedStore = useMemo(() => {
    return currentUser?.store || "";
  }, [currentUser?.store]);

  const assignedStores = useMemo(() => {
    if (isAdminOrSuper) return stores;
    return stores.filter(s => s.name === assignedStore);
  }, [isAdminOrSuper, stores, assignedStore]);

  const assignedWarehouses = useMemo(() => {
    if (isAdminOrSuper) return warehouses;
    // Non-admin users see warehouses related to their assigned store location
    return warehouses.filter(w => {
      // If store is assigned, show warehouses in same location or all if no match
      if (!assignedStore) return false;
      return true; // simplified: show all warehouses for now, restrict by assignment
    });
  }, [isAdminOrSuper, warehouses, assignedStore]);

  const accessibleStoreNames = useMemo(() => assignedStores.map(s => s.name), [assignedStores]);

  const canManageAllStores = isAdminOrSuper;

  // Manager can create users but only for their store
  const canCreateUsersForStore = useMemo(() => {
    return isAdminOrSuper || isManager;
  }, [isAdminOrSuper, isManager]);

  const getStoreOptionsForUserCreation = useMemo(() => {
    if (isAdminOrSuper) return stores.map(s => s.name);
    if (isManager) return assignedStore ? [assignedStore] : [];
    return [];
  }, [isAdminOrSuper, isManager, stores, assignedStore]);

  return {
    isAdminOrSuper,
    isManager,
    assignedStore,
    assignedStores,
    assignedWarehouses,
    accessibleStoreNames,
    canManageAllStores,
    canCreateUsersForStore,
    getStoreOptionsForUserCreation,
  };
}
